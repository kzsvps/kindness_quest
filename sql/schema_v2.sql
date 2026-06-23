-- 1NF: SDG 參考表（消除魔術字串）
CREATE TABLE sdg_categories (
  sdg_id   TINYINT     PRIMARY KEY,
  name     VARCHAR(40) NOT NULL,
  color    VARCHAR(10) NOT NULL,
  eng_name VARCHAR(60)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2NF: NPO 機構獨立成表（消除 events/members 的 npo_name 重複）
CREATE TABLE npo_profiles (
  npo_id    VARCHAR(20)  PRIMARY KEY,
  name      VARCHAR(100) NOT NULL UNIQUE,
  region    VARCHAR(50)  DEFAULT '台中市',
  contact   VARCHAR(100),
  intro     TEXT,
  created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3NF: 會員（npo_id FK，消除 npo_name 傳遞依賴）
CREATE TABLE members (
  uid        VARCHAR(20)  PRIMARY KEY,
  name       VARCHAR(50)  NOT NULL UNIQUE,
  email      VARCHAR(120) NOT NULL UNIQUE,
  phone      VARCHAR(30),
  city       VARCHAR(50),
  birthday   DATE         DEFAULT NULL,
  emergency_contact VARCHAR(80),
  bio        TEXT,
  pass       VARCHAR(100) NOT NULL,
  role       ENUM('user','npo','admin') DEFAULT 'user',
  xp         INT     DEFAULT 0,
  coin       INT     DEFAULT 0,
  npo_id     VARCHAR(20)  DEFAULT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (npo_id) REFERENCES npo_profiles(npo_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3NF: 活動（sdg_id, npo_id FK；消除 sdg color/name 的傳遞依賴）
CREATE TABLE events (
  eid          VARCHAR(20)  PRIMARY KEY,
  name         VARCHAR(120) NOT NULL,
  loc          VARCHAR(100) NOT NULL,
  date         DATE         NOT NULL,
  end_date     DATE         DEFAULT NULL,
  sdg_id       TINYINT      NOT NULL,
  npo_id       VARCHAR(20)  NOT NULL,
  quota        INT     DEFAULT 30,
  joined       INT     DEFAULT 0,
  reward       INT     DEFAULT 60,
  xp           INT     DEFAULT 90,
  icon         VARCHAR(10)  DEFAULT '',
  lat          DOUBLE  DEFAULT 0,
  lng          DOUBLE  DEFAULT 0,
  description  TEXT,
  requirements TEXT,
  duration     VARCHAR(100) DEFAULT '',
  status       ENUM('active','ended','cancelled') DEFAULT 'active',
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sdg_id) REFERENCES sdg_categories(sdg_id),
  FOREIGN KEY (npo_id) REFERENCES npo_profiles(npo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 報名（加入 status；uid+eid UNIQUE 防重複報名）
CREATE TABLE registrations (
  rid        VARCHAR(20) PRIMARY KEY,
  uid        VARCHAR(20) NOT NULL,
  eid        VARCHAR(20) NOT NULL,
  status     ENUM('confirmed','cancelled') DEFAULT 'confirmed',
  reg_date   DATE        NOT NULL,
  created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reg (uid, eid),
  FOREIGN KEY (uid) REFERENCES members(uid) ON DELETE CASCADE,
  FOREIGN KEY (eid) REFERENCES events(eid)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 留言（uid FK；name 保留為 denormalized cache 加速查詢）
CREATE TABLE comments (
  cid        VARCHAR(25) PRIMARY KEY,
  uid        VARCHAR(20) NOT NULL,
  name       VARCHAR(50) NOT NULL,
  eid        VARCHAR(20) NOT NULL,
  text       TEXT        NOT NULL,
  image_data MEDIUMTEXT,
  created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uid) REFERENCES members(uid) ON DELETE CASCADE,
  FOREIGN KEY (eid) REFERENCES events(eid)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE comment_likes (
  cid        VARCHAR(25) NOT NULL,
  uid        VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cid, uid),
  FOREIGN KEY (cid) REFERENCES comments(cid) ON DELETE CASCADE,
  FOREIGN KEY (uid) REFERENCES members(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 喝水打卡（uid+date 複合主鍵，天然唯一）
CREATE TABLE water_checkins (
  uid   VARCHAR(20) NOT NULL,
  date  DATE        NOT NULL,
  cups  TINYINT     DEFAULT 0,
  PRIMARY KEY (uid, date),
  FOREIGN KEY (uid) REFERENCES members(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 心情打卡（uid+date 複合主鍵）
CREATE TABLE mood_checkins (
  uid   VARCHAR(20)  NOT NULL,
  date  DATE         NOT NULL,
  mood  VARCHAR(20)  NOT NULL,
  note  VARCHAR(200) DEFAULT '',
  PRIMARY KEY (uid, date),
  FOREIGN KEY (uid) REFERENCES members(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
