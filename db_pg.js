const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/accessibility';
const pool = new Pool({ connectionString: DATABASE_URL });

console.log('db_pg: using DATABASE_URL =', DATABASE_URL);

async function ensureSchema() {
  let client;
  try {
    client = await pool.connect();
    // simple sanity test
    console.log(DATABASE_URL);
    try {
      const { rows } = await client.query('SELECT NOW() as now');
      console.log('db_pg: connected, now=', rows[0].now);
    } catch (pingErr) {
      console.error('db_pg: ping failed:', pingErr && (pingErr.stack || pingErr));
    }
  } catch (connErr) {
    console.error('Failed to connect to Postgres in ensureSchema:', connErr && (connErr.stack || connErr));
    throw connErr;
  }

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        url TEXT NOT NULL,
        report_json TEXT,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS screenshots (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        mime TEXT NOT NULL,
        data BYTEA NOT NULL,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY(report_id) REFERENCES reports(id)
      );
    `);
  } catch (e) {
    console.error('Error ensuring schema (query failed):', e && (e.stack || e));
    throw e;
  } finally {
    try { if (client) client.release(); } catch (e) { /* ignore */ }
  }
}

module.exports = {
  pool,
  ensureSchema,
  createUser: async (id, email, passwordHash) => {
    await pool.query('INSERT INTO users (id, email, password_hash, created_at) VALUES ($1,$2,$3,$4)', [id, email, passwordHash, new Date()]);
  },
  getUserByEmail: async (email) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0];
  },
  getUserById: async (id) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0];
  },
  createReport: async (id, userId, url, reportJson) => {
    await pool.query('INSERT INTO reports (id, user_id, url, report_json, created_at) VALUES ($1,$2,$3,$4,$5)', [id, userId, url, reportJson, new Date()]);
  },
  deleteReport: async (id) => {
    await pool.query('DELETE FROM reports WHERE id = $1', [id]);
  },
  updateReportJson: async (id, reportJson) => {
    await pool.query('UPDATE reports SET report_json = $1 WHERE id = $2', [reportJson, id]);
  },
  listReportsByUser: async (userId) => {
    const { rows } = await pool.query('SELECT id, url, created_at FROM reports WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return rows;
  },
  getReportById: async (id) => {
    const { rows } = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
    return rows[0];
  },
  saveScreenshotsBatch: async (screenshots) => {
    const values = [];
    const now = new Date();

    for (const s of screenshots) {
      values.push(`('${s.id}', '${s.reportId}', '${s.filename}', '${s.mime}', $${values.length + 1}, '${now.toISOString()}')`);
    }

    const query = `INSERT INTO screenshots (id, report_id, filename, mime, data, created_at) VALUES ${values.join(', ')}`;
    await pool.query(query, screenshots.map(s => s.data));
  },
  listScreenshots: async (reportId) => {
    const { rows } = await pool.query('SELECT id, filename, mime, created_at FROM screenshots WHERE report_id = $1', [reportId]);
    return rows;
  },
  getScreenshotData: async (id) => {
    const { rows } = await pool.query('SELECT id, report_id, filename, mime, data FROM screenshots WHERE id = $1', [id]);
    return rows[0];
  }
};
