'use strict';

/* ═══════════════════ 資料 ═══════════════════ */
const FCU_POS = [24.1798, 120.6438]; // 逢甲大學（定位失敗時的預設位置）

const SDG_COLOR = {3:'#4c9f38',4:'#c5192d',11:'#fd9d24',12:'#bf8b2e',13:'#3f7e44',14:'#0a97d9'};
const SDG_NAME  = {3:'健康與福祉',4:'優質教育',11:'永續城市',12:'負責任消費',13:'氣候行動',14:'海洋生態'};

const EVENTS = [
  {eid:'E001',
   name:'清水濕地淨灘行動',
   loc:'清水濕地公園',
   date:'2026-07-15', endDate:'2026-07-15',
   sdg:14,
   lat:24.2730,lng:120.5612,
   npo:'台灣藍鵲茶生態 NPO',
   quota:30,joined:12,
   reward:80, xp:150,
   duration:'上午 09:00–12:00',
   desc:'一起走進清水濕地，清除海岸垃圾、調查海洋生物多樣性，由專業生態講師帶領解說在地濕地生態系統，讓公益行動結合環境教育。',
   requirements:'需自備水壺、防曬、手套（主辦可借用），年齡限制 12 歲以上。',
   icon:'🌊'},
  {eid:'E002',
   name:'醜蔬果創意料理工作坊',
   loc:'逢甲夜市廣場',
   date:'2026-08-03', endDate:'2026-08-03',
   sdg:12,
   lat:24.1802,lng:120.6429,
   npo:'惜食廚房協會',
   quota:20,joined:18,
   reward:60, xp:100,
   duration:'下午 14:00–17:00',
   desc:'外觀不完美卻富含營養的醜蔬果通常直接被丟棄，本工作坊教你用創意烹飪手法化廢為寶，實踐零浪費飲食生活。',
   requirements:'自行攜帶料理工具（主辦提供食材）。',
   icon:'🥘'},
  {eid:'E003',
   name:'偏鄉程式教育義教計畫',
   loc:'和平區學習中心',
   date:'2026-09-10', endDate:'2026-09-12',
   sdg:4,
   lat:24.3600,lng:121.0200,
   npo:'碼力無限 EdTech 協會',
   quota:15,joined:5,
   reward:120, xp:200,
   duration:'連續三天 09:00–17:00',
   desc:'深入山地原鄉提供程式設計課程，協助偏鄉學童接觸數位工具，培育未來科技人才，縮短城鄉教育落差。',
   requirements:'具備基礎程式教學能力，需自備個人筆電。',
   icon:'📖'},
  {eid:'E004',
   name:'低碳生活節能體驗講座',
   loc:'台中市政府廣場',
   date:'2026-10-20', endDate:'2026-10-20',
   sdg:13,
   lat:24.1633,lng:120.6474,
   npo:'綠境永續 Foundation',
   quota:50,joined:34,
   reward:50, xp:80,
   duration:'下午 13:30–16:30',
   desc:'透過互動展覽與專題演講，介紹台灣能源轉型現況、個人減碳足跡計算與節能家電選購指南，共同迎接淨零未來。',
   requirements:'無特殊限制，歡迎攜家帶眷參加。',
   icon:'🌿'},
  {eid:'E005',
   name:'廢電池回收日 × 環保市集',
   loc:'文心秀泰廣場',
   date:'2026-11-05', endDate:'2026-11-05',
   sdg:12,
   lat:24.1524,lng:120.6483,
   npo:'循環台灣基金會',
   quota:40,joined:22,
   reward:40, xp:60,
   duration:'全天 10:00–18:00',
   desc:'攜帶家中廢電池換取環保積點，同場加映二手物交換市集與資源回收手作體驗，讓循環經濟從日常生活出發。',
   requirements:'可攜帶舊電池、舊衣物、舊電子產品，無最低數量限制。',
   icon:'🔋'},
  {eid:'E006',
   name:'緊急救護 CPR＋AED 訓練',
   loc:'台中市紅十字會服務中心',
   date:'2026-07-20', endDate:'2026-07-20',
   sdg:3,
   lat:24.1531,lng:120.6713,
   npo:'台中市紅十字會',
   quota:25,joined:8,
   reward:90, xp:160,
   duration:'上午 09:00–12:00',
   desc:'學習心肺復甦術（CPR）與自動體外心臟去顫器（AED）操作，通過認證者可獲得紅十字會急救證書，提升社區救護能量。',
   requirements:'需年滿 16 歲，建議穿著方便活動之服裝。',
   icon:'🏥'},
  {eid:'E007',
   name:'災害防救志工培訓營',
   loc:'台中市紅十字會服務中心',
   date:'2026-08-15', endDate:'2026-08-16',
   sdg:11,
   lat:24.1531,lng:120.6713,
   npo:'台中市紅十字會',
   quota:30,joined:11,
   reward:100, xp:180,
   duration:'兩天 08:30–17:30',
   desc:'兩天全天培訓，涵蓋颱風水災應變、緊急避難所管理、心理救援技巧與物資調配，培育社區災防種子志工。',
   requirements:'需事先完成線上報名表，備妥個人健康聲明書。',
   icon:'🛡️'},
  {eid:'E008',
   name:'熱血台中 獻血公益日',
   loc:'台中市捐血中心（南屯）',
   date:'2026-09-05', endDate:'2026-09-05',
   sdg:3,
   lat:24.1415,lng:120.6488,
   npo:'台中市紅十字會',
   quota:100,joined:43,
   reward:70, xp:120,
   duration:'全天 09:00–17:00',
   desc:'與台中市捐血中心合作舉辦公益獻血日，完成捐血可獲得邁邁勇者紀念徽章與 XP 獎勵，讓愛心轉化為冒險動力！',
   requirements:'年滿 17 歲、體重 50kg 以上、近期身體健康無不適症狀。',
   icon:'❤️'},
];

