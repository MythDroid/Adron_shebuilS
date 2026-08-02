/**
 * api/index.js — Vercel Serverless Express handler
 * Anonymous Gift-Finder API for Adorn x Caratlane
 *
 * Uses CommonJS (no "type":"module" at root) for maximum @vercel/node compatibility.
 * Connects to MongoDB Atlas via MONGODB_URI environment variable.
 * Token generation uses Node's built-in crypto (no external lib needed).
 */

'use strict';

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─────────────────────────────────────────
// Global In-Memory Database (Serverless Instance Scope)
// Keeps the app fully operational on Vercel with zero database setup.
// ─────────────────────────────────────────
const GIFT_LINKS_STORE = [];


// ─────────────────────────────────────────
// Question bank (disguised — zero jewellery signals)
// Questions are interleaved: filler → signal → filler → signal …
// ─────────────────────────────────────────
const QUESTIONS = [
  {
    id: 'q1', type: 'filler',
    text: 'Biryani or Idly?',
    options: ['Biryani', 'Idly'],
    scoring: null,
  },
  {
    id: 'q2', type: 'aesthetic',
    text: 'Gold sunset or silver moonlight?',
    options: ['Gold sunset', 'Silver moonlight'],
    scoring: {
      'Gold sunset':      { metalWarmth: 2,  boldness: 0,  stonePreference: null,      styleCategory: null },
      'Silver moonlight': { metalWarmth: -2, boldness: 0,  stonePreference: null,      styleCategory: null },
    },
  },
  {
    id: 'q3', type: 'filler',
    text: 'Morning person or night owl?',
    options: ['Morning person', 'Night owl'],
    scoring: null,
  },
  {
    id: 'q4', type: 'style',
    text: 'Bold red lipstick or your natural everyday look?',
    options: ['Bold red lipstick', 'Natural everyday look'],
    scoring: {
      'Bold red lipstick':       { metalWarmth: 0, boldness:  2, stonePreference: 'colored',  styleCategory: 'statement' },
      'Natural everyday look':   { metalWarmth: 0, boldness: -2, stonePreference: 'diamond',  styleCategory: 'minimalist' },
    },
  },
  {
    id: 'q5', type: 'aesthetic',
    text: 'Minimalist room or maximalist room?',
    options: ['Minimalist room', 'Maximalist room'],
    scoring: {
      'Minimalist room': { metalWarmth: 0, boldness: -2, stonePreference: null,     styleCategory: 'minimalist' },
      'Maximalist room': { metalWarmth: 0, boldness:  2, stonePreference: null,     styleCategory: 'statement' },
    },
  },
  {
    id: 'q6', type: 'filler',
    text: 'Coffee or tea?',
    options: ['Coffee', 'Tea'],
    scoring: null,
  },
  {
    id: 'q7', type: 'style',
    text: 'Do you like one piece to stand out, or everything to match?',
    options: ['One piece to stand out', 'Everything to match'],
    scoring: {
      'One piece to stand out': { metalWarmth: 0, boldness:  2, stonePreference: 'colored',  styleCategory: 'statement' },
      'Everything to match':    { metalWarmth: 0, boldness: -1, stonePreference: 'diamond',  styleCategory: 'classic' },
    },
  },
  {
    id: 'q8', type: 'aesthetic',
    text: 'Cozy cabin or modern loft?',
    options: ['Cozy cabin', 'Modern loft'],
    scoring: {
      'Cozy cabin':  { metalWarmth:  2, boldness: 0, stonePreference: null, styleCategory: 'vintage' },
      'Modern loft': { metalWarmth: -2, boldness: 0, stonePreference: null, styleCategory: 'minimalist' },
    },
  },
  {
    id: 'q9', type: 'filler',
    text: 'Dogs or cats?',
    options: ['Dogs', 'Cats'],
    scoring: null,
  },
  {
    id: 'q10', type: 'style',
    text: 'Bright colours or neutral tones in your wardrobe?',
    options: ['Bright colours', 'Neutral tones'],
    scoring: {
      'Bright colours': { metalWarmth:  1, boldness:  1, stonePreference: 'colored',  styleCategory: null },
      'Neutral tones':  { metalWarmth: -1, boldness: -1, stonePreference: 'diamond',  styleCategory: null },
    },
  },
  {
    id: 'q11', type: 'aesthetic',
    text: 'Vintage or contemporary style?',
    options: ['Vintage', 'Contemporary'],
    scoring: {
      'Vintage':       { metalWarmth:  1, boldness:  1, stonePreference: 'colored',  styleCategory: 'vintage' },
      'Contemporary':  { metalWarmth: -1, boldness:  0, stonePreference: 'diamond',  styleCategory: 'minimalist' },
    },
  },
  {
    id: 'q12', type: 'style',
    text: 'Would you rather stand out in a crowd or blend in comfortably?',
    options: ['Stand out in a crowd', 'Blend in comfortably'],
    scoring: {
      'Stand out in a crowd': { metalWarmth: 0, boldness:  2, stonePreference: null, styleCategory: 'statement' },
      'Blend in comfortably': { metalWarmth: 0, boldness: -2, stonePreference: null, styleCategory: 'classic' },
    },
  },
  {
    id: 'q13', type: 'filler',
    text: 'Beach vacation or mountain cabin?',
    options: ['Beach vacation', 'Mountain cabin'],
    scoring: null,
  },
];

