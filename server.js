const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL не задан! Добавьте переменную окружения.');
  process.exit(1);
}

require('./database');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'math-dept-tdiu-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Language middleware
app.use((req, res, next) => {
  if (req.query.lang) {
    res.cookie('lang', req.query.lang, { maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.locals.lang = req.query.lang;
  } else {
    res.locals.lang = req.cookies.lang || 'ru';
  }
  next();
});

app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

// Sitemap
app.get('/sitemap.xml', async (req, res) => {
  const db = require('./database');
  const base = process.env.SITE_URL || 'https://math-dept-website.onrender.com';
  const staticUrls = ['', '/about', '/news', '/publications', '/olympiads', '/materials', '/contact'];

  const [newsList, olympiads, publications, materials] = await Promise.all([
    db.allAsync('SELECT id, created_at FROM news WHERE published=1'),
    db.allAsync('SELECT id, created_at FROM olympiads WHERE published=1'),
    db.allAsync('SELECT id, created_at FROM publications'),
    db.allAsync('SELECT id, created_at FROM materials'),
  ]);

  const toUrl = (path, date, freq = 'monthly') =>
    `  <url><loc>${base}${path}</loc><lastmod>${new Date(date).toISOString().split('T')[0]}</lastmod><changefreq>${freq}</changefreq></url>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.map(u => `  <url><loc>${base}${u}</loc><changefreq>weekly</changefreq></url>`).join('\n')}
${newsList.map(n => toUrl(`/news/${n.id}`, n.created_at, 'monthly')).join('\n')}
${olympiads.map(o => toUrl(`/olympiads/${o.id}`, o.created_at, 'monthly')).join('\n')}
${publications.map(p => toUrl(`/publications`, p.created_at, 'monthly')).join('\n')}
${materials.map(m => toUrl(`/materials`, m.created_at, 'monthly')).join('\n')}
</urlset>`;
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

app.get('/robots.txt', (req, res) => {
  const base = process.env.SITE_URL || 'https://math-dept-website.onrender.com';
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${base}/sitemap.xml`);
});

app.listen(PORT, () => {
  console.log(`Сайт запущен: http://localhost:${PORT}`);
  console.log(`Админ-панель: http://localhost:${PORT}/admin`);
});
