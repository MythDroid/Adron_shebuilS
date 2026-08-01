/**
 * backend/server.js — Local development Express server
 * Adorn x Caratlane Anonymous Gift-Finder platform
 *
 * Uses ESM modules ("type":"module" in package.json).
 * Gift-finder routes → MongoDB Atlas (MONGODB_URI in .env)
 * Closet/upload routes → local JSON file (backward compatible for dev)
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─────────────────────────────────────────
// Directories
// ─────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir    = path.join(__dirname, 'data');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dataDir))    fs.mkdirSync(dataDir,    { recursive: true });

const prodImgDir = path.join(uploadsDir, 'products');
if (!fs.existsSync(prodImgDir)) fs.mkdirSync(prodImgDir, { recursive: true });

// ─────────────────────────────────────────
// File-based DB (for closet only — local dev)
// ─────────────────────────────────────────
const DB_FILE = path.join(dataDir, 'db.json');

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const init = { jewellery_closet: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(init, null, 2));
    return init;
  }
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { jewellery_closet: [] }; }
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ─────────────────────────────────────────
// Product catalog
// ─────────────────────────────────────────
const PRODUCTS = [
  { id: 'p1_heart', name: 'Rose Gold Heart Diamond Earrings',  metal: 'rose-gold', stoneColour: 'diamond',  style: 'elegant',    price: 23500, category: 'earrings', caratlaneUrl: 'https://www.caratlane.com/jewellery/earrings.html' },
  { id: 'p1',       name: 'Bella Gold Leaf Stud Earrings',      metal: 'gold',      stoneColour: 'none',     style: 'minimalist', price: 14500, category: 'earrings', caratlaneUrl: 'https://www.caratlane.com/jewellery/earrings.html' },
  { id: 'p2',       name: 'Elan Diamond Necklace',              metal: 'platinum',  stoneColour: 'diamond',  style: 'elegant',    price: 85200, category: 'necklace', caratlaneUrl: 'https://www.caratlane.com/jewellery/necklaces-pendants.html' },
  { id: 'p3',       name: 'Shreya Rose Gold Ring',              metal: 'rose-gold', stoneColour: 'ruby',     style: 'royal',      price: 29800, category: 'ring',     caratlaneUrl: 'https://www.caratlane.com/jewellery/rings.html' },
  { id: 'p4',       name: 'Aria Silver Hoop Earrings',          metal: 'silver',    stoneColour: 'none',     style: 'casual',     price:  6200, category: 'earrings', caratlaneUrl: 'https://www.caratlane.com/jewellery/earrings.html' },
  { id: 'p5',       name: 'Flora Diamond Drops',                metal: 'gold',      stoneColour: 'diamond',  style: 'royal',      price: 42300, category: 'earrings', caratlaneUrl: 'https://www.caratlane.com/jewellery/earrings.html' },
  { id: 'p6',       name: 'Linear Solitaire Gold Pendant',      metal: 'gold',      stoneColour: 'diamond',  style: 'minimalist', price: 31000, category: 'necklace', caratlaneUrl: 'https://www.caratlane.com/jewellery/necklaces-pendants.html' },
  { id: 'p7',       name: 'Vintage Emerald Bracelet',           metal: 'gold',      stoneColour: 'emerald',  style: 'vintage',    price: 54000, category: 'bracelet', caratlaneUrl: 'https://www.caratlane.com/jewellery/bracelets.html' },
  { id: 'p8',       name: 'Ziva Sapphire Platinum Ring',        metal: 'platinum',  stoneColour: 'sapphire', style: 'elegant',    price: 92000, category: 'ring',     caratlaneUrl: 'https://www.caratlane.com/jewellery/rings.html' },
];

// ─────────────────────────────────────────
// Question bank
// ─────────────────────────────────────────
const QUESTIONS_RAW = fs.readFileSync(
  new URL('./questionBank.json', import.meta.url),
  'utf8'
);
const QUESTION_BANK = JSON.parse(QUESTIONS_RAW).questions;

// ─────────────────────────────────────────
// Token generation
// ─────────────────────────────────────────
function generateToken() {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes, b => CHARS[b % CHARS.length]).join('');
}

// ─────────────────────────────────────────
// Scoring engine
// ─────────────────────────────────────────
function scoreAnswers(answers) {
  const dims = { metalWarmth: 0, boldness: 0, stonePreference: {}, styleCategory: {} };
  for (const { questionId, answer } of answers) {
    const q = QUESTION_BANK.find(q => q.id === questionId);
    if (!q || !q.scoring || !q.scoring[answer]) continue;
    const s = q.scoring[answer];
    dims.metalWarmth += (s.metalWarmth || 0);
    dims.boldness    += (s.boldness    || 0);
    if (s.stonePreference) dims.stonePreference[s.stonePreference] = (dims.stonePreference[s.stonePreference] || 0) + 1;
    if (s.styleCategory)   dims.styleCategory[s.styleCategory]     = (dims.styleCategory[s.styleCategory]     || 0) + 1;
  }
  return dims;
}

function topKey(obj) {
  const e = Object.entries(obj);
  return e.length ? e.sort((a, b) => b[1] - a[1])[0][0] : null;
}

function matchProducts(dims) {
  const WARM   = ['gold', 'rose-gold'];
  const COOL   = ['silver', 'platinum'];
  const BOLD   = ['royal', 'elegant'];
  const SUBTLE = ['minimalist', 'casual'];
  const COLOR  = ['ruby', 'emerald', 'sapphire'];

  const pWarm   = dims.metalWarmth > 1;
  const pCool   = dims.metalWarmth < -1;
  const pBold   = dims.boldness > 2;
  const pSubtle = dims.boldness < -2;
  const tStone  = topKey(dims.stonePreference);
  const tStyle  = topKey(dims.styleCategory);

  return PRODUCTS.map(p => {
    let score = 0;
    if (pWarm   && WARM.includes(p.metal))   score += 3;
    if (pCool   && COOL.includes(p.metal))   score += 3;
    if (!pWarm  && !pCool)                    score += 1;
    if (pBold   && BOLD.includes(p.style))   score += 2;
    if (pSubtle && SUBTLE.includes(p.style)) score += 2;
    if (tStone === 'diamond' && p.stoneColour === 'diamond')  score += 2;
    if (tStone === 'colored' && COLOR.includes(p.stoneColour)) score += 2;
    if (tStyle === 'vintage'    && p.style === 'vintage')     score += 2;
    if (tStyle === 'minimalist' && SUBTLE.includes(p.style))  score += 1;
    if (tStyle === 'statement'  && BOLD.includes(p.style))    score += 1;
    if (tStyle === 'classic'    && p.style === 'elegant')     score += 1;
    return { ...p, score };
  }).sort((a, b) => b.score - a.score);
}

function generateWhyItFits(dims) {
  const parts = [];
  if      (dims.metalWarmth > 1)  parts.push('warm golden tones');
  else if (dims.metalWarmth < -1) parts.push('cool silver hues');
  if      (dims.boldness > 2)  parts.push('bold statement style');
  else if (dims.boldness < -2) parts.push('delicate minimalist taste');
  const tStone = topKey(dims.stonePreference);
  if (tStone === 'colored')  parts.push('love of vibrant coloured stones');
  else if (tStone === 'diamond') parts.push('timeless diamond elegance');
  const tStyle = topKey(dims.styleCategory);
  if (parts.length < 2) {
    if      (tStyle === 'vintage')    parts.push('vintage aesthetic sensibility');
    else if (tStyle === 'minimalist') parts.push('minimalist lifestyle');
    else if (tStyle === 'statement')  parts.push('love of standout pieces');
  }
  return parts.length ? `Chosen for your ${parts.slice(0, 2).join(' and ')}` : 'A timeless choice for any style';
}

// Guard — require MongoDB for gift-finder routes
function requireMongo(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'MongoDB not connected. Set MONGODB_URI in .env' });
  }
  next();
}

// ─────────────────────────────────────────
// Closet API (file-based, local dev only)
// ─────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => cb(null, `img_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

app.get('/api/closet', (req, res) => {
  const { userId } = req.query;
  const db = readDB();
  res.json(db.jewellery_closet.filter(i => !userId || i.userId === userId));
});

app.post('/api/closet', upload.single('image'), (req, res) => {
  const { userId, metal, stoneColour, style } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  const db = readDB();
  const item = {
    id: `jc_${Date.now()}`,
    userId:      userId      || 'default_user',
    imageUrl:    `/uploads/${req.file.filename}`,
    metal:       metal       || 'gold',
    stoneColour: stoneColour || 'none',
    style:       style       || 'minimalist',
    createdAt:   new Date().toISOString(),
  };
  db.jewellery_closet.push(item);
  writeDB(db);
  res.status(201).json(item);
});

app.delete('/api/closet/:id', (req, res) => {
  const db = readDB();
  db.jewellery_closet = db.jewellery_closet.filter(i => i.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// ─────────────────────────────────────────
// Products API
// ─────────────────────────────────────────
app.get('/api/products', (req, res) => res.json(PRODUCTS));

// ─────────────────────────────────────────
// Gift-Finder API (Local JSON DB)
// ─────────────────────────────────────────

// POST /api/gift-links
app.post('/api/gift-links', async (req, res) => {
  try {
    const { senderId = 'default_user', recipientName } = req.body;
    if (!recipientName?.trim()) return res.status(400).json({ error: 'recipientName is required' });

    let token;
    const db = readDB();
    if (!db.gift_links) db.gift_links = [];
    for (let i = 0; i < 5; i++) {
      const c = generateToken();
      const exists = db.gift_links.find(l => l.token === c);
      if (!exists) { token = c; break; }
    }
    if (!token) return res.status(500).json({ error: 'Could not generate unique token' });
    const newLink = {
      id: `link_${Date.now()}`,
      token,
      senderId: senderId.trim(),
      recipientName: recipientName.trim(),
      status: 'pending',
      quizAnswers: null,
      resultProductIds: [],
      createdAt: new Date().toISOString()
    };
    db.gift_links.push(newLink);
    writeDB(db);
    return res.status(201).json({ token: newLink.token, id: newLink.id });
  } catch (err) {
    console.error('POST /api/gift-links:', err);
    res.status(500).json({ error: 'Failed to create gift link' });
  }
});

// GET /api/gift-links/sender/:senderId   ← MUST come before /:token
app.get('/api/gift-links/sender/:senderId', async (req, res) => {
  try {
    const db = readDB();
    const links = (db.gift_links || [])
      .filter(l => l.senderId === req.params.senderId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(links);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch links' });
  }
});

// GET /api/gift-links/:token/results  ← MUST come before /:token bare
app.get('/api/gift-links/:token/results', async (req, res) => {
  try {
    const db = readDB();
    const link = (db.gift_links || []).find(l => l.token === req.params.token);

    if (!link) return res.status(404).json({ error: 'Quiz link not found' });
    
    // Status check with legacy schema support
    const isCompleted = link.status === 'completed' || link.quizAnswers || (link.resultProductIds && link.resultProductIds.length > 0);
    if (!isCompleted) return res.status(400).json({ error: 'Quiz not completed yet', status: link.status });

    let recommendations = [];
    if (link.recommendations && link.recommendations.length > 0) {
      recommendations = link.recommendations.map(r => {
        const product = PRODUCTS.find(p => p.id === r.productId);
        return product ? { product, whyItFits: r.whyItFits } : null;
      }).filter(Boolean);
    } else if (link.resultProductIds && link.resultProductIds.length > 0) {
      // Legacy support for product IDs
      recommendations = link.resultProductIds.map(pId => {
        const product = PRODUCTS.find(p => pId === p.id);
        return product ? { product, whyItFits: "Matches their unique personal style preferences." } : null;
      }).filter(Boolean);
    }

    res.json({
      token: link.token,
      recipientName: link.recipientName,
      scoredDimensions: link.scoredDimensions || {},
      recommendations
    });
  } catch (err) {
    console.error('GET results error:', err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// GET /api/gift-links/:token
app.get('/api/gift-links/:token', async (req, res) => {
  try {
    const db = readDB();
    const link = (db.gift_links || []).find(l => l.token === req.params.token);

    if (!link) return res.status(404).json({ error: 'Quiz link not found' });
    const isCompleted = link.status === 'completed' || link.quizAnswers || (link.resultProductIds && link.resultProductIds.length > 0);
    
    res.json({
      token: link.token,
      status: isCompleted ? 'completed' : 'pending',
      recipientName: link.recipientName,
      questions: QUESTION_BANK
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

// POST /api/gift-links/:token/submit
app.post('/api/gift-links/:token/submit', async (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers) || !answers.length) return res.status(400).json({ error: 'answers array required' });

    const dims = scoreAnswers(answers);
    const top3 = matchProducts(dims).slice(0, 3);
    const recs = top3.map(p => ({ productId: p.id, whyItFits: generateWhyItFits(dims) }));

    const db = readDB();
    const idx = (db.gift_links || []).findIndex(l => l.token === req.params.token);
    if (idx === -1) return res.status(404).json({ error: 'Quiz link not found' });
    
    const link = db.gift_links[idx];
    const isCompleted = link.status === 'completed' || link.quizAnswers || (link.resultProductIds && link.resultProductIds.length > 0);
    if (isCompleted) return res.status(400).json({ error: 'Quiz already completed' });

    db.gift_links[idx] = {
      ...link,
      status: 'completed',
      quizAnswers: answers,
      scoredDimensions: dims,
      recommendations: recs,
      resultProductIds: top3.map(p => p.id),
      completedAt: new Date().toISOString()
    };
    writeDB(db);

    res.json({ success: true, message: 'Quiz submitted successfully' });
  } catch (err) {
    console.error('POST /submit:', err);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// ─────────────────────────────────────────
// Serve static frontend files in production/live mode
// ─────────────────────────────────────────
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// ─────────────────────────────────────────
// Start server
// ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Adorn live server running on http://localhost:${PORT}`);
});

export default app;
