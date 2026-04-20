const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const db = require('../database');
const { requireAdmin } = require('../middleware/auth');

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads/images')),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const uploadImage = multer({ storage: imageStorage, limits: { fileSize: 10 * 1024 * 1024 } });

const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads/pdfs')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^\w.\-]/g, '_'))
});
const uploadPdf = multer({ storage: pdfStorage, limits: { fileSize: 100 * 1024 * 1024 } });

// ── Auth ──────────────────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session.adminId) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await db.getAsync('SELECT * FROM admins WHERE username=?', [username]);
  if (admin && bcrypt.compareSync(password, admin.password)) {
    req.session.adminId = admin.id;
    return res.redirect('/admin');
  }
  res.render('admin/login', { error: 'Неверный логин или пароль' });
});

router.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/admin/login'); });

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (req, res) => {
  const [n, o, p, m, t] = await Promise.all([
    db.getAsync('SELECT COUNT(*) as c FROM news'),
    db.getAsync('SELECT COUNT(*) as c FROM olympiads'),
    db.getAsync('SELECT COUNT(*) as c FROM publications'),
    db.getAsync('SELECT COUNT(*) as c FROM materials'),
    db.getAsync('SELECT COUNT(*) as c FROM teachers'),
  ]);
  res.render('admin/dashboard', { stats: { news: n.c, olympiads: o.c, publications: p.c, materials: m.c, teachers: t.c } });
});

// ── NEWS ──────────────────────────────────────────────────────────────────────
router.get('/news', requireAdmin, async (req, res) => {
  const list = await db.allAsync('SELECT * FROM news ORDER BY created_at DESC');
  res.render('admin/news', { list });
});
router.get('/news/new', requireAdmin, (req, res) => res.render('admin/news-form', { item: null, action: '/admin/news', error: null }));
router.post('/news', requireAdmin, uploadImage.single('image'), async (req, res) => {
  const { title_ru, title_uz, content_ru, content_uz, published } = req.body;
  const image = req.file ? '/uploads/images/' + req.file.filename : null;
  await db.runAsync('INSERT INTO news (title_ru,title_uz,content_ru,content_uz,image,published) VALUES (?,?,?,?,?,?)',
    [title_ru, title_uz, content_ru, content_uz, image, published ? 1 : 0]);
  res.redirect('/admin/news');
});
router.get('/news/:id/edit', requireAdmin, async (req, res) => {
  const item = await db.getAsync('SELECT * FROM news WHERE id=?', [req.params.id]);
  if (!item) return res.redirect('/admin/news');
  res.render('admin/news-form', { item, action: `/admin/news/${item.id}`, error: null });
});
router.post('/news/:id', requireAdmin, uploadImage.single('image'), async (req, res) => {
  const { title_ru, title_uz, content_ru, content_uz, published } = req.body;
  const old = await db.getAsync('SELECT * FROM news WHERE id=?', [req.params.id]);
  const image = req.file ? '/uploads/images/' + req.file.filename : old.image;
  await db.runAsync('UPDATE news SET title_ru=?,title_uz=?,content_ru=?,content_uz=?,image=?,published=? WHERE id=?',
    [title_ru, title_uz, content_ru, content_uz, image, published ? 1 : 0, req.params.id]);
  res.redirect('/admin/news');
});
router.post('/news/:id/delete', requireAdmin, async (req, res) => {
  await db.runAsync('DELETE FROM news WHERE id=?', [req.params.id]);
  res.redirect('/admin/news');
});

