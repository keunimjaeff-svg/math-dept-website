const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', async (req, res) => {
  const lang = res.locals.lang;
  const latestNews = await db.allAsync('SELECT * FROM news WHERE published=1 ORDER BY created_at DESC LIMIT 4');
  const latestOlympiads = await db.allAsync('SELECT * FROM olympiads WHERE published=1 ORDER BY created_at DESC LIMIT 3');
  res.render('index', { lang, latestNews, latestOlympiads });
});

router.get('/about', async (req, res) => {
  const lang = res.locals.lang;
  const teachers = await db.allAsync('SELECT * FROM teachers ORDER BY order_num ASC, id ASC');
  res.render('about', { lang, teachers });
});

router.get('/news', async (req, res) => {
  const lang = res.locals.lang;
  const page = parseInt(req.query.page) || 1;
  const limit = 8;
  const offset = (page - 1) * limit;
  const newsList = await db.allAsync('SELECT * FROM news WHERE published=1 ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
  const row = await db.getAsync('SELECT COUNT(*) as cnt FROM news WHERE published=1');
  res.render('news', { lang, newsList, page, totalPages: Math.ceil(row.cnt / limit) });
});

router.get('/news/:id', async (req, res) => {
  const lang = res.locals.lang;
  const item = await db.getAsync('SELECT * FROM news WHERE id=? AND published=1', [req.params.id]);
  if (!item) return res.redirect('/news');
  res.render('news-detail', { lang, item, type: 'news' });
});

router.get('/olympiads', async (req, res) => {
  const lang = res.locals.lang;
  const list = await db.allAsync('SELECT * FROM olympiads WHERE published=1 ORDER BY created_at DESC');
  res.render('olympiads', { lang, list });
});

router.get('/olympiads/:id', async (req, res) => {
  const lang = res.locals.lang;
  const item = await db.getAsync('SELECT * FROM olympiads WHERE id=? AND published=1', [req.params.id]);
  if (!item) return res.redirect('/olympiads');
  res.render('news-detail', { lang, item, type: 'olympiad' });
});

router.get('/publications', async (req, res) => {
  const lang = res.locals.lang;
  const list = await db.allAsync('SELECT * FROM publications ORDER BY created_at DESC');
  res.render('publications', { lang, list });
});

router.get('/materials', async (req, res) => {
  const lang = res.locals.lang;
  const books = await db.allAsync("SELECT * FROM materials WHERE type='book' ORDER BY created_at DESC");
  const other = await db.allAsync("SELECT * FROM materials WHERE type!='book' ORDER BY created_at DESC");
  res.render('materials', { lang, books, other });
});

router.get('/links', async (req, res) => {
  const lang = res.locals.lang;
  const list = await db.allAsync('SELECT * FROM links ORDER BY order_num ASC, created_at DESC');
  res.render('links', { lang, list });
});

router.get('/contact', (req, res) => {
  res.render('contact', { lang: res.locals.lang });
});

module.exports = router;