// ─────────────────────────────────────────
// Product catalog (hardcoded — Caratlane simulation)
// Each product carries all attributes needed for scoring & display
// ─────────────────────────────────────────
const PRODUCTS = [
  {
    id: 'p1_heart',
    name: 'Rose Gold Heart Diamond Earrings',
    metal: 'rose-gold',
    stoneColour: 'diamond',
    style: 'elegant',
    price: 23500,
    category: 'earrings',
    caratlaneUrl: 'https://www.caratlane.com/jewellery/earrings.html',
  },
  {
    id: 'p1',
    name: 'Bella Gold Leaf Stud Earrings',
    metal: 'gold',
    stoneColour: 'none',
    style: 'minimalist',
    price: 14500,
    category: 'earrings',
    caratlaneUrl: 'https://www.caratlane.com/jewellery/earrings.html',
  },
  {
    id: 'p2',
    name: 'Elan Diamond Necklace',
    metal: 'platinum',
    stoneColour: 'diamond',
    style: 'elegant',
    price: 85200,
    category: 'necklace',
    caratlaneUrl: 'https://www.caratlane.com/jewellery/necklaces-pendants.html',
  },
  {
    id: 'p3',
    name: 'Shreya Rose Gold Ring',
    metal: 'rose-gold',
    stoneColour: 'ruby',
    style: 'royal',
    price: 29800,
    category: 'ring',
    caratlaneUrl: 'https://www.caratlane.com/jewellery/rings.html',
  },
  {
    id: 'p4',
    name: 'Aria Silver Hoop Earrings',
    metal: 'silver',
    stoneColour: 'none',
    style: 'casual',
    price: 6200,
    category: 'earrings',
    caratlaneUrl: 'https://www.caratlane.com/jewellery/earrings.html',
  },
  {
    id: 'p5',
    name: 'Flora Diamond Drops',
    metal: 'gold',
    stoneColour: 'diamond',
    style: 'royal',
    price: 42300,
    category: 'earrings',
    caratlaneUrl: 'https://www.caratlane.com/jewellery/earrings.html',
  },
  {
    id: 'p6',
    name: 'Linear Solitaire Gold Pendant',
    metal: 'gold',
    stoneColour: 'diamond',
    style: 'minimalist',
    price: 31000,
    category: 'necklace',
    caratlaneUrl: 'https://www.caratlane.com/jewellery/necklaces-pendants.html',
  },
  {
    id: 'p7',
    name: 'Vintage Emerald Bracelet',
    metal: 'gold',
    stoneColour: 'emerald',
    style: 'vintage',
    price: 54000,
    category: 'bracelet',
    caratlaneUrl: 'https://www.caratlane.com/jewellery/bracelets.html',
  },
  {
    id: 'p8',
    name: 'Ziva Sapphire Platinum Ring',
    metal: 'platinum',
    stoneColour: 'sapphire',
    style: 'elegant',
    price: 92000,
    category: 'ring',
    caratlaneUrl: 'https://www.caratlane.com/jewellery/rings.html',
  },
];