// ── OLYMPIADS ─────────────────────────────────────────────────────────────────
router.get('/olympiads', requireAdmin, async (req, res) => {
  const list = await db.allAsync('SELECT * FROM olympiads ORDER BY created_at DESC');
  res.render('admin/olympiads', { list });
});
router.get('/olympiads/new', requireAdmin, (req, res) => res.render('admin/olympiad-form', { item: null, action: '/admin/olympiads', error: null }));
router.post('/olympiads', requireAdmin, uploadImage.single('image'), async (req, res) => {
  const { title_ru, title_uz, content_ru, content_uz, event_date, published } = req.body;
  const image = req.file ? '/uploads/images/' + req.file.filename : null;
  await db.runAsync('INSERT INTO olympiads (title_ru,title_uz,content_ru,content_uz,image,event_date,published) VALUES (?,?,?,?,?,?,?)',
    [title_ru, title_uz, content_ru, content_uz, image, event_date, published ? 1 : 0]);
  res.redirect('/admin/olympiads');
});
router.get('/olympiads/:id/edit', requireAdmin, async (req, res) => {
  const item = await db.getAsync('SELECT * FROM olympiads WHERE id=?', [req.params.id]);
  if (!item) return res.redirect('/admin/olympiads');
  res.render('admin/olympiad-form', { item, action: `/admin/olympiads/${item.id}`, error: null });
});
router.post('/olympiads/:id', requireAdmin, uploadImage.single('image'), async (req, res) => {
  const { title_ru, title_uz, content_ru, content_uz, event_date, published } = req.body;
  const old = await db.getAsync('SELECT * FROM olympiads WHERE id=?', [req.params.id]);
  const image = req.file ? '/uploads/images/' + req.file.filename : old.image;
  await db.runAsync('UPDATE olympiads SET title_ru=?,title_uz=?,content_ru=?,content_uz=?,image=?,event_date=?,published=? WHERE id=?',
    [title_ru, title_uz, content_ru, content_uz, image, event_date, published ? 1 : 0, req.params.id]);
  res.redirect('/admin/olympiads');
});
router.post('/olympiads/:id/delete', requireAdmin, async (req, res) => {
  await db.runAsync('DELETE FROM olympiads WHERE id=?', [req.params.id]);
  res.redirect('/admin/olympiads');
});

// ── PUBLICATIONS ──────────────────────────────────────────────────────────────
router.get('/publications', requireAdmin, async (req, res) => {
  const list = await db.allAsync('SELECT * FROM publications ORDER BY created_at DESC');
  res.render('admin/publications', { list });
});
router.get('/publications/new', requireAdmin, (req, res) => res.render('admin/pdf-form', {}));
router.post('/publications', requireAdmin, uploadPdf.single('file'), async (req, res) => {
  const { title_ru, title_uz, author, description_ru, description_uz, year } = req.body;
  if (!req.file) return res.redirect('/admin/publications/new');
  await db.runAsync('INSERT INTO publications (title_ru,title_uz,author,description_ru,description_uz,file_path,year) VALUES (?,?,?,?,?,?,?)',
    [title_ru, title_uz, author, description_ru, description_uz, '/uploads/pdfs/' + req.file.filename, year]);
  res.redirect('/admin/publications');
});
router.post('/publications/:id/delete', requireAdmin, async (req, res) => {
  await db.runAsync('DELETE FROM publications WHERE id=?', [req.params.id]);
  res.redirect('/admin/publications');
});

// ── MATERIALS ─────────────────────────────────────────────────────────────────
router.get('/materials', requireAdmin, async (req, res) => {
  const list = await db.allAsync('SELECT * FROM materials ORDER BY created_at DESC');
  res.render('admin/materials-list', { list });
});
router.get('/materials/new', requireAdmin, (req, res) => res.render('admin/material-form', {}));
router.post('/materials', requireAdmin, uploadPdf.single('file'), async (req, res) => {
  const { title_ru, title_uz, author, subject_ru, subject_uz, description_ru, description_uz, type } = req.body;
  if (!req.file) return res.redirect('/admin/materials/new');
  await db.runAsync('INSERT INTO materials (title_ru,title_uz,author,subject_ru,subject_uz,description_ru,description_uz,file_path,type) VALUES (?,?,?,?,?,?,?,?,?)',
    [title_ru, title_uz, author, subject_ru, subject_uz, description_ru, description_uz, '/uploads/pdfs/' + req.file.filename, type || 'book']);
  res.redirect('/admin/materials');
});
router.post('/materials/:id/delete', requireAdmin, async (req, res) => {
  await db.runAsync('DELETE FROM materials WHERE id=?', [req.params.id]);
  res.redirect('/admin/materials');
});