const REGISTRATIONS = [
  {rid:'R001',uid:'U001',name:'user', eid:'E002',date:'2026-07-01'},
  {rid:'R002',uid:'U002',name:'Hua',  eid:'E001',date:'2026-07-02'},
  {rid:'R003',uid:'U002',name:'Hua',  eid:'E002',date:'2026-07-03'},
  {rid:'R004',uid:'U005',name:'豪傑', eid:'E006',date:'2026-07-05'},
  {rid:'R005',uid:'U001',name:'user', eid:'E007',date:'2026-07-10'},
];

const COMMENTS = {
  E001:[{uid:'U002',name:'Hua',  text:'活動很有意義！沿途撿了好多垃圾，下次一定再來！',time:'06/20 14:30'},
        {uid:'U005',name:'豪傑',text:'導覽老師超厲害，認識了好多濕地生物',time:'06/20 16:10'}],
  E002:[{uid:'U001',name:'user',text:'醜蔬果做出來的料理超好吃！完全不輸正品',time:'06/21 12:00'},
        {uid:'U004',name:'志明',text:'零浪費飲食真的可以實踐！推推推',time:'06/21 13:45'}],
  E006:[{uid:'U001',name:'user',text:'CPR 訓練非常扎實，老師很有耐心！',time:'06/22 11:30'}],
  E007:[],E008:[],E003:[],E004:[],E005:[]
};

const MEMBERS = [
  {uid:'U001',name:'user',  pass:'quest',   xp:1200,coin:500, role:'user'},
  {uid:'U002',name:'Hua',   pass:'hua123',  xp:3500,coin:1200,role:'user'},
  {uid:'N001',name:'npo',   pass:'npo123',  xp:0,   coin:0,   role:'npo', npoName:'台中市紅十字會'},
  {uid:'N002',name:'npo2',  pass:'npo2123', xp:0,   coin:0,   role:'npo', npoName:'惜食廚房協會'},
  {uid:'A001',name:'admin', pass:'admin123',xp:0,   coin:0,   role:'admin'},
];

let activeEvents = [...EVENTS];
let currentUser  = null;
let map          = null;
let warriorMarker= null;
let markers      = [];
let warriorPos   = [...FCU_POS];
let currentActEid= null; // 目前開啟的活動