// ─────────────────────────────────────────
// Token generation — crypto.randomBytes (no Math.random)
// 8-char alphanumeric, URL-safe
// ─────────────────────────────────────────
function generateToken() {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes, b => CHARS[b % CHARS.length]).join('');
}

// ─────────────────────────────────────────
// Scoring engine — pure JS rule-based, no external AI
// ─────────────────────────────────────────
function scoreAnswers(answers) {
  const dims = {
    metalWarmth:    0,
    boldness:       0,
    stonePreference: {},
    styleCategory:   {},
  };

  for (const { questionId, answer } of answers) {
    const q = QUESTIONS.find(q => q.id === questionId);
    if (!q || !q.scoring || !q.scoring[answer]) continue;
    const s = q.scoring[answer];
    dims.metalWarmth += (s.metalWarmth || 0);
    dims.boldness    += (s.boldness    || 0);
    if (s.stonePreference) {
      dims.stonePreference[s.stonePreference] =
        (dims.stonePreference[s.stonePreference] || 0) + 1;
    }
    if (s.styleCategory) {
      dims.styleCategory[s.styleCategory] =
        (dims.styleCategory[s.styleCategory] || 0) + 1;
    }
  }

  return dims;
}

function topKey(obj) {
  const entries = Object.entries(obj);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function matchProducts(dims) {
  const WARM_METALS   = ['gold', 'rose-gold'];
  const COOL_METALS   = ['silver', 'platinum'];
  const BOLD_STYLES   = ['royal', 'elegant'];
  const SUBTLE_STYLES = ['minimalist', 'casual'];
  const COLORED_STONES = ['ruby', 'emerald', 'sapphire'];

  const preferWarm   = dims.metalWarmth > 1;
  const preferCool   = dims.metalWarmth < -1;
  const preferBold   = dims.boldness > 2;
  const preferSubtle = dims.boldness < -2;
  const topStone = topKey(dims.stonePreference);
  const topStyle = topKey(dims.styleCategory);

  return PRODUCTS
    .map(p => {
      let score = 0;

      // Metal warmth (most weighted — 3 pts)
      if (preferWarm && WARM_METALS.includes(p.metal))   score += 3;
      if (preferCool && COOL_METALS.includes(p.metal))   score += 3;
      if (!preferWarm && !preferCool)                     score += 1; // neutral

      // Boldness (2 pts)
      if (preferBold   && BOLD_STYLES.includes(p.style))   score += 2;
      if (preferSubtle && SUBTLE_STYLES.includes(p.style)) score += 2;

      // Stone preference (2 pts)
      if (topStone === 'diamond' && p.stoneColour === 'diamond')              score += 2;
      if (topStone === 'colored' && COLORED_STONES.includes(p.stoneColour))  score += 2;

      // Style category (1 pt)
      if (topStyle === 'vintage'    && p.style === 'vintage')                 score += 2;
      if (topStyle === 'minimalist' && SUBTLE_STYLES.includes(p.style))       score += 1;
      if (topStyle === 'statement'  && BOLD_STYLES.includes(p.style))         score += 1;
      if (topStyle === 'classic'    && p.style === 'elegant')                 score += 1;

      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score);
}

function generateWhyItFits(dims) {
  const parts = [];

  if      (dims.metalWarmth > 1)  parts.push('warm golden tones');
  else if (dims.metalWarmth < -1) parts.push('cool silver hues');

  if      (dims.boldness > 2)  parts.push('bold statement style');
  else if (dims.boldness < -2) parts.push('delicate minimalist taste');

  const topStone = topKey(dims.stonePreference);
  if (topStone === 'colored')  parts.push('love of vibrant coloured stones');
  else if (topStone === 'diamond') parts.push('timeless diamond elegance');

  const topStyle = topKey(dims.styleCategory);
  if (parts.length < 2) {
    if      (topStyle === 'vintage')    parts.push('vintage aesthetic sensibility');
    else if (topStyle === 'minimalist') parts.push('minimalist lifestyle');
    else if (topStyle === 'statement')  parts.push('love of standout pieces');
  }

  if (!parts.length) return 'A timeless choice for any style';
  return `Chosen for your ${parts.slice(0, 2).join(' and ')}`;
}

// ─────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────

// POST /api/gift-links — create link, generate unique token
app.post('/api/gift-links', async (req, res) => {
  try {
    const { senderId = 'default_user', recipientName } = req.body;
    if (!recipientName || !recipientName.trim()) {
      return res.status(400).json({ error: 'recipientName is required' });
    }

    // Generate collision-safe token (max 5 retries)
    let token;
    for (let i = 0; i < 5; i++) {
      const candidate = generateToken();
      const exists = GIFT_LINKS_STORE.find(l => l.token === candidate);
      if (!exists) { token = candidate; break; }
    }
    if (!token) return res.status(500).json({ error: 'Could not generate unique token' });

    const link = {
      id: `link_${Date.now()}`,
      token,
      senderId: senderId.trim(),
      recipientName: recipientName.trim(),
      status: 'pending',
      quizAnswers: null,
      recommendations: [],
      scoredDimensions: {},
      createdAt: new Date().toISOString()
    };

    GIFT_LINKS_STORE.push(link);

    res.status(201).json({ token: link.token, id: link.id });
  } catch (err) {
    console.error('POST /api/gift-links:', err);
    res.status(500).json({ error: 'Failed to create gift link' });
  }
});

// GET /api/gift-links/sender/:senderId — list all links for a sender
app.get('/api/gift-links/sender/:senderId', async (req, res) => {
  try {
    const links = GIFT_LINKS_STORE
      .filter(l => l.senderId === req.params.senderId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(links);
  } catch (err) {
    console.error('GET /api/gift-links/sender:', err);
    res.status(500).json({ error: 'Failed to fetch links' });
  }
});

// GET /api/gift-links/:token — return quiz status + questions (for recipient)
app.get('/api/gift-links/:token', async (req, res) => {
  try {
    const link = GIFT_LINKS_STORE.find(l => l.token === req.params.token);
    if (!link) return res.status(404).json({ error: 'Quiz link not found' });
    res.json({
      token:         link.token,
      status:        link.status,
      recipientName: link.recipientName,
      questions:     QUESTIONS,
    });
  } catch (err) {
    console.error('GET /api/gift-links/:token:', err);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

// POST /api/gift-links/:token/submit — score answers, save, mark completed
app.post('/api/gift-links/:token/submit', async (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers) || !answers.length) {
      return res.status(400).json({ error: 'answers array is required' });
    }

    const idx = GIFT_LINKS_STORE.findIndex(l => l.token === req.params.token);
    if (idx === -1) return res.status(404).json({ error: 'Quiz link not found' });
    
    const link = GIFT_LINKS_STORE[idx];
    if (link.status === 'completed') {
      return res.status(400).json({ error: 'Quiz already completed' });
    }

    const dims = scoreAnswers(answers);
    const topProducts = matchProducts(dims).slice(0, 3);
    const recommendations = topProducts.map(p => ({
      productId: p.id,
      whyItFits: generateWhyItFits(dims),
    }));

    GIFT_LINKS_STORE[idx] = {
      ...link,
      status: 'completed',
      quizAnswers: answers,
      scoredDimensions: dims,
      recommendations: recommendations,
      completedAt: new Date().toISOString()
    };

    res.json({ success: true, message: 'Quiz submitted successfully' });
  } catch (err) {
    console.error('POST /api/gift-links/:token/submit:', err);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// GET /api/gift-links/:token/results — sender-facing results
app.get('/api/gift-links/:token/results', async (req, res) => {
  try {
    const link = GIFT_LINKS_STORE.find(l => l.token === req.params.token);
    if (!link) return res.status(404).json({ error: 'Quiz link not found' });
    if (link.status !== 'completed') {
      return res.status(400).json({ error: 'Quiz not completed yet', status: link.status });
    }

    const recommendations = (link.recommendations || []).map(r => {
      const product = PRODUCTS.find(p => p.id === r.productId);
      if (!product) return null;
      return { product, whyItFits: r.whyItFits };
    }).filter(Boolean);

    res.json({
      token:            link.token,
      recipientName:    link.recipientName,
      scoredDimensions: link.scoredDimensions,
      recommendations,
    });
  } catch (err) {
    console.error('GET /api/gift-links/:token/results:', err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

module.exports = app;
