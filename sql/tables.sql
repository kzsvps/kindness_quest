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
  icon         VARCHAR(10)  DEFAULT '',
  lat          DOUBLE       DEFAULT 0,
  lng          DOUBLE       DEFAULT 0,
  `desc`       TEXT,
  requirements TEXT,
  duration     VARCHAR(100) DEFAULT '',
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS registrations (
  rid  VARCHAR(20) PRIMARY KEY,
  uid  VARCHAR(20) NOT NULL,
  eid  VARCHAR(20) NOT NULL,
  date DATE        NOT NULL,
  FOREIGN KEY (uid) REFERENCES members(uid) ON DELETE CASCADE,
  FOREIGN KEY (eid) REFERENCES events(eid)  ON DELETE CASCADE,
  UNIQUE KEY uq_reg (uid, eid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS comments (
  cid  VARCHAR(25) PRIMARY KEY,
  uid  VARCHAR(20) NOT NULL,
  name VARCHAR(50) NOT NULL,
  eid  VARCHAR(20) NOT NULL,
  text TEXT        NOT NULL,
  time VARCHAR(20) NOT NULL,
  FOREIGN KEY (eid) REFERENCES events(eid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS water_checkins (
  uid  VARCHAR(20) NOT NULL,
  date DATE        NOT NULL,
  cups TINYINT     DEFAULT 0,
  PRIMARY KEY (uid, date),
  FOREIGN KEY (uid) REFERENCES members(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mood_checkins (
  uid  VARCHAR(20)  NOT NULL,
  date DATE         NOT NULL,
  mood VARCHAR(20)  NOT NULL,
  note VARCHAR(200) DEFAULT '',
  PRIMARY KEY (uid, date),
  FOREIGN KEY (uid) REFERENCES members(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;