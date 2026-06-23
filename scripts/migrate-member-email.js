'use strict';

require('dotenv').config();
const mysql = require('mysql2/promise');

const defaultEmails = new Map([
  ['U001', 'user@demo.com'],
  ['U002', 'hua@demo.com'],
  ['U003', 'zhiming@demo.com'],
  ['U004', 'meiling@demo.com'],
  ['U005', 'haojie@demo.com'],
  ['U006', 'yating@demo.com'],
  ['U007', 'jianhong@demo.com'],
  ['U008', 'shufen@demo.com'],
  ['N001', 'npo@demo.com'],
  ['N002', 'npo2@demo.com'],
  ['N003', 'npo3@demo.com'],
  ['A001', 'admin@demo.com'],
]);

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
  });

  try {
    const [columns] = await conn.query("SHOW COLUMNS FROM members LIKE 'email'");
    if (!columns.length) {
      await conn.query('ALTER TABLE members ADD COLUMN email VARCHAR(120) NULL AFTER name');
    }

    for (const [uid, email] of defaultEmails) {
      await conn.query(
        'UPDATE members SET email = COALESCE(NULLIF(email, \'\'), ?) WHERE uid = ?',
        [email, uid]
      );
    }

    await conn.query(
      "UPDATE members SET email = CONCAT(LOWER(uid), '@demo.local') WHERE email IS NULL OR email = ''"
    );

    const [indexes] = await conn.query("SHOW INDEX FROM members WHERE Key_name = 'email'");
    if (!indexes.length) {
      await conn.query('ALTER TABLE members MODIFY email VARCHAR(120) NOT NULL');
      await conn.query('ALTER TABLE members ADD UNIQUE KEY email (email)');
    }

    const [rows] = await conn.query('SELECT uid, name, email FROM members ORDER BY uid');
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
