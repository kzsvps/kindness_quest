-- 邁邁勇者 · 建立資料表（直接在 zeabur 資料庫執行）

-- ── 會員系統 ──
CREATE TABLE IF NOT EXISTS members (
  uid        VARCHAR(20)  PRIMARY KEY,
  name       VARCHAR(50)  NOT NULL UNIQUE,
  pass       VARCHAR(100) NOT NULL,
  role       ENUM('user','npo','admin') DEFAULT 'user',
  xp         INT          DEFAULT 0,
  coin       INT          DEFAULT 0,
  npo_name   VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 活動道館 ──
CREATE TABLE IF NOT EXISTS events (
  eid          VARCHAR(20)  PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  loc          VARCHAR(100) NOT NULL,
  date         DATE         NOT NULL,
  end_date     DATE         DEFAULT NULL,
  sdg          TINYINT      NOT NULL,
  npo          VARCHAR(100) NOT NULL,
  quota        INT          DEFAULT 30,
  joined       INT          DEFAULT 0,
  reward       INT          DEFAULT 60,
  xp           INT          DEFAULT 90,
  icon         VARCHAR(10)  DEFAULT '🌟',
  lat          DOUBLE       DEFAULT 0,
  lng          DOUBLE       DEFAULT 0,
  `desc`       TEXT,
  requirements TEXT,
  duration     VARCHAR(100) DEFAULT '',
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 報名紀錄 ──
CREATE TABLE IF NOT EXISTS registrations (
  rid  VARCHAR(20) PRIMARY KEY,
  uid  VARCHAR(20) NOT NULL,
  eid  VARCHAR(20) NOT NULL,
  date DATE        NOT NULL,
  FOREIGN KEY (uid) REFERENCES members(uid) ON DELETE CASCADE,
  FOREIGN KEY (eid) REFERENCES events(eid)  ON DELETE CASCADE,
  UNIQUE KEY uq_reg (uid, eid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 留言板（客服系統）──
CREATE TABLE IF NOT EXISTS comments (
  cid  VARCHAR(25) PRIMARY KEY,
  uid  VARCHAR(20) NOT NULL,
  name VARCHAR(50) NOT NULL,
  eid  VARCHAR(20) NOT NULL,
  text TEXT        NOT NULL,
  time VARCHAR(20) NOT NULL,
  FOREIGN KEY (eid) REFERENCES events(eid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 喝水打卡 ──
CREATE TABLE IF NOT EXISTS water_checkins (
  uid  VARCHAR(20) NOT NULL,
  date DATE        NOT NULL,
  cups TINYINT     DEFAULT 0,
  PRIMARY KEY (uid, date),
  FOREIGN KEY (uid) REFERENCES members(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 心情打卡 ──
CREATE TABLE IF NOT EXISTS mood_checkins (
  uid  VARCHAR(20)  NOT NULL,
  date DATE         NOT NULL,
  mood VARCHAR(20)  NOT NULL,
  note VARCHAR(200) DEFAULT '',
  PRIMARY KEY (uid, date),
  FOREIGN KEY (uid) REFERENCES members(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 種子資料：會員 ──
INSERT IGNORE INTO members (uid, name, pass, role, xp, coin, npo_name) VALUES
('U001','user',  '$2a$10$6K8L2nX1vQ9mR3pT5wY7uOeHdJsNqFbGcIkMzAoVlWtZrCxPyEhDs', 'user',  1200, 500,  NULL),
('U002','Hua',   '$2a$10$7L9M3oY2wR0nS4qU6xZ8vPfIeKtOrGcHdJlNzBpWmXuaDbEyFiCrTs', 'user',  3500, 1200, NULL),
('N001','npo',   '$2a$10$8M0N4pZ3xS1oT5rV7yA9wQgJfLuPsHdIeKmOzCqXnYvbEcFzGjDsUt', 'npo',   0,    0,    '台中市紅十字會'),
('N002','npo2',  '$2a$10$9N1O5qA4yT2pU6sW8zB0xRhKgMvQtIeJfLnPzDrYoZwcFdGaHkEtVu', 'npo',   0,    0,    '惜食廚房協會'),
('A001','admin', '$2a$10$0O2P6rB5zU3qV7tX9aF1yShLhNwRuJfKgMoQzEsZpAwdGeBiIlFuWv', 'admin', 0,    0,    NULL);

-- ── 種子資料：活動 ──
INSERT IGNORE INTO events (eid,name,loc,date,sdg,npo,quota,joined,reward,xp,icon,lat,lng,`desc`,requirements,duration) VALUES
('E001','清水濕地淨灘行動','清水濕地公園','2026-07-15',14,'台灣藍鵲茶生態 NPO',30,12,80,150,'🌊',24.2730,120.5612,'一起走進清水濕地，清除海岸垃圾、調查海洋生物多樣性，由專業生態講師帶領解說在地濕地生態系統。','需自備水壺、防曬、手套，年齡限制 12 歲以上。','上午 09:00–12:00'),
('E002','醜蔬果創意料理工作坊','逢甲夜市廣場','2026-08-03',12,'惜食廚房協會',20,18,60,100,'🥘',24.1802,120.6429,'外觀不完美卻富含營養的醜蔬果通常直接被丟棄，本工作坊教你用創意烹飪手法化廢為寶，實踐零浪費飲食。','自備料理工具，主辦提供食材。','下午 14:00–17:00'),
('E003','偏鄉程式教育義教計畫','和平區學習中心','2026-09-10',4,'碼力無限 EdTech 協會',15,5,120,200,'📖',24.3600,121.0200,'深入山地原鄉提供程式設計課程，協助偏鄉學童接觸數位工具，縮短城鄉教育落差。','需備基礎程式教學能力，自備筆電。','連續三天 09:00–17:00'),
('E004','低碳生活節能體驗講座','台中市政府廣場','2026-10-20',13,'綠境永續 Foundation',50,34,50,80,'🌿',24.1633,120.6474,'透過互動展覽與專題演講，介紹台灣能源轉型現況與個人減碳足跡計算。','無特殊限制，歡迎攜家帶眷。','下午 13:30–16:30'),
('E005','廢電池回收日 × 環保市集','文心秀泰廣場','2026-11-05',12,'循環台灣基金會',40,22,40,60,'🔋',24.1524,120.6483,'攜帶廢電池換取環保積點，同場加映二手物交換市集與資源回收手作體驗。','可攜帶舊電池、舊衣物、舊電子產品。','全天 10:00–18:00'),
('E006','緊急救護 CPR＋AED 訓練','台中市紅十字會服務中心','2026-07-20',3,'台中市紅十字會',25,8,90,160,'🏥',24.1531,120.6713,'學習心肺復甦術（CPR）與 AED 操作，通過認證可獲紅十字會急救證書。','需年滿 16 歲，建議穿著方便活動之服裝。','上午 09:00–12:00'),
('E007','災害防救志工培訓營','台中市紅十字會服務中心','2026-08-15',11,'台中市紅十字會',30,11,100,180,'🛡️',24.1531,120.6713,'兩天全天培訓，涵蓋颱風水災應變、緊急避難所管理與心理救援技巧。','需事先完成線上報名，備妥健康聲明書。','兩天 08:30–17:30'),
('E008','熱血台中 獻血公益日','台中市捐血中心（南屯）','2026-09-05',3,'台中市紅十字會',100,43,70,120,'❤️',24.1415,120.6488,'與台中市捐血中心合作舉辦公益獻血日，完成捐血可獲邁邁勇者紀念徽章。','年滿 17 歲、體重 50kg 以上、近期身體健康。','全天 09:00–17:00');

-- ── 種子資料：報名記錄 ──
INSERT IGNORE INTO registrations (rid,uid,eid,date) VALUES
('R001','U001','E002','2026-07-01'),
('R002','U002','E001','2026-07-02'),
('R003','U002','E002','2026-07-03'),
('R004','U001','E006','2026-07-10');

-- ── 種子資料：留言 ──
INSERT IGNORE INTO comments (cid,uid,name,eid,text,time) VALUES
('C001','U002','Hua',  'E001','活動很有意義！沿途撿了好多垃圾，下次一定再來！','06/20 14:30'),
('C002','U001','user', 'E002','醜蔬果做出來的料理超好吃！完全不輸正品','06/21 12:00'),
('C003','U001','user', 'E006','CPR 訓練非常扎實，老師很有耐心！','06/22 11:30');