// ── TEACHERS ──────────────────────────────────────────────────────────────────
router.get('/teachers', requireAdmin, async (req, res) => {
  const list = await db.allAsync('SELECT * FROM teachers ORDER BY order_num ASC');
  res.render('admin/teachers', { list });
});
router.get('/teachers/new', requireAdmin, (req, res) => res.render('admin/teacher-form', { item: null, action: '/admin/teachers' }));
router.post('/teachers', requireAdmin, uploadImage.single('photo'), async (req, res) => {
  const { name, position_ru, position_uz, degree_ru, degree_uz, email, order_num } = req.body;
  const photo = req.file ? '/uploads/images/' + req.file.filename : null;
  await db.runAsync('INSERT INTO teachers (name,position_ru,position_uz,degree_ru,degree_uz,photo,email,order_num) VALUES (?,?,?,?,?,?,?,?)',
    [name, position_ru, position_uz, degree_ru, degree_uz, photo, email, order_num || 0]);
  res.redirect('/admin/teachers');
});
router.get('/teachers/:id/edit', requireAdmin, async (req, res) => {
  const item = await db.getAsync('SELECT * FROM teachers WHERE id=?', [req.params.id]);
  if (!item) return res.redirect('/admin/teachers');
  res.render('admin/teacher-form', { item, action: `/admin/teachers/${item.id}` });
});
router.post('/teachers/:id', requireAdmin, uploadImage.single('photo'), async (req, res) => {
  const { name, position_ru, position_uz, degree_ru, degree_uz, email, order_num } = req.body;
  const old = await db.getAsync('SELECT * FROM teachers WHERE id=?', [req.params.id]);
  const photo = req.file ? '/uploads/images/' + req.file.filename : old.photo;
  await db.runAsync('UPDATE teachers SET name=?,position_ru=?,position_uz=?,degree_ru=?,degree_uz=?,photo=?,email=?,order_num=? WHERE id=?',
    [name, position_ru, position_uz, degree_ru, degree_uz, photo, email, order_num || 0, req.params.id]);
  res.redirect('/admin/teachers');
});
router.post('/teachers/:id/delete', requireAdmin, async (req, res) => {
  await db.runAsync('DELETE FROM teachers WHERE id=?', [req.params.id]);
  res.redirect('/admin/teachers');
});

// ── LINKS ─────────────────────────────────────────────────────────────────────
router.get('/links', requireAdmin, async (req, res) => {
  const list = await db.allAsync('SELECT * FROM links ORDER BY order_num ASC, created_at DESC');
  res.render('admin/links', { list });
});
router.get('/links/new', requireAdmin, (req, res) => res.render('admin/link-form', { item: null, action: '/admin/links' }));
router.post('/links', requireAdmin, async (req, res) => {
  const { title_ru, title_uz, description_ru, description_uz, url, category_ru, category_uz, order_num } = req.body;
  await db.runAsync('INSERT INTO links (title_ru,title_uz,description_ru,description_uz,url,category_ru,category_uz,order_num) VALUES (?,?,?,?,?,?,?,?)',
    [title_ru, title_uz, description_ru, description_uz, url, category_ru, category_uz, order_num || 0]);
  res.redirect('/admin/links');
});
router.get('/links/:id/edit', requireAdmin, async (req, res) => {
  const item = await db.getAsync('SELECT * FROM links WHERE id=?', [req.params.id]);
  if (!item) return res.redirect('/admin/links');
  res.render('admin/link-form', { item, action: `/admin/links/${item.id}` });
});
router.post('/links/:id', requireAdmin, async (req, res) => {
  const { title_ru, title_uz, description_ru, description_uz, url, category_ru, category_uz, order_num } = req.body;
  await db.runAsync('UPDATE links SET title_ru=?,title_uz=?,description_ru=?,description_uz=?,url=?,category_ru=?,category_uz=?,order_num=? WHERE id=?',
    [title_ru, title_uz, description_ru, description_uz, url, category_ru, category_uz, order_num || 0, req.params.id]);
  res.redirect('/admin/links');
});
router.post('/links/:id/delete', requireAdmin, async (req, res) => {
  await db.runAsync('DELETE FROM links WHERE id=?', [req.params.id]);
  res.redirect('/admin/links');
});

// ── SETTINGS ──────────────────────────────────────────────────────────────────
router.get('/settings', requireAdmin, (req, res) => res.render('admin/settings', { success: null, error: null }));
router.post('/settings', requireAdmin, async (req, res) => {
  const { old_password, new_password } = req.body;
  const admin = await db.getAsync('SELECT * FROM admins WHERE id=?', [req.session.adminId]);
  if (!bcrypt.compareSync(old_password, admin.password)) {
    return res.render('admin/settings', { error: 'Неверный текущий пароль', success: null });
  }
  await db.runAsync('UPDATE admins SET password=? WHERE id=?', [bcrypt.hashSync(new_password, 10), req.session.adminId]);
  res.render('admin/settings', { success: 'Пароль изменён', error: null });
});

module.exports = router;
