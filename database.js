const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Convert SQLite ? placeholders to PostgreSQL $1, $2...
function toPostgres(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

const db = {
  runAsync: (sql, params = []) => pool.query(toPostgres(sql), params),
  getAsync: async (sql, params = []) => {
    const r = await pool.query(toPostgres(sql), params);
    return r.rows[0] || null;
  },
  allAsync: async (sql, params = []) => {
    const r = await pool.query(toPostgres(sql), params);
    return r.rows;
  }
};

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS teachers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      position_ru TEXT, position_uz TEXT,
      degree_ru TEXT, degree_uz TEXT,
      photo TEXT, email TEXT,
      order_num INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      title_ru TEXT NOT NULL, title_uz TEXT NOT NULL,
      content_ru TEXT, content_uz TEXT,
      image TEXT, published INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS olympiads (
      id SERIAL PRIMARY KEY,
      title_ru TEXT NOT NULL, title_uz TEXT NOT NULL,
      content_ru TEXT, content_uz TEXT,
      image TEXT, event_date TEXT,
      published INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS publications (
      id SERIAL PRIMARY KEY,
      title_ru TEXT NOT NULL, title_uz TEXT,
      author TEXT, description_ru TEXT, description_uz TEXT,
      file_path TEXT NOT NULL, year INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS materials (
      id SERIAL PRIMARY KEY,
      title_ru TEXT NOT NULL, title_uz TEXT,
      author TEXT, subject_ru TEXT, subject_uz TEXT,
      description_ru TEXT, description_uz TEXT,
      file_path TEXT NOT NULL, type TEXT DEFAULT 'book',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS links (
      id SERIAL PRIMARY KEY,
      title_ru TEXT NOT NULL, title_uz TEXT,
      description_ru TEXT, description_uz TEXT,
      url TEXT NOT NULL,
      category_ru TEXT, category_uz TEXT,
      order_num INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const admin = await pool.query('SELECT id FROM admins WHERE username=$1', ['admin']);
  if (admin.rows.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await pool.query('INSERT INTO admins (username, password) VALUES ($1, $2)', ['admin', hash]);
    console.log('✅ Создан администратор: login=admin, password=admin123');
  }

  console.log('✅ База данных инициализирована');
}

initDB().catch(err => {
  console.error('❌ Ошибка подключения к БД:', err.message);
  process.exit(1);
});

module.exports = db;
