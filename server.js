'use strict';
require('dotenv').config();
const express  = require('express');
const mysql    = require('mysql2/promise');
const bcrypt   = require('bcryptjs');
const cors     = require('cors');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

/* ── 資料庫連線池 ── */
const pool = mysql.createPool({
  host    : process.env.DB_HOST,
  port    : parseInt(process.env.DB_PORT),
  user    : process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit   : 10,
});

async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/* ════════════════ 會員系統 ════════════════ */

// 登入 (10%)
app.post('/api/login', async (req, res) => {
  try {
    const { name, pass } = req.body;
    const rows = await query('SELECT * FROM members WHERE name = ?', [name]);
    if (!rows.length) return res.status(401).json({ error: '帳號或密碼錯誤' });
    const mem = rows[0];
    const ok  = await bcrypt.compare(pass, mem.pass);
    if (!ok)   return res.status(401).json({ error: '帳號或密碼錯誤' });
    const { pass: _, ...safe } = mem;
    res.json({ ok: true, user: safe });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 註冊 (10%)
app.post('/api/register', async (req, res) => {
  try {
    const { name, pass, role = 'user' } = req.body;
    if (!name || !pass) return res.status(400).json({ error: '請填寫所有欄位' });
    const exist = await query('SELECT uid FROM members WHERE name = ?', [name]);
    if (exist.length) return res.status(409).json({ error: '帳號已存在' });
    const hashed = await bcrypt.hash(pass, 10);
    const uid = 'U' + Date.now();
    await query(
      'INSERT INTO members (uid, name, pass, role, xp, coin) VALUES (?, ?, ?, ?, 0, 0)',
      [uid, name, hashed, role]
    );
    res.json({ ok: true, uid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 更新個人資料 (10%)
app.put('/api/members/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, pass } = req.body;
    if (!name && !pass) return res.status(400).json({ error: '請提供更新內容' });
    if (name) await query('UPDATE members SET name = ? WHERE uid = ?', [name, uid]);
    if (pass) {
      const hashed = await bcrypt.hash(pass, 10);
      await query('UPDATE members SET pass = ? WHERE uid = ?', [hashed, uid]);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 查詢會員列表 (管理員)
app.get('/api/members', async (req, res) => {
  try {
    const rows = await query('SELECT uid, name, role, xp, coin FROM members', []);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ════════════════ 活動道館 ════════════════ */

// 查詢所有活動 (20% 查詢)
app.get('/api/events', async (req, res) => {
  try {
    const { sdg, start, end, npo } = req.query;
    let sql = 'SELECT * FROM events WHERE 1=1';
    const p = [];
    if (sdg)   { sql += ' AND sdg = ?';      p.push(sdg); }
    if (npo)   { sql += ' AND npo LIKE ?';   p.push('%'+npo+'%'); }
    if (start) { sql += ' AND date >= ?';    p.push(start); }
    if (end)   { sql += ' AND date <= ?';    p.push(end); }
    const rows = await query(sql, p);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 新增活動 (道館主/管理員)
app.post('/api/events', async (req, res) => {
  try {
    const { eid, name, loc, date, sdg, npo, quota, reward, xp, icon, lat, lng, desc, requirements, duration } = req.body;
    await query(
      'INSERT INTO events (eid,name,loc,date,sdg,npo,quota,joined,reward,xp,icon,lat,lng,`desc`,requirements,duration) VALUES (?,?,?,?,?,?,?,0,?,?,?,?,?,?,?,?)',
      [eid, name, loc, date, sdg, npo, quota||20, reward||60, xp||90, icon||'🌟', lat||0, lng||0, desc||'', requirements||'', duration||'']
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 刪除活動
app.delete('/api/events/:eid', async (req, res) => {
  try {
    await query('DELETE FROM events WHERE eid = ?', [req.params.eid]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ════════════════ 報名系統 ════════════════ */

app.get('/api/registrations', async (req, res) => {
  try {
    const { uid, eid } = req.query;
    let sql = 'SELECT * FROM registrations WHERE 1=1';
    const p = [];
    if (uid) { sql += ' AND uid = ?'; p.push(uid); }
    if (eid) { sql += ' AND eid = ?'; p.push(eid); }
    res.json(await query(sql, p));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/registrations', async (req, res) => {
  try {
    const { uid, eid } = req.body;
    const exist = await query('SELECT rid FROM registrations WHERE uid=? AND eid=?', [uid, eid]);
    if (exist.length) return res.status(409).json({ error: '已報名此活動' });
    const rid = 'R' + Date.now();
    const date = new Date().toISOString().slice(0, 10);
    await query('INSERT INTO registrations (rid,uid,eid,date) VALUES (?,?,?,?)', [rid, uid, eid, date]);
    await query('UPDATE events SET joined = joined + 1 WHERE eid = ?', [eid]);
    await query('UPDATE members SET xp = xp + (SELECT xp FROM events WHERE eid=?), coin = coin + (SELECT reward FROM events WHERE eid=?) WHERE uid=?', [eid, eid, uid]);
    res.json({ ok: true, rid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ════════════════ 客服留言系統 ════════════════ */

// 新增留言 (10%)
app.post('/api/comments', async (req, res) => {
  try {
    const { uid, name, eid, text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: '留言不能為空' });
    const cid  = 'C' + Date.now();
    const time = new Date().toLocaleString('zh-TW', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).replace('/','/');
    await query('INSERT INTO comments (cid,uid,name,eid,text,time) VALUES (?,?,?,?,?,?)', [cid, uid, name, eid, text.trim(), time]);
    res.json({ ok: true, cid, time });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 刪除留言 (10%)
app.delete('/api/comments/:cid', async (req, res) => {
  try {
    const { uid } = req.body;
    const rows = await query('SELECT uid FROM comments WHERE cid=?', [req.params.cid]);
    if (!rows.length) return res.status(404).json({ error: '留言不存在' });
    // 本人或管理員可刪
    await query('DELETE FROM comments WHERE cid=?', [req.params.cid]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 查詢留言 (20% 查詢)
app.get('/api/comments', async (req, res) => {
  try {
    const { eid } = req.query;
    let sql = 'SELECT * FROM comments ORDER BY time DESC';
    const p = [];
    if (eid) { sql = 'SELECT * FROM comments WHERE eid=? ORDER BY time DESC'; p.push(eid); }
    res.json(await query(sql, p));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ════════════════ 打卡系統 ════════════════ */

app.post('/api/checkin/water', async (req, res) => {
  try {
    const { uid, cups, date } = req.body;
    await query(
      'INSERT INTO water_checkins (uid, date, cups) VALUES (?,?,?) ON DUPLICATE KEY UPDATE cups=?',
      [uid, date, cups, cups]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/checkin/mood', async (req, res) => {
  try {
    const { uid, date, mood, note } = req.body;
    await query(
      'INSERT INTO mood_checkins (uid, date, mood, note) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE mood=?, note=?',
      [uid, date, mood, note||'', mood, note||'']
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ════════════════ 資料分析 (20%) ════════════════ */

app.get('/api/analytics/summary', async (req, res) => {
  try {
    const [members]  = await pool.execute('SELECT COUNT(*) AS cnt FROM members');
    const [events]   = await pool.execute('SELECT COUNT(*) AS cnt FROM events');
    const [regs]     = await pool.execute('SELECT COUNT(*) AS cnt FROM registrations');
    const [comments] = await pool.execute('SELECT COUNT(*) AS cnt FROM comments');
    const [topXp]    = await pool.execute('SELECT name, xp FROM members ORDER BY xp DESC LIMIT 5');
    const [sdgDist]  = await pool.execute('SELECT sdg, COUNT(*) AS cnt FROM events GROUP BY sdg ORDER BY sdg');
    res.json({
      members : members[0].cnt,
      events  : events[0].cnt,
      regs    : regs[0].cnt,
      comments: comments[0].cnt,
      topXp   : topXp,
      sdgDist : sdgDist,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ════════════════ 資料典藏 (10%) ════════════════ */

app.get('/api/archive', async (req, res) => {
  try {
    const events   = await query('SELECT * FROM events', []);
    const members  = await query('SELECT uid,name,role,xp,coin FROM members', []);
    const regs     = await query('SELECT * FROM registrations', []);
    const comments = await query('SELECT * FROM comments', []);
    res.json({ snapshot_time: new Date().toISOString(), events, members, regs, comments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ════════════════ 啟動 ════════════════ */
app.listen(PORT, () => {
  console.log(`邁邁勇者 API 運行於 http://localhost:${PORT}`);
});
