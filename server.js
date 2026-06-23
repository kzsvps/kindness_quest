'use strict';
require('dotenv').config();
const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const pool = mysql.createPool({
  host    : process.env.DB_HOST,
  port    : parseInt(process.env.DB_PORT),
  user    : process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit   : 10,
  charset: 'utf8mb4',
});

const q = async (sql, p=[]) => { const [r] = await pool.execute(sql, p); return r; };
const makeLike = (keyword='') => `%${keyword.trim()}%`;
const demoSqlFiles = ['drop.sql', 'schema_v2.sql', 'seed_v2.sql'];

const geocodeAliases = [
  {
    match: /(綠川西街135號|東協廣場|台中市紅十字會)/,
    query: '東協廣場 台中',
  },
];


async function generateNextEventId() {
  const rows = await q(`
    SELECT MAX(CAST(SUBSTRING(eid, 2) AS UNSIGNED)) AS max_id
    FROM events
    WHERE eid REGEXP '^E[0-9]+$'
  `);
  const nextId = Number(rows?.[0]?.max_id || 0) + 1;
  return `E${String(nextId).padStart(3, '0')}`;
}

async function geocodeAddress(address='') {
  const rawKeyword = String(address || '').trim();
  const keyword = geocodeAliases.find(item => item.match.test(rawKeyword))?.query || rawKeyword;
  if (!keyword) return null;
  const endpoint = new URL('https://nominatim.openstreetmap.org/search');
  endpoint.searchParams.set('q', keyword);
  endpoint.searchParams.set('format', 'jsonv2');
  endpoint.searchParams.set('limit', '1');
  endpoint.searchParams.set('countrycodes', 'tw');

  const response = await fetch(endpoint, {
    headers: {
      'User-Agent': 'KindnessQuest/1.0 demo geocoder',
      'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
    },
  });
  if (!response.ok) throw new Error(`geocode ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows.length) return null;
  return {
    lat: Number(rows[0].lat),
    lng: Number(rows[0].lon),
    display_name: rows[0].display_name || keyword,
  };
}

async function restoreDemoDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    multipleStatements: true,
  });

  try {
    for (const file of demoSqlFiles) {
      const sql = fs.readFileSync(path.join(__dirname, 'sql', file), 'utf8');
      await connection.query(sql);
    }
  } finally {
    await connection.end();
  }
}

/* ── 健康檢查 ── */
app.get('/api/ping', async (_, res) => {
  try { await q('SELECT 1'); res.json({ ok:true }); }
  catch(e){ res.status(503).json({ ok:false, error:e.message }); }
});

app.get('/api/geocode', async (req, res) => {
  try {
    const address = String(req.query.q || '').trim();
    if (!address) return res.status(400).json({ ok:false, error:'請提供地址' });
    const result = await geocodeAddress(address);
    if (!result) return res.status(404).json({ ok:false, error:'查不到對應座標' });
    res.json({ ok:true, ...result });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

/* ══════════════ 會員系統 ══════════════ */

// 登入 (10%) — 直接比對明文（demo），生產用 bcrypt
app.post('/api/login', async (req, res) => {
  try {
    const { name, pass } = req.body;
    const rows = await q(
      `SELECT m.*, n.name AS npo_name
       FROM members m LEFT JOIN npo_profiles n ON m.npo_id=n.npo_id
       WHERE m.name=?`, [name]);
    if (!rows.length) return res.status(401).json({ error:'帳號或密碼錯誤' });
    const mem = rows[0];
    if (mem.pass !== pass) return res.status(401).json({ error:'帳號或密碼錯誤' });
    const { pass:_, ...safe } = mem;
    res.json({ ok:true, user:safe });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

app.post('/api/members/:uid/reward', async (req, res) => {
  try {
    const { uid } = req.params;
    const xp = Number(req.body?.xp || 0);
    const coin = Number(req.body?.coin || 0);
    if (!uid) return res.status(400).json({ ok:false, error:'缺少會員編號' });
    if (xp === 0 && coin === 0) return res.status(400).json({ ok:false, error:'沒有可發送的獎勵' });
    await q('UPDATE members SET xp = xp + ?, coin = coin + ? WHERE uid = ?', [xp, coin, uid]);
    res.json({ ok:true, xp, coin });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// 註冊 (10%)
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, pass, role='user' } = req.body;
    if (!name||!email||!pass) return res.status(400).json({ error:'請填寫所有欄位' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error:'Email 格式不正確' });
    }
    if ((await q('SELECT uid FROM members WHERE name=?', [name])).length)
      return res.status(409).json({ error:'帳號已存在' });
    if ((await q('SELECT uid FROM members WHERE email=?', [email])).length)
      return res.status(409).json({ error:'Email 已被使用' });
    const uid = 'U'+Date.now();
    await q('INSERT INTO members (uid,name,email,pass,role) VALUES (?,?,?,?,?)', [uid,name,email,pass,role]);
    res.json({ ok:true, uid });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

// 更新個人資料 (10%)
app.put('/api/members/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, email, phone, city, birthday, emergency_contact, bio, pass } = req.body;
    if (name) {
      const dup = await q('SELECT uid FROM members WHERE name=? AND uid<>?', [name, uid]);
      if (dup.length) return res.status(409).json({ error:'帳號已存在' });
    }
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error:'Email 格式不正確' });
      }
      const dupEmail = await q('SELECT uid FROM members WHERE email=? AND uid<>?', [email, uid]);
      if (dupEmail.length) return res.status(409).json({ error:'Email 已被使用' });
    }
    await q(
      `UPDATE members
       SET name=COALESCE(?,name),
           email=COALESCE(?,email),
           phone=?,
           city=?,
           birthday=?,
           emergency_contact=?,
           bio=?,
           pass=COALESCE(?,pass)
       WHERE uid=?`,
      [name || null, email || null, phone || null, city || null, birthday || null, emergency_contact || null, bio || null, pass || null, uid]
    );
    res.json({ ok:true });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

// 查詢會員列表 (20% 查詢)
app.get('/api/members', async (req, res) => {
  try {
    const { keyword='', role='' } = req.query;
    let sql = `
      SELECT
        m.uid,
        m.name,
        m.email,
        m.phone,
        m.city,
        m.birthday,
        m.emergency_contact,
        m.bio,
        m.role,
        m.xp,
        m.coin,
        m.created_at,
        n.name AS npo_name,
        COUNT(r.rid) AS reg_count
      FROM members m
      LEFT JOIN npo_profiles n ON m.npo_id = n.npo_id
      LEFT JOIN registrations r ON m.uid = r.uid AND r.status='confirmed'
      WHERE 1=1`;
    const params = [];
    if (role) {
      sql += ' AND m.role=?';
      params.push(role);
    }
    if (keyword) {
      sql += ' AND (m.uid LIKE ? OR m.name LIKE ? OR m.email LIKE ?)';
      params.push(makeLike(keyword), makeLike(keyword), makeLike(keyword));
    }
    sql += `
      GROUP BY m.uid, m.name, m.email, m.phone, m.city, m.birthday, m.emergency_contact, m.bio, m.role, m.xp, m.coin, m.created_at, n.name
      ORDER BY m.role, m.xp DESC, m.created_at DESC`;
    res.json(await q(sql, params));
  } catch(e){ res.status(500).json({ error:e.message }); }
});

/* ══════════════ 活動道館 ══════════════ */

// 查詢活動（JOIN sdg_categories, npo_profiles）(20% 查詢)
app.get('/api/events', async (req, res) => {
  try {
    const { sdg, start, end, npo_id, keyword='' } = req.query;
    let sql = `SELECT e.*,
                 s.name AS sdg_name, s.color AS sdg_color,
                 n.name AS npo_name
               FROM events e
               JOIN sdg_categories s ON e.sdg_id=s.sdg_id
               JOIN npo_profiles   n ON e.npo_id=n.npo_id
               WHERE e.status='active'`;
    const p = [];
    if (sdg)    { sql += ' AND e.sdg_id=?';    p.push(sdg); }
    if (npo_id) { sql += ' AND e.npo_id=?';    p.push(npo_id); }
    if (start)  { sql += ' AND e.date>=?';      p.push(start); }
    if (end)    { sql += ' AND e.date<=?';      p.push(end); }
    if (keyword) {
      sql += ' AND (e.name LIKE ? OR e.loc LIKE ? OR n.name LIKE ?)';
      p.push(makeLike(keyword), makeLike(keyword), makeLike(keyword));
    }
    sql += ' ORDER BY e.date';
    res.json(await q(sql, p));
  } catch(e){ res.status(500).json({ error:e.message }); }
});

// 新增活動
app.post('/api/events', async (req, res) => {
  try {
    const {
      name,
      loc,
      date,
      end_date=null,
      sdg_id,
      npo_id,
      quota,
      reward,
      xp,
      icon,
      lat,
      lng,
      description,
      requirements,
      duration,
    } = req.body;
    if (!name || !loc || !date || !sdg_id || !npo_id) {
      return res.status(400).json({ error:'活動資料不完整' });
    }
    const eid = await generateNextEventId();
    await q(
      `INSERT INTO events
       (eid,name,loc,date,end_date,sdg_id,npo_id,quota,reward,xp,icon,lat,lng,description,requirements,duration)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [eid,name,loc,date,end_date,sdg_id,npo_id,quota||20,reward||60,xp||90,icon||'',lat||0,lng||0,description||'',requirements||'',duration||'']);
    res.json({ ok:true, eid });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

// 刪除活動
app.put('/api/events/:eid', async (req, res) => {
  try {
    const {
      name,
      loc,
      date,
      end_date=null,
      sdg_id,
      npo_id,
      quota,
      reward,
      xp,
      icon,
      lat,
      lng,
      description,
      requirements,
      duration,
      status='active',
    } = req.body;
    if (!name || !loc || !date || !sdg_id || !npo_id) {
      return res.status(400).json({ error:'活動必填欄位不足' });
    }
    await q(
      `UPDATE events
       SET name=?, loc=?, date=?, end_date=?, sdg_id=?, npo_id=?, quota=?, reward=?, xp=?, icon=?, lat=?, lng=?, description=?, requirements=?, duration=?, status=?
       WHERE eid=?`,
      [
        name,
        loc,
        date,
        end_date,
        sdg_id,
        npo_id,
        quota || 20,
        reward || 60,
        xp || 90,
        icon || '',
        lat || 0,
        lng || 0,
        description || '',
        requirements || '',
        duration || '',
        status || 'active',
        req.params.eid,
      ]
    );
    res.json({ ok:true, eid:req.params.eid });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

app.delete('/api/events/:eid', async (req, res) => {
  try { await q('UPDATE events SET status=? WHERE eid=?', ['cancelled', req.params.eid]); res.json({ ok:true }); }
  catch(e){ res.status(500).json({ error:e.message }); }
});

/* ══════════════ 報名系統 ══════════════ */

app.get('/api/registrations', async (req, res) => {
  try {
    const { uid, eid } = req.query;
    let sql = `SELECT r.*, m.name AS member_name, m.email, m.phone, m.city, m.birthday,
                      m.emergency_contact, m.bio, m.xp, m.coin,
                      e.name AS event_name, e.loc AS event_loc, e.date AS event_date
               FROM registrations r
               JOIN members m ON r.uid=m.uid
               JOIN events  e ON r.eid=e.eid
               WHERE r.status='confirmed'`;
    const p=[];
    if (uid){ sql+=' AND r.uid=?'; p.push(uid); }
    if (eid){ sql+=' AND r.eid=?'; p.push(eid); }
    res.json(await q(sql, p));
  } catch(e){ res.status(500).json({ error:e.message }); }
});

app.post('/api/registrations', async (req, res) => {
  try {
    const { uid, eid } = req.body;
    const ev = await q('SELECT xp,reward,joined,quota FROM events WHERE eid=?', [eid]);
    if (!ev.length) return res.status(404).json({ error:'活動不存在' });
    if (ev[0].joined >= ev[0].quota) return res.status(409).json({ error:'名額已滿' });
    const rid='R'+Date.now();
    await q('INSERT INTO registrations (rid,uid,eid,reg_date) VALUES (?,?,?,CURDATE())', [rid,uid,eid]);
    await q('UPDATE events SET joined=joined+1 WHERE eid=?', [eid]);
    await q('UPDATE members SET xp=xp+?, coin=coin+? WHERE uid=?', [ev[0].xp, ev[0].reward, uid]);
    res.json({ ok:true, rid, xp:ev[0].xp, reward:ev[0].reward });
  } catch(e){
    if (e.code==='ER_DUP_ENTRY') return res.status(409).json({ error:'已報名此活動' });
    res.status(500).json({ error:e.message });
  }
});

/* ══════════════ 客服留言系統 ══════════════ */

// 查詢留言 (20% 查詢)
app.get('/api/comments', async (req, res) => {
  try {
    const { eid, uid='' } = req.query;
    let sql = `
      SELECT
        c.*,
        e.name AS event_name,
        COUNT(cl.uid) AS like_count,
        MAX(CASE WHEN cl.uid=? THEN 1 ELSE 0 END) AS liked_by_me
      FROM comments c
      LEFT JOIN events e ON c.eid = e.eid
      LEFT JOIN comment_likes cl ON c.cid = cl.cid`;
    const p=[uid];
    if (eid){ sql+=' WHERE c.eid=?'; p.push(eid); }
    sql += ' GROUP BY c.cid, c.uid, c.name, c.eid, c.text, c.image_data, c.created_at, e.name ORDER BY c.created_at DESC';
    res.json(await q(sql, p));
  } catch(e){ res.status(500).json({ error:e.message }); }
});

// 新增留言 (10%)
app.post('/api/comments', async (req, res) => {
  try {
    const { uid, name, eid, text, image_data=null } = req.body;
    if (!text?.trim()) return res.status(400).json({ error:'留言不能為空' });
    const cid='C'+Date.now();
    await q('INSERT INTO comments (cid,uid,name,eid,text,image_data) VALUES (?,?,?,?,?,?)', [cid,uid,name,eid,text.trim(),image_data]);
    res.json({ ok:true, cid });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

app.post('/api/comments/:cid/like', async (req, res) => {
  try {
    const { cid } = req.params;
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ ok:false, error:'缺少會員資訊' });
    const rows = await q('SELECT 1 FROM comment_likes WHERE cid=? AND uid=?', [cid, uid]);
    if (rows.length) {
      await q('DELETE FROM comment_likes WHERE cid=? AND uid=?', [cid, uid]);
      return res.json({ ok:true, liked:false });
    }
    await q('INSERT INTO comment_likes (cid,uid) VALUES (?,?)', [cid, uid]);
    res.json({ ok:true, liked:true });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// 刪除留言 (10%)
app.delete('/api/comments/:cid', async (req, res) => {
  try {
    await q('DELETE FROM comments WHERE cid=?', [req.params.cid]);
    res.json({ ok:true });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

/* ══════════════ 打卡系統 ══════════════ */

app.post('/api/checkin/water', async (req, res) => {
  try {
    const { uid, cups, date } = req.body;
    await q('INSERT INTO water_checkins (uid,date,cups) VALUES (?,?,?) ON DUPLICATE KEY UPDATE cups=?', [uid,date,cups,cups]);
    res.json({ ok:true });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

app.post('/api/checkin/mood', async (req, res) => {
  try {
    const { uid, date, mood, note } = req.body;
    await q('INSERT INTO mood_checkins (uid,date,mood,note) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE mood=?,note=?', [uid,date,mood,note||'',mood,note||'']);
    res.json({ ok:true });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

app.get('/api/checkin/history/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const [water, mood] = await Promise.all([
      q('SELECT date, cups FROM water_checkins WHERE uid=? ORDER BY date DESC LIMIT 7', [uid]),
      q('SELECT date, mood, note FROM mood_checkins WHERE uid=? ORDER BY date DESC LIMIT 7', [uid]),
    ]);
    res.json({ ok:true, water, mood });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

/* ══════════════ 資料分析 (20%) ══════════════ */

app.get('/api/analytics/summary', async (_, res) => {
  try {
    const [[membersRow], [eventsRow], [regsRow], [commentsRow], [likesRow]] = await Promise.all([
      q('SELECT COUNT(*) AS members FROM members'),
      q('SELECT COUNT(*) AS events FROM events WHERE status="active"'),
      q('SELECT COUNT(*) AS regs FROM registrations WHERE status="confirmed"'),
      q('SELECT COUNT(*) AS comments FROM comments'),
      q('SELECT COUNT(*) AS likes FROM comment_likes'),
    ]);
    const { members } = membersRow;
    const { events } = eventsRow;
    const { regs } = regsRow;
    const { comments } = commentsRow;
    const { likes } = likesRow;
    const roleStats = await q(`
      SELECT role, COUNT(*) AS cnt
      FROM members
      GROUP BY role
      ORDER BY role`);
    const topXp    = await q('SELECT name,xp,coin FROM members WHERE role="user" ORDER BY xp DESC LIMIT 6');
    const sdgDist  = await q('SELECT s.sdg_id, s.name, s.color, COUNT(e.eid) AS cnt FROM sdg_categories s LEFT JOIN events e ON s.sdg_id=e.sdg_id AND e.status="active" GROUP BY s.sdg_id ORDER BY s.sdg_id');
    const regTrend = await q('SELECT reg_date AS date, COUNT(*) AS cnt FROM registrations WHERE status="confirmed" GROUP BY reg_date ORDER BY reg_date LIMIT 14');
    const npoStats = await q('SELECT n.name, SUM(e.joined) AS total_regs, COUNT(e.eid) AS event_cnt FROM npo_profiles n LEFT JOIN events e ON n.npo_id=e.npo_id GROUP BY n.npo_id ORDER BY total_regs DESC');
    const topEvents = await q(`
      SELECT e.name, e.joined, e.quota, n.name AS npo_name
      FROM events e
      JOIN npo_profiles n ON e.npo_id=n.npo_id
      WHERE e.status='active'
      ORDER BY e.joined DESC, e.reward DESC
      LIMIT 6`);
    const interactionStats = await q(`
      SELECT e.name,
             COUNT(DISTINCT c.cid) AS comments,
             COUNT(cl.uid) AS likes
      FROM events e
      LEFT JOIN comments c ON e.eid=c.eid
      LEFT JOIN comment_likes cl ON c.cid=cl.cid
      GROUP BY e.eid, e.name
      ORDER BY likes DESC, comments DESC, e.name
      LIMIT 6`);
    res.json({ members, events, regs, comments, likes, roleStats, topXp, sdgDist, regTrend, npoStats, topEvents, interactionStats });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

/* ══════════════ 資料典藏 (10%) ══════════════ */

app.get('/api/archive', async (_, res) => {
  try {
    const [events, members, regs, comments] = await Promise.all([
      q(`SELECT e.*,n.name AS npo_name,s.name AS sdg_name,
                COUNT(DISTINCT r.rid) AS reg_count,
                COUNT(DISTINCT c.cid) AS comment_count
         FROM events e
         JOIN npo_profiles n ON e.npo_id=n.npo_id
         JOIN sdg_categories s ON e.sdg_id=s.sdg_id
         LEFT JOIN registrations r ON e.eid=r.eid
         LEFT JOIN comments c ON e.eid=c.eid
         GROUP BY e.eid, n.name, s.name`),
      q('SELECT uid,name,email,phone,city,birthday,emergency_contact,bio,role,xp,coin FROM members'),
      q('SELECT r.*,m.name AS member_name,e.name AS event_name FROM registrations r JOIN members m ON r.uid=m.uid JOIN events e ON r.eid=e.eid'),
      q('SELECT * FROM comments ORDER BY created_at DESC'),
    ]);
    res.json({
      snapshot_time: new Date().toISOString(),
      summary: {
        events: events.length,
        members: members.length,
        regs: regs.length,
        comments: comments.length,
      },
      events,
      members,
      regs,
      comments,
    });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

app.post('/api/admin/restore-demo', async (_, res) => {
  try {
    await restoreDemoDatabase();
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

app.listen(PORT, () => console.log(`邁邁勇者 API → http://localhost:${PORT}`));
