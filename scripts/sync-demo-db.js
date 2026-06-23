'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const root = path.resolve(__dirname, '..');
const sqlDir = path.join(root, 'sql');
const files = ['drop.sql', 'schema_v2.sql', 'seed_v2.sql'];

async function main() {
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
    for (const file of files) {
      const sql = fs.readFileSync(path.join(sqlDir, file), 'utf8');
      await connection.query(sql);
      console.log(`Applied ${file}`);
    }

    const tables = [
      'sdg_categories',
      'npo_profiles',
      'members',
      'events',
      'registrations',
      'comments',
      'water_checkins',
      'mood_checkins',
    ];

    for (const table of tables) {
      const [[row]] = await connection.query(`SELECT COUNT(*) AS cnt FROM ${table}`);
      console.log(`${table}: ${row.cnt}`);
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