/* ═══════════════════ 登入動畫 ═══════════════════ */
(function initLoginCanvas(){
  const canvas = document.getElementById('loginCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  const pts = Array.from({length:80},()=>({
    x:Math.random()*1400, y:Math.random()*900,
    r:Math.random()*.8+.3, vx:(Math.random()-.5)*.25,
    vy:(Math.random()-.5)*.25, a:Math.random()*Math.PI*2
  }));
  function resize(){ W=canvas.width=innerWidth; H=canvas.height=innerHeight; }
  resize(); window.addEventListener('resize',resize);
  function draw(){
    ctx.clearRect(0,0,W,H);
    pts.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.a+=.012;
      if(p.x<0)p.x=W; if(p.x>W)p.x=0;
      if(p.y<0)p.y=H; if(p.y>H)p.y=0;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(167,139,250,${.35+.35*Math.sin(p.a)})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ═══════════════════ 驗證 ═══════════════════ */
function switchAuth(tab){
  document.getElementById('formLogin').classList.toggle('hidden', tab!=='login');
  document.getElementById('formRegister').classList.toggle('hidden', tab!=='register');
  document.querySelectorAll('.authTab').forEach((b,i)=>{
    b.classList.toggle('active',(i===0&&tab==='login')||(i===1&&tab==='register'));
  });
}

function doLogin(){
  const name = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  const mem  = MEMBERS.find(m=>m.name===name && m.pass===pass);
  if(!mem){ showToast('帳號或密碼錯誤','error'); return; }
  currentUser = mem;
  if(mem.role==='admin')    enterAdmin();
  else if(mem.role==='npo') enterNpo();
  else                       enterUser();
}

function quickLogin(name, pass){
  document.getElementById('loginUser').value=name;
  document.getElementById('loginPass').value=pass;
  doLogin();
}

function doRegister(){
  const name  = document.getElementById('regUser').value.trim();
  const pass  = document.getElementById('regPass').value.trim();
  const pass2 = document.getElementById('regPass2').value.trim();
  if(!name||!pass){ showToast('請填寫所有欄位','error'); return; }
  if(pass!==pass2){ showToast('兩次密碼不一致','error'); return; }
  if(MEMBERS.find(m=>m.name===name)){ showToast('帳號已存在','error'); return; }
  const uid='U'+(100+MEMBERS.length);
  MEMBERS.push({uid,name,pass,xp:0,coin:0,role:'user'});
  showToast('🎉 帳號建立成功！','success');
  switchAuth('login');
  document.getElementById('loginUser').value=name;
  document.getElementById('loginPass').value=pass;
}

function enterUser(){
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('userApp').classList.remove('hidden');
  refreshHud();
  if(!map) setTimeout(initMap,100);
  setTimeout(()=>{ renderQuestList(); renderSearch(); initGeolocation(); initWaterUI(); }, 400);
}

function enterAdmin(){
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('adminApp').classList.remove('hidden');
  renderAdminEvents();
  renderAdminComments();
  setTimeout(initAdminCharts,300);
}

function enterNpo(){
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('npoApp').classList.remove('hidden');
  document.getElementById('npoWhoLabel').textContent='🏛️ '+(currentUser.npoName||'道館主');
  renderNpoEvents();
  renderNpoRegs();
  populateNpoCommentSelect();
  setTimeout(initNpoCharts,300);
}

function doLogout(){
  currentUser=null;
  ['userApp','adminApp','npoApp'].forEach(id=>document.getElementById(id).classList.add('hidden'));
  document.getElementById('loginScreen').classList.remove('hidden');
  document.querySelectorAll('.bottomSheet').forEach(s=>s.classList.remove('open'));
  showToast('已登出','');
}

function refreshHud(){
  if(!currentUser) return;
  document.getElementById('hudUsername').textContent = currentUser.name;
  document.getElementById('profileName').textContent = currentUser.name;
  document.getElementById('profileUid').textContent  = 'UID · '+currentUser.uid;
  document.getElementById('hudCoin').textContent     = currentUser.coin;
  document.getElementById('hudXpText').textContent   = currentUser.xp+' XP';
  const pct = Math.min(100, (currentUser.xp%1000)/10);
  document.getElementById('hudXpFill').style.width   = pct+'%';
  document.getElementById('infoName').textContent    = currentUser.name;
  document.getElementById('infoXp').textContent      = currentUser.xp.toLocaleString()+' XP';
  document.getElementById('infoCoin').textContent    = '💎 '+currentUser.coin;
}

/* ═══════════════════ 地圖指標 CSS（注入） ═══════════════════ */
(function injectMarkerCSS(){
  const s=document.createElement('style');
  s.textContent=`
  /* 道館指標 */
  .gymPin{position:relative;text-align:center;cursor:pointer;}
  .gymTop{width:44px;height:44px;border-radius:50%;background:var(--c,#7c3aed);border:2px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-size:1.3rem;box-shadow:0 0 14px var(--c,#7c3aed),0 4px 12px rgba(0,0,0,.6);transition:transform .2s;}
  .gymPin:hover .gymTop{transform:scale(1.15) translateY(-3px);}
  .gymLabel{font-size:.58rem;font-weight:800;color:rgba(255,255,255,.9);text-align:center;margin-top:2px;text-shadow:0 1px 4px rgba(0,0,0,.8);white-space:nowrap;overflow:hidden;max-width:54px;}
  .gymPulse{width:20px;height:6px;background:var(--c,#7c3aed);border-radius:50%;margin:2px auto 0;filter:blur(3px);opacity:.7;animation:gPulse 2s ease-in-out infinite;}
  @keyframes gPulse{0%,100%{opacity:.5;transform:scaleX(1);}50%{opacity:1;transform:scaleX(1.2);}}
  /* 勇者指標 */
  .wMarker{position:relative;width:70px;text-align:center;cursor:default;}
  .wScan{position:absolute;top:38%;left:50%;width:60px;height:60px;border-radius:50%;transform:translate(-50%,-50%);border:2px solid rgba(124,58,237,.7);animation:wScanAnim 3s ease-out infinite;pointer-events:none;}
  .wScan.s2{animation-delay:1s;border-color:rgba(16,185,129,.5);}
  .wScan.s3{animation-delay:2s;border-color:rgba(124,58,237,.35);}
  @keyframes wScanAnim{0%{transform:translate(-50%,-50%) scale(.4);opacity:.9;}100%{transform:translate(-50%,-50%) scale(5.5);opacity:0;}}
  .wGlow{position:absolute;top:38%;left:50%;transform:translate(-50%,-50%);width:56px;height:56px;border-radius:50%;background:radial-gradient(circle,rgba(124,58,237,.55) 0%,transparent 70%);animation:wPulseAnim 2s ease-in-out infinite;}
  @keyframes wPulseAnim{0%,100%{opacity:.6;transform:translate(-50%,-50%) scale(1);}50%{opacity:1;transform:translate(-50%,-50%) scale(1.2);}}
  .wEmoji{font-size:2.4rem;display:block;filter:drop-shadow(0 0 10px rgba(124,58,237,.9));animation:wFloat 2.5s ease-in-out infinite;position:relative;z-index:2;}
  @keyframes wFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-7px);}}
  .wLabel{font-size:.62rem;font-weight:900;color:var(--priL,#a78bfa);background:rgba(8,5,26,.75);border-radius:8px;padding:1px 6px;margin-top:2px;display:inline-block;border:1px solid rgba(124,58,237,.3);}
  .wShad{width:24px;height:6px;background:rgba(0,0,0,.5);border-radius:50%;margin:2px auto 0;filter:blur(3px);}
  `;
  document.head.appendChild(s);
})();

/* ═══════════════════ GPS 定位 ═══════════════════ */
let geoWatchId = null;

function initGeolocation(){
  const badge = document.getElementById('gpsStatus');
  if(!navigator.geolocation){
    badge.textContent='⚠️ 定位不支援，已鎖定逢甲大學';
    badge.classList.add('show');
    setTimeout(()=>badge.classList.remove('show'),3000);
    return;
  }
  badge.textContent='📡 正在定位...'; badge.classList.add('show');
  navigator.geolocation.getCurrentPosition(
    pos=>{
      warriorPos=[pos.coords.latitude,pos.coords.longitude];
      if(warriorMarker) warriorMarker.setLatLng(warriorPos);
      if(map) map.setView(warriorPos,map.getZoom());
      badge.textContent=`✅ 已定位（精度 ${pos.coords.accuracy.toFixed(0)}m）`;
      setTimeout(()=>badge.classList.remove('show'),3000);
      geoWatchId=navigator.geolocation.watchPosition(
        p=>{ warriorPos=[p.coords.latitude,p.coords.longitude]; if(warriorMarker) warriorMarker.setLatLng(warriorPos); },
        ()=>{},{enableHighAccuracy:true,maximumAge:5000}
      );
    },
    ()=>{
      warriorPos=[...FCU_POS];
      badge.textContent='📍 已鎖定逢甲大學';
      setTimeout(()=>badge.classList.remove('show'),3000);
    },
    {enableHighAccuracy:true,timeout:10000}
  );
}

/* ═══════════════════ 地圖 ═══════════════════ */
function initMap(){
  map=L.map('gameMap',{zoomControl:false,attributionControl:false}).setView(warriorPos,15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  L.control.zoom({position:'topright'}).addTo(map);
  addWarriorMarker();
  renderMarkers();
}

function addWarriorMarker(){
  const name = currentUser?.name||'勇者';
  const icon=L.divIcon({
    className:'',
    html:`<div class="wMarker">
      <div class="wScan s1"></div><div class="wScan s2"></div><div class="wScan s3"></div>
      <div class="wGlow"></div>
      <span class="wEmoji">🧙</span>
      <div class="wLabel">${name}</div>
      <div class="wShad"></div>
    </div>`,
    iconSize:[70,90], iconAnchor:[35,80]
  });
  warriorMarker=L.marker(warriorPos,{icon,zIndexOffset:1000,interactive:false}).addTo(map);
}

function renderMarkers(){
  markers.forEach(m=>m.remove()); markers=[];
  activeEvents.forEach(ev=>{
    const col=SDG_COLOR[ev.sdg]||'#7c3aed';
    const icon=L.divIcon({
      className:'',
      html:`<div class="gymPin" style="--c:${col}">
        <div class="gymTop">${ev.icon}</div>
        <div class="gymLabel">${ev.name.slice(0,5)}</div>
        <div class="gymPulse"></div>
      </div>`,
      iconSize:[54,68], iconAnchor:[27,68]
    });
    const m=L.marker([ev.lat,ev.lng],{icon}).addTo(map);
    m.on('click',()=>openActivityPanel(ev.eid));
    markers.push(m);
  });
}

function locateWarrior(){
  if(map) map.flyTo(warriorPos,15,{duration:.8});
}

/* ═══════════════════ 面板切換 ═══════════════════ */
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

function closeAllPanels(resetDock){
  document.querySelectorAll('.bottomSheet').forEach(s=>s.classList.remove('open'));
  openPanelId=null;
  if(resetDock!==false){
    document.querySelectorAll('.dockBtn').forEach(b=>b.classList.remove('active'));
    document.querySelector('.dockBtn[data-panel="map"]').classList.add('active');
  }
}

/* ═══════════════════ 活動詳細面板 ═══════════════════ */
function openActivityPanel(eid){
  const ev=activeEvents.find(e=>e.eid===eid);
  if(!ev) return;
  currentActEid=eid;
  closeAllPanels(false);
  const col=SDG_COLOR[ev.sdg]||'#7c3aed';
  const pct=Math.round(ev.joined/ev.quota*100);
  const full=ev.joined>=ev.quota;

  document.getElementById('activityContent').innerHTML=`
    <div class="adHeader">
      <div class="adIcon">${ev.icon}</div>
      <div style="flex:1">
        <div class="adTitle">${ev.name}</div>
        <span class="adSdg" style="background:${col}">SDG ${ev.sdg} · ${SDG_NAME[ev.sdg]||''}</span>
      </div>
    </div>
    <div class="adDetails">
      <div class="adDetail"><div class="adDetailLabel">📍 地點</div><div class="adDetailVal">${ev.loc}</div></div>
      <div class="adDetail"><div class="adDetailLabel">📅 日期</div><div class="adDetailVal">${ev.date}${ev.endDate&&ev.endDate!==ev.date?' ~ '+ev.endDate:''}</div></div>
      <div class="adDetail"><div class="adDetailLabel">⏰ 時間</div><div class="adDetailVal">${ev.duration}</div></div>
      <div class="adDetail"><div class="adDetailLabel">🏛️ 主辦 NPO</div><div class="adDetailVal">${ev.npo}</div></div>
      <div class="adDetail"><div class="adDetailLabel">💎 硬幣獎勵</div><div class="adDetailVal">${ev.reward} 枚</div></div>
      <div class="adDetail"><div class="adDetailLabel">⭐ 經驗值</div><div class="adDetailVal">+${ev.xp} XP</div></div>
    </div>
    <div class="adDesc">
      <div class="adDescLabel">📋 活動說明</div>
      <div class="adDescText">${ev.desc}</div>
    </div>
    <div class="adDesc" style="margin-top:.5rem">
      <div class="adDescLabel">📌 注意事項</div>
      <div class="adDescText">${ev.requirements}</div>
    </div>
    <div class="adProgress">
      <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:.3rem">
        <span>👥 報名進度</span>
        <span style="color:${full?'var(--red)':'var(--acc)'}">${ev.joined}/${ev.quota} 人${full?' (已額滿)':''}</span>
      </div>
      <div class="adProgressBar">
        <div class="adProgressFill" style="width:${pct}%;background:${full?'var(--red)':col}"></div>
      </div>
    </div>
    <div class="adActions">
      ${full
        ? `<button class="btnJoin" style="background:#374151;cursor:not-allowed" disabled>❌ 名額已滿</button>`
        : `<button class="btnJoin" onclick="joinEvent('${ev.eid}')">⚔️ 立即報名</button>`}
      <button class="btnShare" onclick="closeAllPanels()">✕</button>
    </div>
  `;
  loadActComments(eid);
  document.getElementById('activityPanel').classList.add('open');
  openPanelId='activityPanel';
  if(map) map.flyTo([ev.lat,ev.lng],16,{duration:.7});
}

function loadActComments(eid){
  const list=COMMENTS[eid]||[];
  document.getElementById('actCommentList').innerHTML=list.length
    ? list.map((c,i)=>{
        const isOwn=currentUser&&(c.uid===currentUser.uid||c.name===currentUser.name);
        return `<div class="commentItem">
          <span class="cUser">⚔️ ${c.name}</span><span class="cTime">${c.time}</span>
          ${isOwn?`<button class="cDel" onclick="deleteActComment('${eid}',${i})">🗑️</button>`:''}
          <div class="cText">${c.text}</div>
        </div>`;
      }).join('')
    : '<div style="text-align:center;color:#64748b;padding:1rem">尚無留言，第一個留下心得吧！</div>';
}

function sendActComment(){
  const txt=document.getElementById('actCommentInput').value.trim();
  if(!txt){ showToast('請輸入留言','error'); return; }
  if(!COMMENTS[currentActEid]) COMMENTS[currentActEid]=[];
  const now=new Date();
  const t=`${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  COMMENTS[currentActEid].unshift({uid:currentUser?.uid||'U001',name:currentUser?.name||'勇者',text:txt,time:t});
  document.getElementById('actCommentInput').value='';
  loadActComments(currentActEid);
  showToast('💬 留言已送出！','success');
}

function deleteActComment(eid,idx){
  if(COMMENTS[eid]) COMMENTS[eid].splice(idx,1);
  loadActComments(eid);
  showToast('留言已刪除','success');
}

function joinEvent(eid){
  const ev=activeEvents.find(e=>e.eid===eid);
  if(!ev) return;
  ev.joined=Math.min(ev.joined+1,ev.quota);
  if(currentUser){ currentUser.xp+=ev.xp; currentUser.coin+=ev.reward; }
  refreshHud();
  showToast(`🎉 成功報名「${ev.name}」！ +${ev.xp} XP、+${ev.reward} 💎`,'success');
  openActivityPanel(eid); // 重新渲染
}

/* ═══════════════════ 探索搜尋 ═══════════════════ */
function renderSearch(){
  const sdg=document.getElementById('fSdg')?.value||'';
  const s=document.getElementById('fStart')?.value||'';
  const e=document.getElementById('fEnd')?.value||'';
  const res=activeEvents.filter(ev=>{
    if(sdg&&ev.sdg!=sdg) return false;
    if(s&&ev.date<s) return false;
    if(e&&ev.date>e) return false;
    return true;
  });
  const col=id=>SDG_COLOR[id]||'#7c3aed';
  document.getElementById('searchResults').innerHTML=res.length
    ? res.map(ev=>`
      <div class="srCard" onclick="openActivityPanel('${ev.eid}')">
        <div class="srPin" style="background:${col(ev.sdg)}20;border:2px solid ${col(ev.sdg)}">${ev.icon}</div>
        <div class="srInfo">
          <div class="srName">${ev.name}</div>
          <div class="srMeta">📍 ${ev.loc} · 📅 ${ev.date}
            · <span class="sdgTag" style="background:${col(ev.sdg)}">SDG ${ev.sdg}</span>
            · <b style="color:#f59e0b">+${ev.xp} XP</b>
          </div>
        </div>
        <div style="color:#64748b">›</div>
      </div>`).join('')
    : '<div style="text-align:center;color:#64748b;padding:2rem">找不到符合的任務</div>';
}

function applyFilter(){ renderSearch(); }

/* ═══════════════════ 任務列表 ═══════════════════ */
function renderQuestList(){
  document.getElementById('questList').innerHTML=activeEvents.map((ev,i)=>{
    const col=SDG_COLOR[ev.sdg]||'#7c3aed';
    const pct=Math.round(ev.joined/ev.quota*100);
    return `<div class="questCard" onclick="openActivityPanel('${ev.eid}')" style="animation:slideUp .3s ${i*.06}s both">
      <div class="questPin">${ev.icon}</div>
      <div style="flex:1">
        <div class="questName">${ev.name}</div>
        <div class="questMeta">📍 ${ev.loc} | 📅 ${ev.date}
          <span class="sdgTag" style="background:${col};margin-left:.3rem">SDG ${ev.sdg}</span>
        </div>
        <div style="margin-top:.4rem;background:#100c28;border-radius:4px;height:5px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${col};border-radius:4px;transition:width .6s .1s"></div>
        </div>
        <div style="font-size:.7rem;color:#64748b;margin-top:.2rem">${ev.joined}/${ev.quota} 人 · 💎 ${ev.reward} · ⭐ +${ev.xp} XP</div>
      </div>
    </div>`;
  }).join('');
}

/* ═══════════════════ 喝水打卡 ═══════════════════ */
let waterCount=0;
const WATER_GOAL=8;

function initWaterUI(){ waterCount=0; renderWater(); }

function addWater(){
  if(waterCount>=WATER_GOAL){ showToast('🎉 今日喝水目標已達成！','success'); return; }
  waterCount++;
  renderWater();
  document.getElementById('waterPct').textContent=Math.round(waterCount/WATER_GOAL*100)+'%';
  if(waterCount===WATER_GOAL) showToast('🏆 恭喜！今日喝水目標達成！','success');
  else showToast(`💧 已喝 ${waterCount} 杯（${waterCount*250} ml）`,'success');
}

function renderWater(){
  const cups=document.getElementById('waterCups');
  const label=document.getElementById('waterGoalText');
  if(!cups) return;
  cups.innerHTML=Array.from({length:WATER_GOAL},(_,i)=>
    `<div class="waterCup ${i<waterCount?'filled':''}"></div>`
  ).join('');
  label.textContent=`今日 ${waterCount} / ${WATER_GOAL} 杯（${waterCount*250} ml / ${WATER_GOAL*250} ml）`;
}

/* ═══════════════════ 心情打卡 ═══════════════════ */
function setMood(emoji,label){
  document.querySelectorAll('.moodBtn').forEach(b=>b.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  const note=document.getElementById('moodNote')?.value||'';
  document.getElementById('moodStatus').innerHTML=`${emoji} 今日心情：<b>${label}</b>${note?' · '+note:''}`;
  showToast(`${emoji} 心情打卡成功！今日感覺「${label}」`,'success');
}

/* ═══════════════════ 個人資料更新（10%） ═══════════════════ */
function saveProfile(){
  const newName=document.getElementById('updName').value.trim();
  const newPass=document.getElementById('updPass').value.trim();
  const newPass2=document.getElementById('updPass2').value.trim();
  if(!newName&&!newPass){ showToast('請填寫要更新的欄位','error'); return; }
  if(newPass&&newPass!==newPass2){ showToast('兩次密碼不一致','error'); return; }
  const mem=MEMBERS.find(m=>m.uid===currentUser?.uid);
  if(!mem) return;
  if(newName){ mem.name=newName; currentUser.name=newName; }
  if(newPass){ mem.pass=newPass; currentUser.pass=newPass; }
  document.getElementById('updName').value='';
  document.getElementById('updPass').value='';
  document.getElementById('updPass2').value='';
  // 更新勇者 marker 標籤
  if(warriorMarker){
    warriorMarker.remove();
    addWarriorMarker();
  }
  refreshHud();
  showToast('✅ 個人資料更新成功！','success');
}

/* ═══════════════════ 道館主（NPO）功能 ═══════════════════ */
function npoMyEvents(){
  return activeEvents.filter(e=>e.npo===currentUser?.npoName);
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
  document.getElementById('npoStatEvents').textContent=mine.length;
  document.getElementById('npoStatRegs').textContent=mine.reduce((s,e)=>s+e.joined,0);
  document.getElementById('npoStatReward').textContent=mine.reduce((s,e)=>s+(e.joined*e.reward),0);
  document.getElementById('npoStatComments').textContent=mine.reduce((s,e)=>s+(COMMENTS[e.eid]?.length||0),0);
  const col=id=>SDG_COLOR[id]||'#7c3aed';
  document.getElementById('npoEventBody').innerHTML=mine.length
    ? mine.map(ev=>`<tr>
        <td>${ev.eid}</td><td>${ev.icon} ${ev.name}</td><td>${ev.date}</td>
        <td><span class="sdgTag" style="background:${col(ev.sdg)}">SDG ${ev.sdg}</span></td>
        <td>${ev.joined}/${ev.quota}</td>
        <td><button class="aBtnDel" onclick="npoDeleteEvent('${ev.eid}')">下架</button></td>
      </tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:1.5rem">尚無活動</td></tr>';
}

function npoDeleteEvent(eid){
  activeEvents=activeEvents.filter(e=>e.eid!==eid);
  renderNpoEvents();
  if(map) renderMarkers();
  showToast('活動已下架','success');
}

function renderNpoRegs(){
  const mine=npoMyEvents().map(e=>e.eid);
  const list=REGISTRATIONS.filter(r=>mine.includes(r.eid));
  document.getElementById('npoRegBody').innerHTML=list.length
    ? list.map(r=>`<tr>
        <td>${r.rid}</td>
        <td>${activeEvents.find(e=>e.eid===r.eid)?.name||r.eid}</td>
        <td>⚔️ ${r.name}</td><td>${r.date}</td>
        <td><span style="color:var(--acc);font-size:.78rem;font-weight:700">✅ 已報名</span></td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#64748b;padding:1.5rem">尚無報名記錄</td></tr>';
}

function populateNpoCommentSelect(){
  const sel=document.getElementById('npoCommentEid');
  if(!sel) return;
  const mine=npoMyEvents();
  sel.innerHTML=mine.map(e=>`<option value="${e.eid}">${e.eid} — ${e.name}</option>`).join('');
  loadNpoComments();
}

function loadNpoComments(){
  const eid=document.getElementById('npoCommentEid')?.value;
  if(!eid) return;
  const list=COMMENTS[eid]||[];
  document.getElementById('npoCommentList').innerHTML=list.length
    ? list.map((c,i)=>`<div class="commentItem">
        <span class="cUser">⚔️ ${c.name}</span><span class="cTime">${c.time}</span>
        <button class="cDel" onclick="npoDelComment('${eid}',${i})">🗑️</button>
        <div class="cText">${c.text}</div>
      </div>`).join('')
    : '<div style="text-align:center;color:#64748b;padding:1.5rem">尚無留言</div>';
}

function npoDelComment(eid,idx){
  if(COMMENTS[eid]) COMMENTS[eid].splice(idx,1);
  loadNpoComments();
  showToast('留言已刪除','success');
}

function showNpoAddModal(){ document.getElementById('npoAddModal').classList.remove('hidden'); }
function closeNpoModal(){ document.getElementById('npoAddModal').classList.add('hidden'); }

function npoAddEvent(){
  const name=document.getElementById('npoEname').value.trim();
  const loc =document.getElementById('npoEloc').value.trim();
  const date=document.getElementById('npoEdate').value;
  const sdg =parseInt(document.getElementById('npoEsdg').value);
  const quota=parseInt(document.getElementById('npoEquota').value)||20;
  const reward=parseInt(document.getElementById('npoEreward').value)||60;
  if(!name||!loc||!date){ showToast('請填寫所有欄位','error'); return; }
  const eid='E'+(100+activeEvents.length+1);
  const icons={3:'🏥',4:'📖',11:'🏙️',12:'♻️',13:'🌿',14:'🌊'};
  activeEvents.push({eid,name,loc,date,endDate:date,sdg,quota,reward,joined:0,xp:Math.round(reward*1.5),
    npo:currentUser.npoName,icon:icons[sdg]||'⚔️',
    lat:FCU_POS[0]+(Math.random()-.5)*.05,lng:FCU_POS[1]+(Math.random()-.5)*.05,
    desc:'由 '+currentUser.npoName+' 主辦，詳情請洽主辦單位。',
    requirements:'請事先確認主辦單位公告。',duration:'詳見主辦公告'});
  closeNpoModal();
  renderNpoEvents();
  if(map) renderMarkers();
  showToast('✅ 活動「'+name+'」上架成功！','success');
}

let npoChartsInit=false;
function initNpoCharts(){
  if(npoChartsInit) return; npoChartsInit=true;
  const mine=npoMyEvents();
  const base={responsive:true,maintainAspectRatio:true,
    plugins:{legend:{labels:{color:'#e2e8f0',font:{size:11}}}},
    scales:{x:{ticks:{color:'#64748b'},grid:{color:'rgba(255,255,255,.05)'}},
            y:{ticks:{color:'#64748b'},grid:{color:'rgba(255,255,255,.05)'}}}};
  new Chart(document.getElementById('npoRegChart'),{type:'bar',data:{
    labels:mine.map(e=>e.name.slice(0,6)),
    datasets:[{label:'報名人數',data:mine.map(e=>e.joined),backgroundColor:'rgba(16,185,129,.7)',borderRadius:6}]
  },options:{...base,plugins:{...base.plugins,legend:{display:false}}}});
  new Chart(document.getElementById('npoRateChart'),{type:'doughnut',data:{
    labels:mine.map(e=>e.name.slice(0,5)),
    datasets:[{data:mine.map(e=>Math.round(e.joined/e.quota*100)),
      backgroundColor:mine.map((_,i)=>['#10b981','#7c3aed','#f59e0b','#0a97d9'][i%4]),borderWidth:0}]
  },options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{position:'bottom',labels:{color:'#e2e8f0',font:{size:11}}}}}});
}

/* ═══════════════════ 管理員功能 ═══════════════════ */
function adminTab(name,btn){
  document.querySelectorAll('.aNavBtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.aTab').forEach(t=>t.classList.remove('active'));
  document.getElementById('aTab-'+name).classList.add('active');
  const titles={overview:'📊 系統總覽',events:'🗺️ 活動管理',members:'👥 會員管理',comments:'💬 留言管理',analytics:'📈 數據分析'};
  document.getElementById('adminPageTitle').textContent=titles[name]||'';
  if(name==='analytics'&&!adminChartsInit) setTimeout(initAdminCharts,100);
}

function renderAdminEvents(){
  const col=id=>SDG_COLOR[id]||'#7c3aed';
  document.getElementById('adminEventBody').innerHTML=activeEvents.map(ev=>`
    <tr>
      <td>${ev.eid}</td><td>${ev.icon} ${ev.name}</td><td>${ev.loc}</td><td>${ev.date}</td>
      <td><span class="sdgTag" style="background:${col(ev.sdg)}">SDG ${ev.sdg}</span></td>
      <td><button class="aBtnDel" onclick="deleteAdminEvent('${ev.eid}')">刪除</button></td>
    </tr>`).join('');
}

function deleteAdminEvent(eid){
  activeEvents=activeEvents.filter(e=>e.eid!==eid);
  renderAdminEvents();
  if(map) renderMarkers();
  showToast('已刪除活動 '+eid,'success');
}

function showAddEventModal(){ document.getElementById('addEventModal').classList.remove('hidden'); }
function closeModal(){ document.getElementById('addEventModal').classList.add('hidden'); }

function addEvent(){
  const name=document.getElementById('newEname').value.trim();
  const loc =document.getElementById('newEloc').value.trim();
  const date=document.getElementById('newEdate').value;
  const sdg =parseInt(document.getElementById('newEsdg').value);
  if(!name||!loc||!date){ showToast('請填寫所有欄位','error'); return; }
  const eid='E'+(100+activeEvents.length+1);
  activeEvents.push({eid,name,loc,date,endDate:date,sdg,
    lat:FCU_POS[0]+(Math.random()-.5)*.05,lng:FCU_POS[1]+(Math.random()-.5)*.05,
    npo:'邁邁勇者平台',quota:30,joined:0,reward:60,xp:90,icon:'🌟',
    desc:'管理員新增活動。',requirements:'請洽主辦單位。',duration:'待定'});
  closeModal();
  renderAdminEvents();
  if(map) renderMarkers();
  showToast('✅ 活動「'+name+'」已新增！','success');
}

function renderAdminComments(){
  const rows=[]; let id=1;
  Object.entries(COMMENTS).forEach(([eid,list])=>{
    list.forEach(c=>{
      rows.push(`<tr>
        <td>M${id++}</td><td>${eid}</td><td>${c.name}</td>
        <td style="max-width:200px">${c.text}</td><td>${c.time}</td>
        <td><button class="aBtnDel" onclick="delAdminComment(this,'${eid}','${c.time}')">刪除</button></td>
      </tr>`);
    });
  });
  document.getElementById('adminCommentBody').innerHTML=rows.join('')||
    '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:1.5rem">無留言資料</td></tr>';
}

function delAdminComment(btn,eid,time){
  if(COMMENTS[eid]) COMMENTS[eid]=COMMENTS[eid].filter(c=>c.time!==time);
  btn.closest('tr').remove();
  showToast('留言已刪除','success');
}

let adminChartsInit=false;
function initAdminCharts(){
  if(adminChartsInit) return; adminChartsInit=true;
  const base={responsive:true,maintainAspectRatio:true,
    plugins:{legend:{labels:{color:'#e2e8f0',font:{size:11}}}},
    scales:{x:{ticks:{color:'#64748b'},grid:{color:'rgba(255,255,255,.05)'}},
            y:{ticks:{color:'#64748b'},grid:{color:'rgba(255,255,255,.05)'}}}};
  new Chart(document.getElementById('adminStepsChart'),{type:'line',data:{
    labels:['週一','週二','週三','週四','週五','週六','週日'],
    datasets:[{label:'步數',data:[6200,7800,5400,9100,8300,11200,7842],borderColor:'#7c3aed',backgroundColor:'rgba(124,58,237,.15)',fill:true,tension:.4,pointBackgroundColor:'#a78bfa',pointRadius:4}]
  },options:{...base,plugins:{...base.plugins,legend:{display:false}}}});
  new Chart(document.getElementById('adminSdgChart'),{type:'doughnut',data:{
    labels:['SDG 3 健康','SDG 4 教育','SDG 11 城市','SDG 12 消費','SDG 13 氣候','SDG 14 海洋'],
    datasets:[{data:[2,1,1,2,1,1],backgroundColor:['#4c9f38','#c5192d','#fd9d24','#bf8b2e','#3f7e44','#0a97d9'],borderWidth:0}]
  },options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{position:'bottom',labels:{color:'#e2e8f0',font:{size:10}}}}}});
  new Chart(document.getElementById('adminXpChart'),{type:'bar',data:{
    labels:['user','Hua','豪傑','志明'],
    datasets:[{label:'XP',data:[1200,3500,450,200],backgroundColor:['#7c3aed','#10b981','#f59e0b','#06b6d4'],borderRadius:6}]
  },options:{...base,indexAxis:'y',plugins:{...base.plugins,legend:{display:false}}}});
  new Chart(document.getElementById('adminEsgChart'),{type:'bar',data:{
    labels:['企業A','企業B','企業C','台中紅十字'],
    datasets:[{label:'ESG 志工時數',data:[120,85,200,160],backgroundColor:'rgba(16,185,129,.7)',borderRadius:6}]
  },options:{...base,plugins:{...base.plugins,legend:{display:false}}}});
}

/* ═══════════════════ Toast 通知 ═══════════════════ */
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
