'use strict';

/* ═══════════════════ API 設定 ═══════════════════ */
const API = (() => {
  const { protocol, hostname, port } = window.location;
  const isLanHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

  if (port === '3001') return '';
  if (isLanHost) return `${protocol}//${hostname}:3001`;
  return '';
})();

async function api(method, path, body) {
  try {
    const res = await fetch(API + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await res.json().catch(() => null);
    return res.ok ? payload : { ok:false, status:res.status, ...(payload || {}) };
  } catch {
    return null;
  }
}

const TW_DATE = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const TW_DATE_TIME = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function parseDateValue(value){
  if(!value) return null;
  if(value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw=String(value).trim();
  if(!raw) return null;
  const parsed=new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateDisplay(value, empty='未填寫'){
  const parsed=parseDateValue(value);
  return parsed ? TW_DATE.format(parsed) : empty;
}

function formatDateTimeDisplay(value, empty='未提供時間'){
  const parsed=parseDateValue(value);
  return parsed ? TW_DATE_TIME.format(parsed) : empty;
}

function isRegisteredForEvent(eid){
  return registrationRows.some(row=>row.eid===eid && row.uid===currentUser?.uid);
}

function getDailyTaskStorageKey(){
  return currentUser?.uid ? `kq-daily-${currentUser.uid}-${todayIso()}` : '';
}

function loadDailyTaskState(){
  const key=getDailyTaskStorageKey();
  if(!key){
    dailyTaskState={ steps: 0, locationChecked: false, claimed: {} };
    return dailyTaskState;
  }
  try{
    const raw=localStorage.getItem(key);
    const parsed=raw ? JSON.parse(raw) : {};
    dailyTaskState={
      steps:Number(parsed.steps||0),
      locationChecked:Boolean(parsed.locationChecked),
      claimed:parsed.claimed && typeof parsed.claimed==='object' ? parsed.claimed : {},
    };
  }catch{
    dailyTaskState={ steps: 0, locationChecked: false, claimed: {} };
  }
  return dailyTaskState;
}

function saveDailyTaskState(){
  const key=getDailyTaskStorageKey();
  if(!key) return;
  localStorage.setItem(key, JSON.stringify(dailyTaskState));
}

function getTodayMoodCheckin(){
  return checkinHistory.mood.find(item=>item.date===todayIso());
}

function getDailyTasks(){
  const waterMl=waterCount*250;
  return [
    {
      id:'walk3000',
      title:'步行 3000 步',
      desc:'手動輸入今天累積的步數，達成後可領取日常獎勵。',
      progress:Math.min(Number(dailyTaskState.steps||0), 3000),
      goal:3000,
      unit:'步',
      xp:35,
      coin:15,
      action:'steps',
    },
    {
      id:'water2000',
      title:'喝水 2000 ml',
      desc:'每喝一杯 250 ml 會同步更新進度，養成健康日常。',
      progress:Math.min(waterMl, 2000),
      goal:2000,
      unit:'ml',
      xp:28,
      coin:10,
      action:'water',
    },
    {
      id:'moodCheckin',
      title:'完成今日心情打卡',
      desc:'記錄今天的心情狀態，讓系統留下生活軌跡。',
      progress:getTodayMoodCheckin() ? 1 : 0,
      goal:1,
      unit:'次',
      xp:18,
      coin:8,
      action:'mood',
    },
    {
      id:'mapCheckin',
      title:'完成地圖打卡',
      desc:'按一下定位打卡，模擬今天有進入系統完成生活任務。',
      progress:dailyTaskState.locationChecked ? 1 : 0,
      goal:1,
      unit:'次',
      xp:22,
      coin:12,
      action:'location',
    },
  ];
}

/* ═══════════════════ 常數 ═══════════════════ */
const FCU_POS   = [24.1798, 120.6438];
const SDG_COLOR = {3:'#4c9f38',4:'#c5192d',11:'#fd9d24',12:'#bf8b2e',13:'#3f7e44',14:'#0a97d9'};
const SDG_NAME  = {3:'健康與福祉',4:'優質教育',11:'永續城市',12:'負責任消費',13:'氣候行動',14:'海洋生態'};
const ICON_MAP  = {W:'🌊',F:'🥘',B:'📖',G:'🌿',R:'🔋',H:'🏥',S:'🛡️',L:'❤️'};

/* ═══════════════════ 本地登入備援資料 ═══════════════════ */
const LOCAL_MEMBERS = [
  {uid:'U001',name:'user',  email:'user@demo.com',  pass:'quest',   xp:1200,coin:500, role:'user'},
  {uid:'N001',name:'npo',   email:'npo@demo.com',   pass:'npo123',  xp:0,coin:0,role:'npo',npo_name:'台中市紅十字會',npo_id:'NP01'},
  {uid:'A001',name:'admin', email:'admin@demo.com', pass:'admin123',xp:0,coin:0,role:'admin'},
];

/* ═══════════════════ 狀態 ═══════════════════ */
let activeEvents  = [];
let currentUser   = null;
let map           = null;
let warriorMarker = null;
let markers       = [];
let warriorPos    = [...FCU_POS];
let currentActEid = null;
let dbConnected   = false;
let commentMap    = {};
let memberRows    = [];
let registrationRows = [];
let archiveData   = null;
let checkinHistory = { water: [], mood: [] };
let selectedCommentImage = '';
let dailyTaskState = { steps: 0, locationChecked: false, claimed: {} };

/* ═══════════════════ 登入背景動畫 ═══════════════════ */
(function initLoginCanvas(){
  const canvas = document.getElementById('loginCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  const pts = Array.from({length:80},()=>({
    x:Math.random()*1400,y:Math.random()*900,
    r:Math.random()*.8+.3,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,a:Math.random()*Math.PI*2
  }));
  const resize=()=>{ W=canvas.width=innerWidth; H=canvas.height=innerHeight; };
  resize(); window.addEventListener('resize',resize);
  (function draw(){
    ctx.clearRect(0,0,W,H);
    pts.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.a+=.012;
      if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(167,139,250,${.3+.3*Math.sin(p.a)})`; ctx.fill();
    });
    requestAnimationFrame(draw);
  })();
})();

/* ═══════════════════ 驗證 ═══════════════════ */
function switchAuth(tab){
  document.getElementById('formLogin').classList.toggle('hidden',tab!=='login');
  document.getElementById('formRegister').classList.toggle('hidden',tab!=='register');
  document.querySelectorAll('.authTab').forEach((b,i)=>
    b.classList.toggle('active',(i===0&&tab==='login')||(i===1&&tab==='register')));
}

async function doLogin(){
  const name=document.getElementById('loginUser').value.trim();
  const pass=document.getElementById('loginPass').value.trim();
  const data=await api('POST','/api/login',{name,pass});
  if(data?.ok){
    currentUser=data.user; dbConnected=true; showDbBadge(true);
  } else {
    const mem=LOCAL_MEMBERS.find(m=>m.name===name&&m.pass===pass);
    if(!mem){ showToast('帳號或密碼錯誤','error'); return; }
    currentUser={...mem}; showDbBadge(false);
  }
  if(currentUser.role==='admin')    await enterAdmin();
  else if(currentUser.role==='npo') await enterNpo();
  else                              await enterUser();
}

async function quickLogin(name,pass){
  document.getElementById('loginUser').value=name;
  document.getElementById('loginPass').value=pass;
  await doLogin();
}

function fillRegisterForm(){
  const stamp = Date.now().toString().slice(-6);
  document.getElementById('regUser').value = `demo_user_${stamp}`;
  document.getElementById('regEmail').value = `demo${stamp}@mail.com`;
  document.getElementById('regPass').value = 'demo1234';
  document.getElementById('regPass2').value = 'demo1234';
  showToast('已帶入註冊資料，可直接建立帳號','success');
}

async function doRegister(){
  const name=document.getElementById('regUser').value.trim();
  const email=document.getElementById('regEmail').value.trim();
  const pass=document.getElementById('regPass').value.trim();
  const pass2=document.getElementById('regPass2').value.trim();
  if(!name||!email||!pass){ showToast('請填寫所有欄位','error'); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showToast('Email 格式不正確','error'); return; }
  if(pass!==pass2){ showToast('兩次密碼不一致','error'); return; }
  const data=await api('POST','/api/register',{name,email,pass});
  if(!data?.ok){ showToast(data?.error||'資料庫連線失敗，無法建立真實帳號','error'); return; }
  showToast('🎉 帳號建立成功！','success');
  switchAuth('login');
  document.getElementById('loginUser').value=name;
  document.getElementById('loginPass').value=pass;
}

function doLogout(){
  currentUser=null;
  ['userApp','adminApp','npoApp'].forEach(id=>document.getElementById(id).classList.add('hidden'));
  document.getElementById('loginScreen').classList.remove('hidden');
  document.querySelectorAll('.bottomSheet').forEach(s=>s.classList.remove('open'));
  showToast('已登出','');
}

/* ═══════════════════ DB 指示器 ═══════════════════ */
function showDbBadge(connected){
  let b=document.getElementById('dbBadge');
  if(!b){
    b=document.createElement('div'); b.id='dbBadge';
    b.style.cssText='position:fixed;top:3.2rem;right:.8rem;z-index:500;padding:.25rem .65rem;border-radius:20px;font-size:.68rem;font-weight:800;pointer-events:none;transition:opacity .5s;';
    document.body.appendChild(b);
  }
  b.textContent=connected?'🟢 DB 已連線':'🔴 本地模式';
  b.style.background=connected?'rgba(16,185,129,.2)':'rgba(239,68,68,.2)';
  b.style.color=connected?'#10b981':'#f87171';
  b.style.border=`1px solid ${connected?'rgba(16,185,129,.4)':'rgba(239,68,68,.4)'}`;
}

function refreshHud(){
  if(!currentUser) return;
  const xp = Number(currentUser.xp || 0);
  const coin = Number(currentUser.coin || 0);
  const level = Math.floor(xp / 1000) + 1;
  const currentLevelXp = xp % 1000;
  const nextLevelXp = 1000 - currentLevelXp || 1000;
  const pct = Math.min(100,(currentLevelXp / 1000) * 100);
  document.getElementById('hudUsername').textContent =currentUser.name;
  document.getElementById('hudLevel').textContent    =`Lv.${level}`;
  document.getElementById('profileName').textContent =currentUser.name;
  document.getElementById('profileUid').textContent  ='UID · '+currentUser.uid;
  document.getElementById('hudCoin').textContent     =coin;
  document.getElementById('hudXpText').textContent   =xp.toLocaleString()+' XP';
  document.getElementById('hudXpFill').style.width   =pct+'%';
  document.getElementById('profileLevelBadge').textContent = `Lv.${level}`;
  document.getElementById('profileXpBadge').textContent    = `⭐ ${xp.toLocaleString()} XP`;
  document.getElementById('profileCoinBadge').textContent  = `💎 ${coin.toLocaleString()}`;
  document.getElementById('profileXpBar').style.width      = pct+'%';
  document.getElementById('profileNextLevel').textContent  = `距下一等級 ${nextLevelXp.toLocaleString()} XP`;
  document.getElementById('infoName').textContent    =currentUser.name;
  document.getElementById('infoEmail').textContent   =currentUser.email||'未填寫';
  document.getElementById('infoPhone').textContent   =currentUser.phone||'未填寫';
  document.getElementById('infoCity').textContent    =currentUser.city||'未填寫';
  document.getElementById('infoBirthday').textContent=formatDateDisplay(currentUser.birthday);
  document.getElementById('infoEmergency').textContent=currentUser.emergency_contact||'未填寫';
  document.getElementById('infoXp').textContent      =xp.toLocaleString()+' XP';
  document.getElementById('infoCoin').textContent    ='💎 '+coin.toLocaleString();
  document.getElementById('infoBio').textContent     =currentUser.bio||'未填寫';
  fillProfileForm();
}

function hideAllApps(){
  ['loginScreen','userApp','adminApp','npoApp'].forEach(id=>{
    document.getElementById(id).classList.add('hidden');
  });
}

function nextEventId(){
  const nums=activeEvents
    .map(event=>Number.parseInt(String(event.eid).replace(/\D/g,''),10))
    .filter(Number.isFinite);
  const next=(nums.length?Math.max(...nums):0)+1;
  return `E${String(next).padStart(3,'0')}`;
}

function todayIso(){
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.filter(part=>part.type !== 'literal').map(part=>[part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function normalizeDateKey(value){
  if(!value) return '';
  if(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed=parseDateValue(value);
  if(!parsed) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(parsed);
  const map = Object.fromEntries(parts.filter(part=>part.type !== 'literal').map(part=>[part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

/* ═══════════════════ 載入事件（DB 優先）═══════════════════ */
async function loadEvents(){
  const data=await api('GET','/api/events');
  if(Array.isArray(data)){
    activeEvents=data.map(e=>({...e,sdg_color:e.sdg_color||SDG_COLOR[e.sdg_id]||'#7c3aed',sdg_name:e.sdg_name||SDG_NAME[e.sdg_id]||''}));
    dbConnected=true;
    return;
  }
  activeEvents=[];
}

async function loadCommentsForEid(eid){
  const query = new URLSearchParams({ eid, uid: currentUser?.uid || '' }).toString();
  const data=await api('GET',`/api/comments?${query}`);
  if(Array.isArray(data)){ commentMap[eid]=data; return data; }
  return [];
}

async function loadMembers(){
  const data = await api('GET','/api/members');
  if(Array.isArray(data)){
    memberRows = data;
    return data;
  }
  memberRows = [];
  return memberRows;
}

async function loadRegistrations(){
  const data = await api('GET','/api/registrations');
  registrationRows = Array.isArray(data) ? data : [];
  return registrationRows;
}

async function geocodeAddress(address){
  const keyword=String(address||'').trim();
  if(!keyword) return null;
  const data=await api('GET',`/api/geocode?q=${encodeURIComponent(keyword)}`);
  if(data?.ok) return { lat:Number(data.lat), lng:Number(data.lng), display_name:data.display_name||keyword };
  return null;
}

function getMemberProfile(uid){
  return memberRows.find(member=>member.uid===uid) || registrationRows.find(row=>row.uid===uid) || null;
}

function renderRegistrationGroupCards(events, rows, mountId){
  const mount=document.getElementById(mountId);
  if(!mount) return;
  const html=events.map(ev=>{
    const group=rows.filter(row=>row.eid===ev.eid);
    const col=ev.sdg_color||SDG_COLOR[ev.sdg_id]||'#7c3aed';
    return `<div class="regGroupCard">
      <div class="regGroupHeader">
        <div>
          <div class="regGroupTitle">${ev.name}</div>
          <div class="regGroupMeta">EID ${ev.eid} · ${ev.date} · ${ev.loc}<br><span class="sdgTag" style="background:${col}">SDG ${ev.sdg_id}</span> · ${ev.npo_name||'未設定主辦單位'}</div>
        </div>
        <div class="regBadge">${group.length} 位報名者</div>
      </div>
      <div class="regMemberList">
        ${group.length ? group.map(row=>`
          <div class="regMemberItem">
            <div class="regMemberMain">
              <div class="regMemberName">${row.member_name||row.uid}</div>
              <div class="regMemberMeta">UID ${row.uid} · ${row.email||'未填 Email'}<br>${row.phone||'未填手機'} · ${row.city||'未填城市'} · 報名日 ${String(row.reg_date||row.event_date||'').slice(0,10)}</div>
            </div>
            <div class="regMemberActions">
              <button class="aBtnView" onclick="openMemberDetailModal('${row.uid}')">查看資料</button>
            </div>
          </div>
        `).join('') : `<div class="regMemberItem"><div class="regMemberMeta">目前尚無報名資料</div></div>`}
      </div>
    </div>`;
  }).join('');
  mount.innerHTML=html || '<div class="regGroupCard"><div class="regMemberMeta">目前沒有可顯示的活動報名資料。</div></div>';
}

function renderRegistrationGroupCardsSafe(events, rows, mountId){
  const mount=document.getElementById(mountId);
  if(!mount) return;
  const html=events.map(ev=>{
    const group=rows.filter(row=>row.eid===ev.eid);
    const col=ev.sdg_color||SDG_COLOR[ev.sdg_id]||'#7c3aed';
    const memberList=group.length
      ?group.map(row=>`
        <div class="regMemberItem">
          <div class="regMemberMain">
            <div class="regMemberName">${row.member_name||row.uid}</div>
            <div class="regMemberMeta">UID ${row.uid} · ${row.email||'未填 Email'}<br>${row.phone||'未填手機'} · ${row.city||'未填城市'} · 報名日 ${String(row.reg_date||row.event_date||'').slice(0,10)}</div>
          </div>
          <div class="regMemberActions">
            <button class="aBtnView" onclick="openMemberDetailModal('${row.uid}')">查看資料</button>
          </div>
        </div>
      `).join('')
      : `<div class="regMemberItem"><div class="regMemberMeta">目前尚無報名資料</div></div>`;
    return `<div class="regGroupCard">
      <div class="regGroupHeader">
        <div>
          <div class="regGroupTitle">${ev.name}</div>
          <div class="regGroupMeta">EID ${ev.eid} · ${ev.date} · ${ev.loc}<br><span class="sdgTag" style="background:${col}">SDG ${ev.sdg_id}</span> · ${ev.npo_name||'未設定主辦單位'}</div>
        </div>
        <div class="regBadge">${group.length} 位報名者</div>
      </div>
      <div class="regMemberList">${memberList}</div>
    </div>`;
  }).join('');
  mount.innerHTML=html || '<div class="regGroupCard"><div class="regMemberMeta">目前沒有可顯示的活動報名資料。</div></div>';
}

function openMemberDetailModal(uid){
  const modal=document.getElementById('memberDetailModal');
  const body=document.getElementById('memberDetailBody');
  const member=getMemberProfile(uid);
  if(!modal||!body||!member) return;
  body.innerHTML=[
    ['UID', member.uid],
    ['姓名', member.name||member.member_name||'未填寫'],
    ['Email', member.email||'未填寫'],
    ['手機', member.phone||'未填寫'],
    ['城市', member.city||'未填寫'],
    ['生日', member.birthday ? String(member.birthday).slice(0,10) : '未填寫'],
    ['緊急聯絡人', member.emergency_contact||'未填寫'],
    ['XP', Number(member.xp||0).toLocaleString()],
    ['金幣', Number(member.coin||0).toLocaleString()],
  ].map(([label,value])=>`<div class="memberDetailRow"><div class="memberDetailLabel">${label}</div><div class="memberDetailValue">${value}</div></div>`).join('')
  + `<div class="memberDetailRow block"><div class="memberDetailLabel">個人簡介</div><div class="memberDetailValue">${member.bio||'未填寫'}</div></div>`;
  modal.classList.remove('hidden');
}

function closeMemberDetailModal(){
  document.getElementById('memberDetailModal')?.classList.add('hidden');
}

function openMemberDetailModal(uid){
  const modal=document.getElementById('memberDetailModal');
  const body=document.getElementById('memberDetailBody');
  const member=getMemberProfile(uid);
  if(!modal||!body||!member) return;
  body.innerHTML=[
    ['姓名', member.name||member.member_name||'未填寫'],
    ['Email', member.email||'未填寫'],
    ['手機', member.phone||'未填寫'],
    ['城市', member.city||'未填寫'],
    ['生日', member.birthday ? String(member.birthday).slice(0,10) : '未填寫'],
    ['緊急聯絡人', member.emergency_contact||'未填寫'],
    ['XP', Number(member.xp||0).toLocaleString()],
    ['金幣', Number(member.coin||0).toLocaleString()],
  ].map(([label,value])=>`<div class="memberDetailRow"><div class="memberDetailLabel">${label}</div><div class="memberDetailValue">${value}</div></div>`).join('')
  + `<div class="memberDetailRow block"><div class="memberDetailLabel">個人簡介</div><div class="memberDetailValue">${member.bio||'未填寫'}</div></div>`;
  modal.classList.remove('hidden');
}

/* ═══════════════════ 進入各介面 ═══════════════════ */
async function enterUser(){
  hideAllApps();
  document.getElementById('userApp').classList.remove('hidden');
  await Promise.all([loadEvents(), loadRegistrations()]);
  loadDailyTaskState();
  populateSearchFilters();
  refreshHud();
  if(!map) setTimeout(initMap,100);
  else renderMarkers();
  setTimeout(()=>{
    renderQuestList();
    renderSearch();
    initGeolocation();
    initCheckinPanel();
  },400);
}

async function enterAdmin(){
  hideAllApps();
  document.getElementById('adminApp').classList.remove('hidden');
  await Promise.all([loadEvents(), loadMembers(), loadRegistrations()]);
  renderAdminEvents();
  renderAdminMembers();
  await renderAdminComments();
  await loadArchive(false);
  setTimeout(initAdminCharts,300);
}

async function enterNpo(){
  hideAllApps();
  document.getElementById('npoApp').classList.remove('hidden');
  document.getElementById('npoWhoLabel').textContent='🏛️ '+(currentUser.npo_name||'道館主');
  await Promise.all([loadEvents(), loadMembers(), loadRegistrations()]);
  renderNpoEvents(); renderNpoRegs(); populateNpoCommentSelect();
  setTimeout(initNpoCharts,300);
}

/* ═══════════════════ Leaflet marker CSS ═══════════════════ */
(function injectMarkerCSS(){
  const s=document.createElement('style');
  s.textContent=`
  .gymPin{position:relative;text-align:center;cursor:pointer;}
  .gymTop{width:44px;height:44px;border-radius:50%;background:var(--c,#7c3aed);border:2px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-size:1.3rem;box-shadow:0 0 14px var(--c,#7c3aed),0 4px 12px rgba(0,0,0,.6);transition:transform .2s;}
  .gymPin:hover .gymTop{transform:scale(1.15) translateY(-3px);}
  .gymLabel{font-size:.58rem;font-weight:800;color:rgba(255,255,255,.9);text-align:center;margin-top:2px;text-shadow:0 1px 4px rgba(0,0,0,.8);white-space:nowrap;overflow:hidden;max-width:54px;}
  .gymPulse{width:20px;height:6px;background:var(--c,#7c3aed);border-radius:50%;margin:2px auto 0;filter:blur(3px);opacity:.7;animation:gPulse 2s ease-in-out infinite;}
  @keyframes gPulse{0%,100%{opacity:.5;transform:scaleX(1);}50%{opacity:1;transform:scaleX(1.2);}}
  .wMarker{position:relative;width:70px;text-align:center;cursor:default;}
  .wScan{position:absolute;top:38%;left:50%;width:60px;height:60px;border-radius:50%;transform:translate(-50%,-50%);border:2px solid rgba(124,58,237,.7);animation:wScanAnim 3s ease-out infinite;pointer-events:none;}
  .wScan.s2{animation-delay:1s;border-color:rgba(16,185,129,.5);}
  .wScan.s3{animation-delay:2s;border-color:rgba(124,58,237,.35);}
  @keyframes wScanAnim{0%{transform:translate(-50%,-50%) scale(.4);opacity:.9;}100%{transform:translate(-50%,-50%) scale(5.5);opacity:0;}}
  .wGlow{position:absolute;top:38%;left:50%;transform:translate(-50%,-50%);width:56px;height:56px;border-radius:50%;background:radial-gradient(circle,rgba(124,58,237,.55) 0%,transparent 70%);animation:wPulseAnim 2s ease-in-out infinite;}
  @keyframes wPulseAnim{0%,100%{opacity:.6;transform:translate(-50%,-50%) scale(1);}50%{opacity:1;transform:translate(-50%,-50%) scale(1.2);}}
  .wEmoji{font-size:2.4rem;display:block;filter:drop-shadow(0 0 10px rgba(124,58,237,.9));animation:wFloat 2.5s ease-in-out infinite;position:relative;z-index:2;}
  @keyframes wFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-7px);}}
  .wLabel{font-size:.62rem;font-weight:900;color:#a78bfa;background:rgba(8,5,26,.75);border-radius:8px;padding:1px 6px;margin-top:2px;display:inline-block;border:1px solid rgba(124,58,237,.3);}
  .wShad{width:24px;height:6px;background:rgba(0,0,0,.5);border-radius:50%;margin:2px auto 0;filter:blur(3px);}
  `;
  document.head.appendChild(s);
})();

/* ═══════════════════ 地圖 ═══════════════════ */
function initMap(){
  map=L.map('gameMap',{zoomControl:false,attributionControl:false}).setView(warriorPos,15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  L.control.zoom({position:'topright'}).addTo(map);
  addWarriorMarker(); renderMarkers();
}

function addWarriorMarker(){
  const name=currentUser?.name||'勇者';
  const icon=L.divIcon({
    className:'',
    html:`<div class="wMarker"><div class="wScan s1"></div><div class="wScan s2"></div><div class="wScan s3"></div><div class="wGlow"></div><span class="wEmoji">🧙</span><div class="wLabel">${name}</div><div class="wShad"></div></div>`,
    iconSize:[70,90],iconAnchor:[35,80]
  });
  warriorMarker=L.marker(warriorPos,{icon,zIndexOffset:1000,interactive:false}).addTo(map);
}

function renderMarkers(){
  markers.forEach(m=>m.remove()); markers=[];
  activeEvents.forEach(ev=>{
    const col=ev.sdg_color||SDG_COLOR[ev.sdg_id]||'#7c3aed';
    const ico=ICON_MAP[ev.icon]||ev.icon||'🌟';
    const icon=L.divIcon({
      className:'',
      html:`<div class="gymPin" style="--c:${col}"><div class="gymTop">${ico}</div><div class="gymLabel">${ev.name.slice(0,5)}</div><div class="gymPulse"></div></div>`,
      iconSize:[54,68],iconAnchor:[27,68]
    });
    const m=L.marker([ev.lat,ev.lng],{icon}).addTo(map);
    m.on('click',()=>openActivityPanel(ev.eid));
    markers.push(m);
  });
}

function locateWarrior(){ if(map) map.flyTo(warriorPos,15,{duration:.8}); }

/* ═══════════════════ GPS ═══════════════════ */
function initGeolocation(){
  const badge=document.getElementById('gpsStatus');
  if(!navigator.geolocation){
    badge.textContent='📍 已鎖定逢甲大學'; badge.classList.add('show');
    setTimeout(()=>badge.classList.remove('show'),3000); return;
  }
  badge.textContent='📡 正在定位...'; badge.classList.add('show');
  navigator.geolocation.getCurrentPosition(
    pos=>{
      warriorPos=[pos.coords.latitude,pos.coords.longitude];
      if(warriorMarker) warriorMarker.setLatLng(warriorPos);
      if(map) map.setView(warriorPos,map.getZoom());
      badge.textContent=`✅ 已定位（精度 ${pos.coords.accuracy.toFixed(0)}m）`;
      setTimeout(()=>badge.classList.remove('show'),3000);
      navigator.geolocation.watchPosition(
        p=>{warriorPos=[p.coords.latitude,p.coords.longitude];if(warriorMarker)warriorMarker.setLatLng(warriorPos);},
        ()=>{},{enableHighAccuracy:true,maximumAge:5000});
    },
    ()=>{ warriorPos=[...FCU_POS]; badge.textContent='📍 已鎖定逢甲大學'; setTimeout(()=>badge.classList.remove('show'),3000); },
    {enableHighAccuracy:true,timeout:10000}
  );
}

/* ═══════════════════ 面板 ═══════════════════ */
let openPanelId=null;

function switchDock(name,btn){
  document.querySelectorAll('.dockBtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(name==='map'){ closeAllPanels(false); return; }
  const pid={search:'searchPanel',quest:'questPanel',checkin:'checkinPanel',profile:'profilePanel'}[name];
  if(!pid) return;
  if(openPanelId===pid){ closeAllPanels(false); return; }
  closeAllPanels(false);
  setTimeout(()=>{ document.getElementById(pid).classList.add('open'); openPanelId=pid; },40);
}

function goToCheckinPanel(){
  const btn=document.querySelector('.dockBtn[data-panel="checkin"]');
  if(!btn) return;
  switchDock('checkin', btn);
}

function closeAllPanels(resetDock){
  document.querySelectorAll('.bottomSheet').forEach(s=>s.classList.remove('open'));
  openPanelId=null;
  if(resetDock!==false){
    document.querySelectorAll('.dockBtn').forEach(b=>b.classList.remove('active'));
    const mapBtn=document.querySelector('.dockBtn[data-panel="map"]');
    if(mapBtn) mapBtn.classList.add('active');
  }
}

/* ═══════════════════ 活動詳細 ═══════════════════ */
async function openActivityPanel(eid){
  const ev=activeEvents.find(e=>e.eid===eid);
  if(!ev) return;
  currentActEid=eid;
  closeAllPanels(false);
  const col=ev.sdg_color||SDG_COLOR[ev.sdg_id]||'#7c3aed';
  const ico=ICON_MAP[ev.icon]||ev.icon||'🌟';
  const pct=Math.round(ev.joined/ev.quota*100);
  const full=ev.joined>=ev.quota;
  const joined=isRegisteredForEvent(eid);

  document.getElementById('activityContent').innerHTML=`
    <div class="adHeader">
      <div class="adIcon">${ico}</div>
      <div style="flex:1">
        <div class="adTitle">${ev.name}</div>
        <span class="adSdg" style="background:${col}">SDG ${ev.sdg_id} · ${ev.sdg_name||SDG_NAME[ev.sdg_id]||''}</span>
      </div>
    </div>
    <div class="adDetails">
      <div class="adDetail"><div class="adDetailLabel">📍 地點</div><div class="adDetailVal">${ev.loc}</div></div>
      <div class="adDetail"><div class="adDetailLabel">📅 日期</div><div class="adDetailVal">${ev.date}</div></div>
      <div class="adDetail"><div class="adDetailLabel">⏰ 時間</div><div class="adDetailVal">${ev.duration||'待定'}</div></div>
      <div class="adDetail"><div class="adDetailLabel">🏛️ 主辦 NPO</div><div class="adDetailVal">${ev.npo_name}</div></div>
      <div class="adDetail"><div class="adDetailLabel">💎 硬幣獎勵</div><div class="adDetailVal">${ev.reward} 枚</div></div>
      <div class="adDetail"><div class="adDetailLabel">⭐ 經驗值</div><div class="adDetailVal">+${ev.xp} XP</div></div>
    </div>
    <div class="adDesc"><div class="adDescLabel">📋 活動說明</div><div class="adDescText">${ev.description||ev.desc||''}</div></div>
    <div class="adDesc" style="margin-top:.5rem"><div class="adDescLabel">📌 注意事項</div><div class="adDescText">${ev.requirements||''}</div></div>
    <div class="adProgress">
      <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:.3rem">
        <span>👥 報名進度</span>
        <span style="color:${full?'var(--red)':'var(--acc)'}">${ev.joined}/${ev.quota} 人${full?' (已額滿)':''}</span>
      </div>
      <div class="adProgressBar"><div class="adProgressFill" style="width:${pct}%;background:${full?'var(--red)':col}"></div></div>
    </div>
    <div class="adActions">
      ${full
        ?`<button class="btnJoin" style="background:#374151;cursor:not-allowed" disabled>❌ 名額已滿</button>`
        :`<button class="btnJoin" onclick="joinEvent('${ev.eid}')">⚔️ 立即報名</button>`}
      <button class="btnShare" onclick="closeAllPanels()">✕</button>
    </div>`;

  const detailVals=document.querySelectorAll('#activityContent .adDetailVal');
  if(detailVals[1]) detailVals[1].textContent=formatDateDisplay(ev.date,'未提供日期');
  const joinBtn=document.querySelector('#activityContent .btnJoin');
  if(joinBtn && joined){
    joinBtn.textContent='已報名此活動';
    joinBtn.disabled=true;
    joinBtn.style.background='#1f163f';
    joinBtn.style.border='1px solid rgba(124,58,237,.35)';
    joinBtn.style.cursor='default';
  }
  const comments=await loadCommentsForEid(eid);
  renderActComments(eid,comments);
  document.getElementById('activityPanel').classList.add('open');
  openPanelId='activityPanel';
  if(map) map.flyTo([ev.lat,ev.lng],16,{duration:.7});
}

function renderActComments(eid,list){
  document.getElementById('actCommentList').innerHTML=list.length
    ?list.map((c,i)=>{
        const isOwn=currentUser&&(c.uid===currentUser.uid||c.name===currentUser.name);
        const t=formatDateTimeDisplay(c.created_at,'剛剛');
        const likeCount=Number(c.like_count||0);
        return `<div class="commentItem">
          <span class="cUser">⚔️ ${c.name}</span><span class="cTime">${t}</span>
          ${isOwn?`<button class="cDel" onclick="deleteActComment('${eid}',${i},'${c.cid||''}')">🗑️</button>`:''}
          <div class="cText">${c.text}</div>
          ${c.image_data?`<img class="commentPhoto" src="${c.image_data}" alt="留言照片"/>`:''}
          <div class="commentActions">
            <button class="likeBtn ${Number(c.liked_by_me) ? 'active' : ''}" onclick="toggleCommentLike('${eid}',${i},'${c.cid}')">❤️ ${likeCount}</button>
          </div>
        </div>`;
      }).join('')
    :'<div style="text-align:center;color:#64748b;padding:1rem">尚無留言，第一個留下心得吧！</div>';
}

function handleCommentPhotoSelect(event){
  const file=event.target.files?.[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    selectedCommentImage=String(reader.result||'');
    const preview=document.getElementById('actCommentPreview');
    preview.classList.remove('hidden');
    preview.innerHTML=`<img src="${selectedCommentImage}" alt="留言照片預覽"/><div class="commentPreviewRow"><span>已加入留言照片</span><button class="btnGhost" type="button" onclick="clearCommentPhoto()">移除</button></div>`;
  };
  reader.readAsDataURL(file);
}

function clearCommentPhoto(){
  selectedCommentImage='';
  const input=document.getElementById('actCommentPhoto');
  const preview=document.getElementById('actCommentPreview');
  if(input) input.value='';
  if(preview){
    preview.innerHTML='';
    preview.classList.add('hidden');
  }
}

async function sendActComment(){
  const txt=document.getElementById('actCommentInput').value.trim();
  if(!txt && !selectedCommentImage){ showToast('請輸入留言或上傳照片','error'); return; }
  const eid=currentActEid;
  const uid=currentUser?.uid||'U001';
  const name=currentUser?.name||'勇者';
  const data=await api('POST','/api/comments',{uid,name,eid,text:txt || '分享一張活動照片',image_data:selectedCommentImage||null});
  if(!data?.ok){ showToast(data?.error||'資料庫連線失敗，無法新增留言','error'); return; }
  const cid=data?.cid||('C'+Date.now());
  if(!commentMap[eid]) commentMap[eid]=[];
  commentMap[eid].unshift({cid,uid,name,eid,text:txt || '分享一張活動照片',image_data:selectedCommentImage||null,like_count:0,liked_by_me:0,created_at:new Date().toISOString()});
  document.getElementById('actCommentInput').value='';
  clearCommentPhoto();
  renderActComments(eid,commentMap[eid]);
  showToast('💬 留言已送出！','success');
}

async function deleteActComment(eid,idx,cid){
  if(cid){
    const result = await api('DELETE',`/api/comments/${cid}`);
    if(!result?.ok){ showToast(result?.error||'資料庫連線失敗，無法刪除留言','error'); return; }
  }
  if(!commentMap[eid]) commentMap[eid]=[];
  commentMap[eid].splice(idx,1);
  renderActComments(eid,commentMap[eid]);
  showToast('留言已刪除','success');
}

async function toggleCommentLike(eid,idx,cid){
  if(!currentUser?.uid){ showToast('請先登入會員後再按愛心','error'); return; }
  const result=await api('POST',`/api/comments/${cid}/like`,{uid:currentUser.uid});
  if(!result?.ok){ showToast(result?.error||'資料庫連線失敗，無法更新愛心','error'); return; }
  const comment=commentMap[eid]?.[idx];
  if(!comment) return;
  const currentLikes=Number(comment.like_count||0);
  comment.liked_by_me=result.liked?1:0;
  comment.like_count=Math.max(0,currentLikes+(result.liked?1:-1));
  renderActComments(eid,commentMap[eid]);
}

async function joinEvent(eid){
  const ev=activeEvents.find(e=>e.eid===eid);
  if(!ev) return;
  const uid=currentUser?.uid||'U001';
  const data=await api('POST','/api/registrations',{uid,eid});
  if(!data?.ok){ showToast(data?.error||'資料庫連線失敗，無法建立真實報名資料','error'); return; }
  ev.joined=Math.min(ev.joined+1,ev.quota);
  registrationRows.push({
    rid:data.rid,
    uid,
    eid,
    member_name:currentUser?.name||uid,
    email:currentUser?.email||'',
    phone:currentUser?.phone||'',
    city:currentUser?.city||'',
    birthday:currentUser?.birthday||'',
    emergency_contact:currentUser?.emergency_contact||'',
    bio:currentUser?.bio||'',
    xp:currentUser?.xp||0,
    coin:currentUser?.coin||0,
    reg_date:new Date().toISOString(),
    event_name:ev.name,
    event_loc:ev.loc,
    event_date:ev.date,
  });
  const gainXp=data?.xp||ev.xp; const gainCoin=data?.reward||ev.reward;
  if(currentUser){ currentUser.xp+=gainXp; currentUser.coin+=gainCoin; }
  refreshHud();
  showToast(`🎉 成功報名「${ev.name}」！ +${gainXp} XP、+${gainCoin} 💎`,'success');
  openActivityPanel(eid);
}

/* ═══════════════════ 探索 ═══════════════════ */
function renderSearch(){
  const keyword=(document.getElementById('fKeyword')?.value||'').trim().toLowerCase();
  const sdg=document.getElementById('fSdg')?.value||'';
  const npo=document.getElementById('fNpo')?.value||'';
  const start=document.getElementById('fStart')?.value||'';
  const end=document.getElementById('fEnd')?.value||'';
  const reward=Number(document.getElementById('fReward')?.value||0);
  const availability=document.getElementById('fAvailability')?.value||'';
  const sort=document.getElementById('fSort')?.value||'dateAsc';
  const res=activeEvents.filter(ev=>{
    const haystack=`${ev.name} ${ev.loc} ${ev.npo_name}`.toLowerCase();
    if(keyword && !haystack.includes(keyword)) return false;
    if(sdg&&ev.sdg_id!=sdg) return false;
    if(npo&&ev.npo_name!==npo) return false;
    if(start&&ev.date<start) return false;
    if(end&&ev.date>end) return false;
    if(reward && Number(ev.xp||0)<reward) return false;
    const remaining = Number(ev.quota||0) - Number(ev.joined||0);
    if(availability==='available' && remaining <= 0) return false;
    if(availability==='full' && remaining > 3) return false;
    return true;
  });
  res.sort((a,b)=>{
    if(sort==='rewardDesc') return Number(b.xp||0)-Number(a.xp||0);
    if(sort==='popularDesc') return Number(b.joined||0)-Number(a.joined||0);
    return String(a.date).localeCompare(String(b.date));
  });
  document.getElementById('searchResults').innerHTML=res.length
    ?res.map(ev=>{
        const col=ev.sdg_color||SDG_COLOR[ev.sdg_id]||'#7c3aed';
        const ico=ICON_MAP[ev.icon]||ev.icon||'🌟';
        return `<div class="srCard" onclick="openActivityPanel('${ev.eid}')">
          <div class="srPin" style="background:${col}20;border:2px solid ${col}">${ico}</div>
          <div class="srInfo">
            <div class="srName">${ev.name}</div>
            <div class="srMeta">📍 ${ev.loc} · 📅 ${ev.date} · 🏛️ ${ev.npo_name} · <span class="sdgTag" style="background:${col}">SDG ${ev.sdg_id}</span> · <b style="color:#f59e0b">+${ev.xp} XP</b></div>
          </div>
          <div style="color:#64748b">›</div>
        </div>`;
      }).join('')
    :'<div style="text-align:center;color:#64748b;padding:2rem">找不到符合的任務</div>';
}
function applyFilter(){ renderSearch(); }

function populateSearchFilters(){
  const select=document.getElementById('fNpo');
  if(!select) return;
  const value=select.value;
  const npoOptions=[...new Set(activeEvents.map(event=>event.npo_name).filter(Boolean))].sort();
  select.innerHTML=['<option value="">全部主辦</option>', ...npoOptions.map(name=>`<option value="${name}">${name}</option>`)].join('');
  select.value=value;
}

/* ═══════════════════ 任務列表 ═══════════════════ */
function renderQuestList(){
  renderDailyTaskBoard();
  document.getElementById('questList').innerHTML=activeEvents.map((ev,i)=>{
    const col=ev.sdg_color||SDG_COLOR[ev.sdg_id]||'#7c3aed';
    const ico=ICON_MAP[ev.icon]||ev.icon||'🌟';
    const pct=Math.round(ev.joined/ev.quota*100);
    return `<div class="questCard" onclick="openActivityPanel('${ev.eid}')" style="animation:slideUp .3s ${i*.06}s both">
      <div class="questPin">${ico}</div>
      <div style="flex:1">
        <div class="questName">${ev.name}</div>
        <div class="questMeta">📍 ${ev.loc} | 📅 ${ev.date} <span class="sdgTag" style="background:${col};margin-left:.3rem">SDG ${ev.sdg_id}</span></div>
        <div style="margin-top:.4rem;background:#100c28;border-radius:4px;height:5px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${col};border-radius:4px;transition:width .6s .1s"></div>
        </div>
        <div style="font-size:.7rem;color:#64748b;margin-top:.2rem">${ev.joined}/${ev.quota} 人 · 💎 ${ev.reward} · ⭐ +${ev.xp} XP</div>
      </div>
    </div>`;
  }).join('');
}

function renderDailyTaskBoard(){
  const board=document.getElementById('dailyTaskBoard');
  if(!board) return;
  const tasks=getDailyTasks();
  board.innerHTML=`
    <div class="dailyTaskWrap">
      <div class="dailyTaskHeader">
        <div>
          <div class="dailyTaskTitle">今日日常任務</div>
          <div class="dailyTaskSub">除了報名活動，會員每天也能靠走路、喝水與打卡累積 XP 和鑽石，提升整體互動感。</div>
        </div>
      </div>
      <div class="dailyTaskGrid">
        ${tasks.map(task=>{
          const completed=task.progress>=task.goal;
          const claimed=Boolean(dailyTaskState.claimed?.[task.id]);
          const pct=Math.min(100, Math.round((task.progress/task.goal)*100));
          return `<div class="dailyTaskCard ${completed ? 'done' : ''}">
            <div class="dailyTaskRow">
              <div>
                <div class="dailyTaskName">${task.title}</div>
                <div class="dailyTaskDesc">${task.desc}</div>
              </div>
              <div class="dailyTaskReward">⭐ ${task.xp} XP · 💎 ${task.coin}</div>
            </div>
            <div class="dailyTaskProgress">
              <div class="dailyTaskTrack"><div class="dailyTaskFill" style="width:${pct}%"></div></div>
              <div class="dailyTaskMeta">
                <span>進度 ${Math.min(task.progress, task.goal)} / ${task.goal} ${task.unit}</span>
                <span>${claimed ? '已領取' : completed ? '可領獎勵' : '進行中'}</span>
              </div>
            </div>
            <div class="dailyTaskActions">${renderDailyTaskActions(task, completed, claimed)}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function renderDailyTaskActions(task, completed, claimed){
  if(task.action==='steps'){
    return `
      <input id="dailyStepInput" class="dailyTaskInput" type="number" min="0" step="100" placeholder="輸入今日步數，例如 3200" value="${Number(dailyTaskState.steps||0) || ''}"/>
      <button class="dailyTaskBtn secondary" type="button" onclick="updateDailySteps()">更新步數</button>
      <button class="dailyTaskBtn claim" type="button" onclick="claimDailyTask('${task.id}')" ${(!completed || claimed) ? 'disabled' : ''}>${claimed ? '已領取' : '領取獎勵'}</button>
    `;
  }
  if(task.action==='location'){
    return `
      <button class="dailyTaskBtn secondary" type="button" onclick="completeDailyLocationCheckin()" ${completed ? 'disabled' : ''}>${completed ? '已完成打卡' : '現在打卡'}</button>
      <button class="dailyTaskBtn claim" type="button" onclick="claimDailyTask('${task.id}')" ${(!completed || claimed) ? 'disabled' : ''}>${claimed ? '已領取' : '領取獎勵'}</button>
    `;
  }
  if(task.action==='water' || task.action==='mood'){
    return `
      <button class="dailyTaskBtn secondary" type="button" onclick="goToCheckinPanel()">前往打卡</button>
      <button class="dailyTaskBtn claim" type="button" onclick="claimDailyTask('${task.id}')" ${(!completed || claimed) ? 'disabled' : ''}>${claimed ? '已領取' : '領取獎勵'}</button>
    `;
  }
  return `
    <button class="dailyTaskBtn secondary" type="button" onclick="switchDock('${task.action==='water' ? 'checkin' : 'checkin'}', document.querySelector('.dockBtn[data-panel=\"checkin\"]'))">前往打卡</button>
    <button class="dailyTaskBtn claim" type="button" onclick="claimDailyTask('${task.id}')" ${(!completed || claimed) ? 'disabled' : ''}>${claimed ? '已領取' : '領取獎勵'}</button>
  `;
}

/* ═══════════════════ 喝水打卡 ═══════════════════ */
let waterCount=0;
const WATER_GOAL=8;

async function initCheckinPanel(){
  await loadCheckinHistory();
  initWaterUI();
  initMoodUI();
  renderDailyTaskBoard();
}

async function loadCheckinHistory(){
  if(!currentUser?.uid){
    checkinHistory = { water: [], mood: [] };
    renderWaterHistory();
    renderMoodHistory();
    return;
  }
  const data = await api('GET', `/api/checkin/history/${currentUser.uid}`);
  checkinHistory = {
    water: data?.ok && Array.isArray(data.water)
      ? data.water.map(item=>({ ...item, date: normalizeDateKey(item.date) }))
      : [],
    mood: data?.ok && Array.isArray(data.mood)
      ? data.mood.map(item=>({ ...item, date: normalizeDateKey(item.date) }))
      : [],
  };
  renderWaterHistory();
  renderMoodHistory();
}

function initWaterUI(){
  const today = todayIso();
  const todayWater = checkinHistory.water.find(item => item.date === today);
  waterCount = Number(todayWater?.cups || 0);
  renderWater();
}

async function addWater(){
  if(waterCount>=WATER_GOAL){ showToast('🎉 今日喝水目標已達成！','success'); return; }
  waterCount++;
  renderWater();
  if(currentUser){
    const result = await api('POST','/api/checkin/water',{uid:currentUser.uid,cups:waterCount,date:todayIso()});
    if(!result?.ok){ showToast(result?.error||'資料庫連線失敗，無法儲存喝水打卡','error'); return; }
    await loadCheckinHistory();
  }
  if(waterCount===WATER_GOAL) showToast('🏆 恭喜！今日喝水目標達成！','success');
  else showToast(`💧 已喝 ${waterCount} 杯（${waterCount*250} ml）`,'success');
  renderDailyTaskBoard();
}

function renderWater(){
  const cups=document.getElementById('waterCups');
  const label=document.getElementById('waterGoalText');
  if(!cups) return;
  cups.innerHTML=Array.from({length:WATER_GOAL},(_,i)=>`<div class="waterCup ${i<waterCount?'filled':''}"></div>`).join('');
  label.textContent=`今日 ${waterCount} / ${WATER_GOAL} 杯（${waterCount*250} ml / ${WATER_GOAL*250} ml）`;
}

function renderWaterHistory(){
  const list=document.getElementById('waterHistoryList');
  if(!list) return;
  if(!checkinHistory.water.length){
    list.innerHTML='<div class="checkinHistoryEmpty">目前還沒有喝水歷史紀錄</div>';
    return;
  }
  list.innerHTML=checkinHistory.water.map(item=>`
    <div class="checkinHistoryItem">
      <div class="checkinHistoryMain">💧 ${Number(item.cups||0)} / ${WATER_GOAL} 杯</div>
      <div class="checkinHistoryMeta">${formatDateDisplay(item.date,'未提供日期')}<br>${Number(item.cups||0)*250} ml</div>
    </div>
  `).join('');
}

/* ═══════════════════ 心情打卡 ═══════════════════ */
function initMoodUI(){
  const today = todayIso();
  const todayMood = checkinHistory.mood.find(item => item.date === today);
  document.querySelectorAll('.moodBtn').forEach(button => button.classList.remove('selected'));
  if(todayMood){
    document.getElementById('moodStatus').innerHTML=`📝 今日心情：<b>${todayMood.mood}</b>${todayMood.note ? ' · '+todayMood.note : ''}`;
    document.getElementById('moodNote').value = todayMood.note || '';
    const activeButton = Array.from(document.querySelectorAll('.moodBtn'))
      .find(button => button.textContent.includes(todayMood.mood));
    if(activeButton) activeButton.classList.add('selected');
    return;
  }
  document.getElementById('moodStatus').textContent='今日尚未打卡';
  document.getElementById('moodNote').value='';
}

async function setMood(emoji,label){
  document.querySelectorAll('.moodBtn').forEach(b=>b.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  const note=document.getElementById('moodNote')?.value||'';
  document.getElementById('moodStatus').innerHTML=`${emoji} 今日心情：<b>${label}</b>${note?' · '+note:''}`;
  if(currentUser){
    const result = await api('POST','/api/checkin/mood',{uid:currentUser.uid,date:todayIso(),mood:label,note});
    if(!result?.ok){ showToast(result?.error||'資料庫連線失敗，無法儲存心情打卡','error'); return; }
    await loadCheckinHistory();
  }
  showToast(`${emoji} 心情打卡成功！今日感覺「${label}」`,'success');
  renderDailyTaskBoard();
}

function updateDailySteps(){
  const input=document.getElementById('dailyStepInput');
  const value=Math.max(0, Number(input?.value||0));
  dailyTaskState.steps=value;
  saveDailyTaskState();
  renderDailyTaskBoard();
  showToast(`已更新今日步數：${value.toLocaleString()} 步`,'success');
}

function completeDailyLocationCheckin(){
  dailyTaskState.locationChecked=true;
  saveDailyTaskState();
  locateWarrior();
  renderDailyTaskBoard();
  showToast('今日地圖打卡完成，可返回領取任務獎勵','success');
}

async function claimDailyTask(taskId){
  const task=getDailyTasks().find(item=>item.id===taskId);
  if(!task) return;
  if(task.progress < task.goal){ showToast('任務尚未完成，還不能領取獎勵','error'); return; }
  if(dailyTaskState.claimed?.[taskId]){ showToast('這個任務今天已經領取過了','error'); return; }
  if(currentUser?.uid){
    const result=await api('POST', `/api/members/${currentUser.uid}/reward`, { xp: task.xp, coin: task.coin });
    if(!result?.ok){ showToast(result?.error||'資料庫連線失敗，無法發送獎勵','error'); return; }
  }
  dailyTaskState.claimed={ ...(dailyTaskState.claimed||{}), [taskId]: true };
  saveDailyTaskState();
  if(currentUser){
    currentUser.xp=Number(currentUser.xp||0)+task.xp;
    currentUser.coin=Number(currentUser.coin||0)+task.coin;
  }
  refreshHud();
  renderDailyTaskBoard();
  showToast(`完成「${task.title}」，獲得 ${task.xp} XP 與 ${task.coin} 顆鑽石！`,'success');
}

function renderMoodHistory(){
  const list=document.getElementById('moodHistoryList');
  if(!list) return;
  if(!checkinHistory.mood.length){
    list.innerHTML='<div class="checkinHistoryEmpty">目前還沒有心情歷史紀錄</div>';
    return;
  }
  list.innerHTML=checkinHistory.mood.map(item=>`
    <div class="checkinHistoryItem">
      <div class="checkinHistoryMain">😊 ${item.mood}</div>
      <div class="checkinHistoryMeta">${formatDateDisplay(item.date,'未提供日期')}${item.note ? `<br>${item.note}` : ''}</div>
    </div>
  `).join('');
}

/* ═══════════════════ 個人資料更新 (10%) ═══════════════════ */
function fillProfileForm(){
  const baseName = currentUser?.name || 'player';
  document.getElementById('updName').value = currentUser?.name || `${baseName}_demo`;
  document.getElementById('updEmail').value = currentUser?.email || `${baseName}@mail.com`;
  document.getElementById('updPhone').value = currentUser?.phone || '0912-345-678';
  document.getElementById('updCity').value = currentUser?.city || '台中市';
  document.getElementById('updBirthday').value = currentUser?.birthday ? String(currentUser.birthday).slice(0,10) : '2001-08-15';
  document.getElementById('updEmergency').value = currentUser?.emergency_contact || '王小明 / 0900-111-222';
  document.getElementById('updBio').value = currentUser?.bio || '喜歡參加環保與教育類活動，擅長活動紀錄與志工協作。';
  document.getElementById('updPass').value = '';
  document.getElementById('updPass2').value = '';
  showToast('已帶入更新資料，可直接儲存','success');
}

async function saveProfile(){
  const newName=document.getElementById('updName').value.trim();
  const newEmail=document.getElementById('updEmail').value.trim();
  const newPhone=document.getElementById('updPhone').value.trim();
  const newCity=document.getElementById('updCity').value.trim();
  const newBirthday=document.getElementById('updBirthday').value;
  const newEmergency=document.getElementById('updEmergency').value.trim();
  const newBio=document.getElementById('updBio').value.trim();
  const newPass=document.getElementById('updPass').value.trim();
  const newPass2=document.getElementById('updPass2').value.trim();
  if(!newName&&!newEmail&&!newPhone&&!newCity&&!newBirthday&&!newEmergency&&!newBio&&!newPass){ showToast('請填寫要更新的欄位','error'); return; }
  if(newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)){ showToast('Email 格式不正確','error'); return; }
  if(newPass&&newPass!==newPass2){ showToast('兩次密碼不一致','error'); return; }
  const data=await api('PUT',`/api/members/${currentUser.uid}`,{
    name:newName||undefined,
    email:newEmail||undefined,
    phone:newPhone||null,
    city:newCity||null,
    birthday:newBirthday||null,
    emergency_contact:newEmergency||null,
    bio:newBio||null,
    pass:newPass||undefined
  });
  if(!data?.ok){ showToast(data?.error||'資料庫連線失敗，無法更新真實會員資料','error'); return; }
  if(newName) currentUser.name=newName;
  if(newEmail) currentUser.email=newEmail;
  currentUser.phone=newPhone||'';
  currentUser.city=newCity||'';
  currentUser.birthday=newBirthday||'';
  currentUser.emergency_contact=newEmergency||'';
  currentUser.bio=newBio||'';
  if(newPass) currentUser.pass=newPass;
  fillProfileForm();
  if(warriorMarker){ warriorMarker.remove(); addWarriorMarker(); }
  refreshHud();
  showToast(data?.ok?'✅ 個人資料已同步至資料庫！':'✅ 個人資料更新成功！','success');
}

/* ═══════════════════ NPO ═══════════════════ */
function npoMyEvents(){
  return activeEvents.filter(e=>{
    if (currentUser?.npo_id && e.npo_id) return e.npo_id===currentUser.npo_id;
    return e.npo_name===currentUser?.npo_name;
  });
}

function npoTab(name,btn){
  document.querySelectorAll('#npoSidebar .aNavBtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#npoContent .aTab').forEach(t=>t.classList.remove('active'));
  document.getElementById('nTab-'+name).classList.add('active');
  const titles={overview:'📊 道館總覽',events:'⚔️ 活動管理',regs:'👥 報名名單',comments:'💬 活動留言'};
  document.getElementById('npoPageTitle').textContent=titles[name]||'';
}

function renderNpoEvents(){
  const mine=npoMyEvents();
  document.getElementById('npoStatEvents').textContent  =mine.length;
  document.getElementById('npoStatRegs').textContent    =mine.reduce((s,e)=>s+e.joined,0);
  document.getElementById('npoStatReward').textContent  =mine.reduce((s,e)=>s+(e.joined*e.reward),0);
  document.getElementById('npoStatComments').textContent=mine.reduce((s,e)=>s+(commentMap[e.eid]?.length||0),0);
  document.getElementById('npoEventBody').innerHTML=mine.length
    ?mine.map(ev=>{
        const col=ev.sdg_color||SDG_COLOR[ev.sdg_id]||'#7c3aed';
        const ico=ICON_MAP[ev.icon]||ev.icon||'🌟';
        return `<tr>
          <td>${ev.eid}</td><td>${ico} ${ev.name}</td><td>${ev.date}</td>
          <td><span class="sdgTag" style="background:${col}">SDG ${ev.sdg_id}</span></td>
          <td>${ev.joined}/${ev.quota}</td>
          <td><button class="aBtnDel" onclick="npoDeleteEvent('${ev.eid}')">下架</button></td>
        </tr>`;
      }).join('')
    :'<tr><td colspan="6" style="text-align:center;color:#64748b;padding:1.5rem">尚無活動</td></tr>';
}

async function npoDeleteEvent(eid){
  const result = await api('DELETE',`/api/events/${eid}`);
  if(result?.ok===false){ showToast(result.error||'下架失敗','error'); return; }
  activeEvents=activeEvents.filter(e=>e.eid!==eid);
  renderNpoEvents(); if(map) renderMarkers();
  showToast('活動已下架','success');
}

async function renderNpoRegs(){
  const mineEvents=npoMyEvents();
  const mineIds=mineEvents.map(e=>e.eid);
  const latestRows=registrationRows.length ? registrationRows : await loadRegistrations();
  const latestMineRows=latestRows.filter(row=>mineIds.includes(row.eid));
  renderRegistrationGroupCardsSafe(mineEvents, latestMineRows, 'npoRegGroups');
  const mine=npoMyEvents().map(e=>e.eid);
  const data=await api('GET','/api/registrations');
  const rowsSource=Array.isArray(data) ? data : [];
  const rows=rowsSource.filter(r=>mine.includes(r.eid));
  document.getElementById('npoRegBody').innerHTML=rows.length
    ?rows.map(r=>`<tr>
        <td>${r.rid}</td>
        <td>${r.event_name||r.eid}</td>
        <td>⚔️ ${r.member_name||r.uid}</td>
        <td>${r.reg_date||r.date}</td>
        <td><span style="color:var(--acc);font-size:.78rem;font-weight:700">✅ 已確認</span></td>
      </tr>`).join('')
    :'<tr><td colspan="5" style="text-align:center;color:#64748b;padding:1.5rem">尚無報名記錄</td></tr>';
}

async function populateNpoCommentSelect(){
  const sel=document.getElementById('npoCommentEid');
  if(!sel) return;
  const mine=npoMyEvents();
  sel.innerHTML=mine.map(e=>`<option value="${e.eid}">${e.eid} — ${e.name}</option>`).join('');
  loadNpoComments();
}

async function loadNpoComments(){
  const eid=document.getElementById('npoCommentEid')?.value;
  if(!eid) return;
  const list=await loadCommentsForEid(eid);
  document.getElementById('npoCommentList').innerHTML=list.length
    ?list.map((c,i)=>`<div class="commentItem">
        <span class="cUser">⚔️ ${c.name}</span>
        <span class="cTime">${formatDateTimeDisplay(c.created_at,'剛剛')}</span>
        <button class="cDel" onclick="npoDelComment('${eid}',${i},'${c.cid||''}')">🗑️</button>
        <div class="cText">${c.text}</div>
      </div>`).join('')
    :'<div style="text-align:center;color:#64748b;padding:1.5rem">尚無留言</div>';
}

async function npoDelComment(eid,idx,cid){
  if(cid){
    const result = await api('DELETE',`/api/comments/${cid}`);
    if(!result?.ok){ showToast(result?.error||'資料庫連線失敗，無法刪除留言','error'); return; }
  }
  if(!commentMap[eid]) commentMap[eid]=[];
  commentMap[eid].splice(idx,1);
  loadNpoComments();
  showToast('留言已刪除','success');
}

function showNpoAddModal(){ document.getElementById('npoAddModal').classList.remove('hidden'); }
function closeNpoModal()  { document.getElementById('npoAddModal').classList.add('hidden'); }

async function npoAddEvent(){
  const name=document.getElementById('npoEname').value.trim();
  const loc =document.getElementById('npoEloc').value.trim();
  const date=document.getElementById('npoEdate').value;
  const sdg =parseInt(document.getElementById('npoEsdg').value);
  const quota=parseInt(document.getElementById('npoEquota').value)||20;
  const reward=parseInt(document.getElementById('npoEreward').value)||60;
  const duration=document.getElementById('npoEduration').value.trim();
  const requirements=document.getElementById('npoErequirements').value.trim();
  const description=document.getElementById('npoEdesc').value.trim();
  if(!name||!loc||!date){ showToast('請填寫所有欄位','error'); return; }
  const eid=nextEventId();
  const geo=await geocodeAddress(loc);
  const icMap={3:'H',4:'B',11:'S',12:'R',13:'G',14:'W'};
  const newEv={eid,name,loc,date,sdg_id:sdg,sdg_color:SDG_COLOR[sdg]||'#7c3aed',sdg_name:SDG_NAME[sdg]||'',
    npo_name:currentUser.npo_name,quota,reward,joined:0,xp:Math.round(reward*1.5),icon:icMap[sdg]||'L',
    lat:geo?.lat ?? FCU_POS[0]+(Math.random()-.5)*.05,lng:geo?.lng ?? FCU_POS[1]+(Math.random()-.5)*.05,
    description:description||('由 '+currentUser.npo_name+' 主辦。'),
    requirements:requirements||'請洽主辦單位。',
    duration:duration||'詳見主辦公告',
    status:'active',
    npo_id:currentUser.npo_id||'NP01'};
  const result = await api('POST','/api/events',{...newEv,npo_id:currentUser.npo_id||'NP01',sdg_id:sdg});
  if(result?.ok===false){ showToast(result.error||'活動上架失敗','error'); return; }
  activeEvents.push(newEv);
  closeNpoModal(); renderNpoEvents(); if(map) renderMarkers();
  showToast('✅ 活動「'+name+'」上架成功！','success');
}

let npoChartsInit=false;
function initNpoCharts(){
  if(npoChartsInit) return; npoChartsInit=true;
  const mine=npoMyEvents();
  const base={responsive:true,maintainAspectRatio:false,
    plugins:{legend:{labels:{color:'#e2e8f0',font:{size:11}}}},
    scales:{x:{ticks:{color:'#64748b'},grid:{color:'rgba(255,255,255,.05)'}},y:{ticks:{color:'#64748b'},grid:{color:'rgba(255,255,255,.05)'}}}};
  new Chart(document.getElementById('npoRegChart'),{type:'bar',data:{
    labels:mine.map(e=>e.name.slice(0,6)),
    datasets:[{label:'報名人數',data:mine.map(e=>e.joined),backgroundColor:'rgba(16,185,129,.7)',borderRadius:6}]
  },options:{...base,plugins:{...base.plugins,legend:{display:false}}}});
  new Chart(document.getElementById('npoRateChart'),{type:'doughnut',data:{
    labels:mine.map(e=>e.name.slice(0,5)),
    datasets:[{data:mine.map(e=>Math.round(e.joined/e.quota*100)),
      backgroundColor:mine.map((_,i)=>['#10b981','#7c3aed','#f59e0b','#0a97d9'][i%4]),borderWidth:0}]
  },options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#e2e8f0',font:{size:11}}}}}});
}

/* ═══════════════════ 管理員 ═══════════════════ */
function adminTab(name,btn){
  document.querySelectorAll('#adminSidebar .aNavBtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#adminContent .aTab').forEach(t=>t.classList.remove('active'));
  document.getElementById('aTab-'+name).classList.add('active');
  const titles={overview:'📊 系統總覽',events:'🗺️ 活動管理',members:'👥 會員管理',comments:'💬 留言管理',archive:'🗃️ 資料典藏',analytics:'📈 數據分析'};
  document.getElementById('adminPageTitle').textContent=titles[name]||'';
  if(name==='archive'&&!archiveData) loadArchive(false);
  if(name==='analytics'&&!adminChartsInit) setTimeout(initAdminCharts,100);
}

function renderAdminEvents(){
  document.getElementById('adminEventBody').innerHTML=activeEvents.map(ev=>{
    const col=ev.sdg_color||SDG_COLOR[ev.sdg_id]||'#7c3aed';
    const ico=ICON_MAP[ev.icon]||ev.icon||'🌟';
    return `<tr>
      <td>${ev.eid}</td><td>${ico} ${ev.name}</td><td>${ev.loc}</td><td>${ev.date}</td>
      <td><span class="sdgTag" style="background:${col}">SDG ${ev.sdg_id}</span></td>
      <td><button class="aBtnDel" onclick="deleteAdminEvent('${ev.eid}')">刪除</button></td>
    </tr>`;
  }).join('');
  renderRegistrationGroupCardsSafe(activeEvents, registrationRows, 'adminRegGroups');
}

function renderAdminMembers(){
  const players = memberRows.filter(member => member.role==='user');
  const totalXp = players.reduce((sum, member) => sum + Number(member.xp || 0), 0);
  const totalCoin = players.reduce((sum, member) => sum + Number(member.coin || 0), 0);
  const totalRegs = players.reduce((sum, member) => sum + Number(member.reg_count || 0), 0);
  const activePlayers = players.filter(member => Number(member.reg_count || 0) > 0).length;
  document.getElementById('memberSummaryBoard').innerHTML = [
    ['全部玩家', players.length],
    ['活躍玩家', activePlayers],
    ['玩家總 XP', totalXp.toLocaleString()],
    ['玩家總硬幣', totalCoin.toLocaleString()],
  ].map(([label, value]) => `
    <div class="archiveCard">
      <div class="archiveCardLabel">${label}</div>
      <div class="archiveCardValue">${value}</div>
    </div>`).join('');
  document.getElementById('playerCount').textContent = players.length;
  document.getElementById('playerXpTotal').textContent = totalXp.toLocaleString();
  document.getElementById('playerCoinTotal').textContent = totalCoin.toLocaleString();
  document.getElementById('playerRegTotal').textContent = totalRegs.toLocaleString();

  const keyword=(document.getElementById('memberKeyword')?.value||'').trim().toLowerCase();
  const role=document.getElementById('memberRole')?.value||'';
  const rows=memberRows.filter(member=>{
    const hitKeyword=!keyword || member.uid.toLowerCase().includes(keyword) || member.name.toLowerCase().includes(keyword) || String(member.email||'').toLowerCase().includes(keyword);
    const hitRole=!role || member.role===role;
    return hitKeyword && hitRole;
  });
  document.getElementById('adminMemberBody').innerHTML=rows.length
    ?rows.map(member=>`<tr>
        <td>${member.uid}</td>
        <td>${member.name}<div style="font-size:.72rem;color:#94a3b8">${member.email||'—'}</div>${member.npo_name?`<div style="font-size:.72rem;color:#64748b">${member.npo_name}</div>`:''}</td>
        <td>${Number(member.xp||0).toLocaleString()}</td>
        <td>${Number(member.coin||0).toLocaleString()}</td>
        <td>${member.reg_count||0}</td>
      </tr>`).join('')
    :'<tr><td colspan="5" style="text-align:center;color:#64748b;padding:1.5rem">查無符合條件的會員</td></tr>';
}

async function loadArchive(showToastMessage){
  const data=await api('GET','/api/archive');
  if(!data||data.ok===false){
    if(showToastMessage) showToast(data?.error||'典藏快照讀取失敗','error');
    return;
  }
  archiveData=data;
  document.getElementById('archiveTimestamp').textContent=`快照時間：${(data.snapshot_time||'').replace('T',' ').slice(0,19)}`;
  document.getElementById('archiveSummary').innerHTML=[
    ['活動', data.summary?.events || 0],
    ['會員', data.summary?.members || 0],
    ['報名', data.summary?.regs || 0],
    ['留言', data.summary?.comments || 0],
  ].map(([label,value])=>`<div class="archiveCard"><div class="archiveCardLabel">${label}</div><div class="archiveCardValue">${value}</div></div>`).join('');
  document.getElementById('archiveEventList').innerHTML=`<div class="archiveList">${
    (data.events||[]).slice(0,6).map(event=>`
      <div class="archiveItem">
        <div class="archiveItemMain">${event.eid} · ${event.name}</div>
        <div class="archiveItemMeta">${event.date}<br>${event.npo_name||''}<br>報名 ${event.reg_count||0} · 留言 ${event.comment_count||0}</div>
      </div>`).join('')
  }</div>`;
  document.getElementById('archiveMemberList').innerHTML=`<div class="archiveList">${
    (data.members||[]).slice(0,6).map(member=>`
      <div class="archiveItem">
        <div class="archiveItemMain">${member.uid} · ${member.name}</div>
        <div class="archiveItemMeta">${member.role}<br>${member.city||'未填城市'} · XP ${member.xp}</div>
      </div>`).join('')
  }</div>`;
  if(showToastMessage) showToast('🗃️ 已重新擷取資料典藏快照','success');
}

async function restoreDemoState(){
  if(!confirm('這會把目前資料庫內容復原成示範初始狀態，確定要繼續嗎？')) return;
  const btn=document.getElementById('restoreDemoBtn');
  const originalLabel=btn?.textContent || '復原示範狀態';
  if(btn){
    btn.disabled=true;
    btn.textContent='還原中...';
  }
  const result=await api('POST','/api/admin/restore-demo',{});
  if(btn){
    btn.disabled=false;
    btn.textContent=originalLabel;
  }
  if(!result?.ok){
    showToast(result?.error||'示範資料復原失敗','error');
    return;
  }
  showToast('示範資料已復原，正在重新載入畫面','success');
  setTimeout(()=>window.location.reload(), 900);
}

async function deleteAdminEvent(eid){
  const result = await api('DELETE',`/api/events/${eid}`);
  if(result?.ok===false){ showToast(result.error||'刪除失敗','error'); return; }
  activeEvents=activeEvents.filter(e=>e.eid!==eid);
  renderAdminEvents(); if(map) renderMarkers();
  showToast('已刪除活動 '+eid,'success');
}

function showAddEventModal(){ document.getElementById('addEventModal').classList.remove('hidden'); }
function closeModal()        { document.getElementById('addEventModal').classList.add('hidden'); }

async function addEvent(){
  const name=document.getElementById('newEname').value.trim();
  const loc =document.getElementById('newEloc').value.trim();
  const date=document.getElementById('newEdate').value;
  const sdg =parseInt(document.getElementById('newEsdg').value);
  const quota=parseInt(document.getElementById('newEquota').value)||30;
  const reward=parseInt(document.getElementById('newEreward').value)||60;
  const duration=document.getElementById('newEduration').value.trim();
  const requirements=document.getElementById('newErequirements').value.trim();
  const description=document.getElementById('newEdesc').value.trim();
  if(!name||!loc||!date){ showToast('請填寫所有欄位','error'); return; }
  const eid=nextEventId();
  const geo=await geocodeAddress(loc);
  const newEv={eid,name,loc,date,sdg_id:sdg,sdg_color:SDG_COLOR[sdg]||'#7c3aed',sdg_name:SDG_NAME[sdg]||'',
    npo_name:'邁邁勇者平台',quota,joined:0,reward,xp:Math.round(reward*1.5),icon:'L',
    lat:geo?.lat ?? FCU_POS[0]+(Math.random()-.5)*.05,lng:geo?.lng ?? FCU_POS[1]+(Math.random()-.5)*.05,
    description:description||'管理員新增活動。',
    requirements:requirements||'請洽主辦單位。',
    duration:duration||'待定',
    status:'active',
    npo_id:'NP01'};
  const result = await api('POST','/api/events',{...newEv,npo_id:'NP01',sdg_id:sdg});
  if(result?.ok===false){ showToast(result.error||'活動新增失敗','error'); return; }
  activeEvents.push(newEv);
  closeModal(); renderAdminEvents(); if(map) renderMarkers();
  showToast('✅ 活動「'+name+'」已新增！','success');
}

async function renderAdminComments(){
  const data=await api('GET','/api/comments');
  const rows=Array.isArray(data) ? data : [];
  document.getElementById('adminCommentBody').innerHTML=rows.length
    ?rows.map(c=>`<tr>
        <td>${c.cid}</td>
        <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis">${c.event_name||c.eid}</td>
        <td>${c.name}</td>
        <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis">${c.text}${c.image_data?'<div style="font-size:.7rem;color:#a78bfa;margin-top:.25rem">📷 含照片</div>':''}<div style="font-size:.7rem;color:#f472b6;margin-top:.2rem">❤️ ${Number(c.like_count||0)}</div></td>
        <td>${formatDateTimeDisplay(c.created_at,'未提供時間')}</td>
        <td><button class="aBtnDel" onclick="delAdminComment(this,'${c.cid}')">刪除</button></td>
      </tr>`).join('')
    :'<tr><td colspan="6" style="text-align:center;color:#64748b;padding:1.5rem">無留言資料</td></tr>';
}

async function delAdminComment(btn,cid){
  const result=await api('DELETE',`/api/comments/${cid}`);
  if(!result?.ok){ showToast(result?.error||'刪除留言失敗','error'); return; }
  btn.closest('tr').remove();
  showToast('留言已刪除','success');
}

let adminChartsInit=false;
async function initAdminCharts(){
  if(adminChartsInit) return; adminChartsInit=true;
  const sum=await api('GET','/api/analytics/summary');
  const players = memberRows.filter(member => member.role==='user');
  const totalXp = players.reduce((acc, member) => acc + Number(member.xp || 0), 0);
  const totalRegs = players.reduce((acc, member) => acc + Number(member.reg_count || 0), 0);
  const activePlayers = players.filter(member => Number(member.reg_count || 0) > 0).length;
  if(sum && sum.ok!==false){
    document.getElementById('analyticsCommentCount').textContent=(Number(sum.comments||0)+Number(sum.likes||0)).toLocaleString();
    const roleMap=Object.fromEntries((sum.roleStats||[]).map(row=>[row.role,row.cnt]));
    document.getElementById('roleUserCount').textContent=roleMap.user || 0;
    document.getElementById('activePlayerCount').textContent=activePlayers;
    document.getElementById('avgXpCount').textContent=players.length ? Math.round(totalXp / players.length).toLocaleString() : '0';
  }
  const base={responsive:true,maintainAspectRatio:false,
    plugins:{legend:{labels:{color:'#e2e8f0',font:{size:11}}}},
    scales:{x:{ticks:{color:'#64748b'},grid:{color:'rgba(255,255,255,.05)'}},y:{ticks:{color:'#64748b'},grid:{color:'rgba(255,255,255,.05)'}}}};
  const trend=sum?.regTrend||[];
  const trendLabels=trend.map(r=>r.date.slice(5));
  const trendData=trend.map(r=>r.cnt);
  new Chart(document.getElementById('adminStepsChart'),{type:'line',data:{
    labels:trendLabels,
    datasets:[{label:'報名人數',data:trendData,
      borderColor:'#7c3aed',backgroundColor:'rgba(124,58,237,.15)',fill:true,tension:.4,pointBackgroundColor:'#a78bfa',pointRadius:4}]
  },options:{...base,plugins:{...base.plugins,legend:{display:false}}}});
  const sdg=sum?.sdgDist||[];
  const sdgLabels=sdg.map(s=>`SDG${s.sdg_id} ${s.name}`);
  const sdgData=sdg.map(s=>s.cnt);
  new Chart(document.getElementById('adminSdgChart'),{type:'doughnut',data:{
    labels:sdgLabels,
    datasets:[{data:sdgData,
      backgroundColor:['#4c9f38','#c5192d','#fd9d24','#bf8b2e','#3f7e44','#0a97d9'],borderWidth:0}]
  },options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#e2e8f0',font:{size:10}}}}}});
  const xpRank=sum?.topXp||[];
  const xpLabels=xpRank.map(m=>m.name);
  const xpData=xpRank.map(m=>m.xp);
  new Chart(document.getElementById('adminXpChart'),{type:'bar',data:{
    labels:xpLabels,
    datasets:[{label:'XP',data:xpData,
      backgroundColor:['#7c3aed','#10b981','#f59e0b','#06b6d4','#a78bfa','#34d399'],borderRadius:6}]
  },options:{...base,indexAxis:'y',plugins:{...base.plugins,legend:{display:false}}}});
  const memberRegRank = [...players]
    .sort((a,b)=>(Number(b.reg_count||0)-Number(a.reg_count||0)) || (Number(b.xp||0)-Number(a.xp||0)))
    .slice(0,6);
  const memberRegLabels=memberRegRank.map(member=>member.name);
  const memberRegData=memberRegRank.map(member=>member.reg_count||0);
  new Chart(document.getElementById('adminEsgChart'),{type:'bar',data:{
    labels:memberRegLabels,
    datasets:[{label:'報名次數',data:memberRegData,
      backgroundColor:'rgba(16,185,129,.7)',borderRadius:6}]
  },options:{...base,plugins:{...base.plugins,legend:{display:false}}}});
  const topEvents=sum?.topEvents||[];
  const topEventLabels=topEvents.map(event=>event.name.slice(0,8));
  const topEventData=topEvents.map(event=>event.joined);
  new Chart(document.getElementById('adminTopEventChart'),{type:'bar',data:{
    labels:topEventLabels,
    datasets:[{label:'報名人數',data:topEventData,backgroundColor:['#06b6d4','#f59e0b','#7c3aed','#10b981','#f97316','#38bdf8'],borderRadius:6}]
  },options:{...base,plugins:{...base.plugins,legend:{display:false}}}});
  const interactionStats=sum?.interactionStats||[];
  const interactionLabels=interactionStats.map(item=>item.name.slice(0,8));
  const interactionCommentData=interactionStats.map(item=>item.comments);
  const interactionLikeData=interactionStats.map(item=>item.likes);
  new Chart(document.getElementById('adminInteractionChart'),{type:'bar',data:{
    labels:interactionLabels,
    datasets:[
      {label:'留言',data:interactionCommentData,backgroundColor:'rgba(124,58,237,.7)',borderRadius:6},
      {label:'愛心',data:interactionLikeData,backgroundColor:'rgba(244,114,182,.7)',borderRadius:6}
    ]
  },options:{...base}});  
}

function fillDemoEventForm(target){
  const templates = {
    npo: {
      name: '銀髮數位陪伴工作坊',
      loc: '西屯區福星社區活動中心',
      date: '2026-09-18',
      sdg: '4',
      quota: '28',
      reward: '75',
      duration: '週五 14:00-17:00',
      requirements: '請自備手機或平板，建議穿著輕便服裝。',
      description: '由大學生志工陪伴銀髮族練習手機拍照、地圖導航與通訊軟體，方便快速建立一筆完整活動。',
    },
    admin: {
      name: '城市走讀與永續打卡日',
      loc: '台中國家歌劇院前廣場',
      date: '2026-09-25',
      sdg: '11',
      quota: '36',
      reward: '90',
      duration: '週六 09:30-12:30',
      requirements: '請攜帶可上網手機，方便現場任務打卡。',
      description: '帶領參與者走訪公共設施、完成導覽任務與 SDG 打卡，適合展示管理員新增活動與後續查詢分析。',
    },
  };
  const draft = templates[target];
  if(!draft) return;
  const prefix = target==='npo' ? 'npo' : 'new';
  document.getElementById(`${prefix}Ename`).value = draft.name;
  document.getElementById(`${prefix}Eloc`).value = draft.loc;
  document.getElementById(`${prefix}Edate`).value = draft.date;
  document.getElementById(`${prefix}Esdg`).value = draft.sdg;
  document.getElementById(`${prefix}Equota`).value = draft.quota;
  document.getElementById(`${prefix}Ereward`).value = draft.reward;
  document.getElementById(`${prefix}Eduration`).value = draft.duration;
  document.getElementById(`${prefix}Erequirements`).value = draft.requirements;
  document.getElementById(`${prefix}Edesc`).value = draft.description;
  showToast('已帶入活動資料，可直接送出或微調內容','success');
}

/* ═══════════════════ Toast ═══════════════════ */
function fillDemoEventForm(target){
  const templates = {
    npo: {
      name: '食物銀行物資發放志工招募',
      loc: '臺中市中區繼光里綠川西街135號10樓',
      date: '2026-09-18',
      sdg: '2',
      quota: '24',
      reward: '80',
      duration: '週五 14:00-17:00',
      requirements: '請穿著方便活動的服裝，協助物資整理、發放與現場引導。',
      description: '與台中市紅十字會合作辦理食物銀行物資發放服務，協助整理民生物資、核對發放名單，並陪伴有需要的家庭完成領取流程。',
    },
    admin: {
      name: '食物銀行物資發放志工招募',
      loc: '臺中市中區繼光里綠川西街135號10樓',
      date: '2026-09-18',
      sdg: '2',
      quota: '24',
      reward: '80',
      duration: '週五 14:00-17:00',
      requirements: '請穿著方便活動的服裝，協助物資整理、發放與現場引導。',
      description: '與台中市紅十字會合作辦理食物銀行物資發放服務，協助整理民生物資、核對發放名單，並陪伴有需要的家庭完成領取流程。',
    },
  };
  const draft = templates[target];
  if(!draft) return;
  const prefix = target==='npo' ? 'npo' : 'new';
  document.getElementById(`${prefix}Ename`).value = draft.name;
  document.getElementById(`${prefix}Eloc`).value = draft.loc;
  document.getElementById(`${prefix}Edate`).value = draft.date;
  document.getElementById(`${prefix}Esdg`).value = draft.sdg;
  document.getElementById(`${prefix}Equota`).value = draft.quota;
  document.getElementById(`${prefix}Ereward`).value = draft.reward;
  document.getElementById(`${prefix}Eduration`).value = draft.duration;
  document.getElementById(`${prefix}Erequirements`).value = draft.requirements;
  document.getElementById(`${prefix}Edesc`).value = draft.description;
  showToast('已帶入活動範例資料，可再微調後直接建立。','success');
}

(function(){
  const d=document.createElement('div'); d.id='toast';
  d.style.cssText='position:fixed;bottom:7.5rem;left:50%;transform:translateX(-50%) translateY(20px);z-index:9999;background:rgba(16,10,40,.92);border:1px solid rgba(124,58,237,.4);padding:.55rem 1.2rem;border-radius:20px;font-size:.85rem;font-weight:700;color:#e2e8f0;backdrop-filter:blur(12px);opacity:0;transition:all .35s cubic-bezier(.16,1,.3,1);pointer-events:none;white-space:nowrap;max-width:85vw;text-align:center;';
  document.body.appendChild(d);
})();

function showToast(msg,type){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.style.borderColor=type==='error'?'rgba(239,68,68,.5)':type==='success'?'rgba(16,185,129,.5)':'rgba(124,58,237,.4)';
  t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(0)';
  clearTimeout(t._to);
  t._to=setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(20px)'; },3000);
}

(async function initApp(){
  const ping = await api('GET','/api/ping');
  showDbBadge(Boolean(ping?.ok));
})();
