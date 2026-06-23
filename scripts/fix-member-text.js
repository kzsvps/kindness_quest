require('dotenv').config();
const mysql = require('mysql2/promise');

const fixes = {
  U002: {
    city: '台北市',
    emergency_contact: '何媽媽 / 0910-000-002',
    bio: '喜歡參加親子活動與閱讀陪伴。',
  },
  U003: {
    city: '台中市',
    emergency_contact: '李姐姐 / 0910-000-003',
    bio: '對 CPR 與災防主題最有興趣。',
  },
  U004: {
    city: '彰化縣',
    emergency_contact: '陳先生 / 0910-000-004',
    bio: '常參與惜食與料理活動，也會帶家人一起報名。',
  },
  U005: {
    city: '南投縣',
    emergency_contact: '林爸爸 / 0910-000-005',
    bio: '最近特別關注環保與回收議題。',
  },
  U006: {
    city: '台中市',
    emergency_contact: '張媽媽 / 0910-000-006',
    bio: '公益參與活躍，常在活動後留下心得。',
  },
  U007: {
    city: '台南市',
    emergency_contact: '劉老師 / 0910-000-007',
    bio: '喜歡參加教育培力與偏鄉服務活動。',
  },
  U008: {
    city: '高雄市',
    emergency_contact: '周大姐 / 0910-000-008',
    bio: '長期關注健康福祉與社區關懷活動。',
  },
};

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
  });

  try {
    for (const [uid, row] of Object.entries(fixes)) {
      await db.execute(
        'UPDATE members SET city=?, emergency_contact=?, bio=? WHERE uid=?',
        [row.city, row.emergency_contact, row.bio, uid]
      );
    }

    const [rows] = await db.execute(
      "SELECT uid, city, HEX(city) AS city_hex, emergency_contact, HEX(emergency_contact) AS emergency_hex, bio, HEX(bio) AS bio_hex FROM members WHERE uid IN ('U002','U003','U004','U005','U006','U007','U008') ORDER BY uid"
    );

    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
