-- 邁邁勇者 · 資料庫 Schema
-- Host: 43.153.182.198:32650 | schema: zeabur
-- Generated: 2026-06-23

CREATE DATABASE IF NOT EXISTS zeabur CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE zeabur;

-- ── 會員系統 ──
CREATE TABLE IF NOT EXISTS members (
  uid      VARCHAR(20)  PRIMARY KEY,
  name     VARCHAR(50)  NOT NULL UNIQUE,
  pass     VARCHAR(100) NOT NULL,
  role     ENUM('user','npo','admin') DEFAULT 'user',
  xp       INT          DEFAULT 0,
  coin     INT          DEFAULT 0,
  npo_name VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP  DEFAULT CURRENT_TIMESTAMP
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
  rid   VARCHAR(20) PRIMARY KEY,
  uid   VARCHAR(20) NOT NULL,
  eid   VARCHAR(20) NOT NULL,
  date  DATE        NOT NULL,
  FOREIGN KEY (uid) REFERENCES members(uid) ON DELETE CASCADE,
  FOREIGN KEY (eid) REFERENCES events(eid)  ON DELETE CASCADE,
  UNIQUE KEY uq_reg (uid, eid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 留言板（客服系統）──
CREATE TABLE IF NOT EXISTS comments (
  cid   VARCHAR(25) PRIMARY KEY,
  uid   VARCHAR(20) NOT NULL,
  name  VARCHAR(50) NOT NULL,
  eid   VARCHAR(20) NOT NULL,
  text  TEXT        NOT NULL,
  time  VARCHAR(20) NOT NULL,
  FOREIGN KEY (eid) REFERENCES events(eid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 喝水打卡 ──
CREATE TABLE IF NOT EXISTS water_checkins (
  uid   VARCHAR(20) NOT NULL,
  date  DATE        NOT NULL,
  cups  TINYINT     DEFAULT 0,
  PRIMARY KEY (uid, date),
  FOREIGN KEY (uid) REFERENCES members(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 心情打卡 ──
CREATE TABLE IF NOT EXISTS mood_checkins (
  uid   VARCHAR(20)  NOT NULL,
  date  DATE         NOT NULL,
  mood  VARCHAR(20)  NOT NULL,
  note  VARCHAR(200) DEFAULT '',
  PRIMARY KEY (uid, date),
  FOREIGN KEY (uid) REFERENCES members(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 種子資料 ──
INSERT IGNORE INTO members (uid, name, pass, role, xp, coin, npo_name) VALUES
('U001','user',  '$2a$10$dummyhashuser',   'user',  1200, 500,  NULL),
('U002','Hua',   '$2a$10$dummyhashhua',    'user',  3500, 1200, NULL),
('N001','npo',   '$2a$10$dummyhashnpo',    'npo',   0,    0,    '台中市紅十字會'),
('N002','npo2',  '$2a$10$dummyhashnpo2',   'npo',   0,    0,    '惜食廚房協會'),
('A001','admin', '$2a$10$dummyhashadmin',  'admin', 0,    0,    NULL);

INSERT IGNORE INTO events
  (eid,name,loc,date,sdg,npo,quota,joined,reward,xp,icon,lat,lng,`desc`,requirements,duration)
VALUES
('E001','清水濕地淨灘行動','清水濕地公園','2026-07-15',14,'台灣藍鵲茶生態 NPO',30,12,80,150,'🌊',24.2730,120.5612,'一起走進清水濕地，清除海岸垃圾。','需自備水壺、防曬、手套，年齡限制 12 歲以上。','上午 09:00–12:00'),
('E002','醜蔬果創意料理工作坊','逢甲夜市廣場','2026-08-03',12,'惜食廚房協會',20,18,60,100,'🥘',24.1802,120.6429,'零浪費飲食，化廢為寶。','自備料理工具。','下午 14:00–17:00'),
('E006','緊急救護 CPR＋AED 訓練','台中市紅十字會服務中心','2026-07-20',3,'台中市紅十字會',25,8,90,160,'🏥',24.1531,120.6713,'學習 CPR 與 AED 操作，通過認證可獲急救證書。','需年滿 16 歲。','上午 09:00–12:00'),
('E007','災害防救志工培訓營','台中市紅十字會服務中心','2026-08-15',11,'台中市紅十字會',30,11,100,180,'🛡️',24.1531,120.6713,'兩天全天培訓，颱風水災應變與心理救援。','需事先完成線上報名。','兩天 08:30–17:30'),
('E008','熱血台中 獻血公益日','台中市捐血中心（南屯）','2026-09-05',3,'台中市紅十字會',100,43,70,120,'❤️',24.1415,120.6488,'公益獻血日，完成捐血可獲紀念徽章與 XP。','年滿 17 歲、體重 50kg 以上。','全天 09:00–17:00');
