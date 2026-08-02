# 💎 ADORN — AI-Powered Jewellery Engagement Platform
### Built for SheBuilds Hackathon × CaratLane

> **Adorn** is a full-stack, AI-driven jewellery lifestyle platform that personalises jewellery discovery, gift-giving, and closet management. It blends a style-preference quiz, cosine-similarity matching, live metal valuation, and smart calendar reminders into a single seamless experience.

---

## 📁 Project Structure

```
ADORN/
├── frontend/          # React + Vite SPA (served as static build)
│   ├── src/
│   │   ├── App.jsx           # Main app shell — all tabs & state
│   │   └── QuizPage.jsx      # 20-Q image quiz UI (recipient-facing)
│   └── public/
│       └── quiz-images/      # 80 locally-cropped quiz option images
│
├── backend/           # Node.js Express REST API
│   ├── server.js             # All routes, scoring engine, cron job
│   ├── auth.js               # JWT sign/verify helpers
│   ├── questionBank.json     # 20-question quiz data source with scores
│   └── data/db.json          # Local JSON fallback (if MongoDB is down)
│
│
├── api/               # Vercel serverless function entry
├── vercel.json        # Deployment routing config
└── README.md
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.3 | UI component framework |
| **Vite** | 5.3 | Build tool & dev server |
| **React Router DOM** | 7.18 | Client-side SPA routing |
| **Tailwind CSS** | 3.4 | Utility-first styling |
| **Lucide React** | 0.395 | Icon library |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | v24 | Runtime |
| **Express.js** | 4.19 | REST API framework |
| **MongoDB Atlas** | — | Primary cloud database |
| **Mongoose** | 9.9 | ODM for MongoDB |
| **JSON file (db.json)** | — | Offline fallback DB |
| **node-cron** | 4.6 | Scheduled daily reminder job |
| **jsonwebtoken** | 9.0 | JWT auth (access + refresh tokens) |
| **multer** | 1.4 | File upload handling |
| **nanoid** | 3.3 | Unique ID generation |
| **googleapis** | 173 | Google OAuth + Calendar API |

### Infrastructure
| Service | Purpose |
|---|---|
| **Vercel** | Frontend deployment + serverless routing |
| **MongoDB Atlas** | Cloud-hosted NoSQL database |
| **Google Cloud Console** | OAuth 2.0 identity provider |

---

## 🧮 Core Algorithm: Cosine Similarity Recommendation Engine

> Not a black-box model — a transparent, explainable, deterministic vector matching engine.

### Step 1 — Quiz Answer Scoring
Each of the 20 quiz questions has options (A/B/C/D), and each option carries a multi-dimensional score object defined in questionBank.json:

```json
{
  "metalWarmth": 2,
  "boldness": -1,
  "styleCategory": "minimal",
  "metalPreference": "gold",
  "stonePreference": "diamond",
  "finish": "shiny"
}
```

### Step 2 — Profile Extraction
Raw scores are reduced into dominant values using frequency tallying:

```
dominantStyle     → most frequently voted style category
dominantMetal     → gold / silver / platinum / rose_gold
dominantStone     → diamond / emerald / ruby / sapphire / pearl
dominantFinish    → shiny / matte / antique / rose_gold
boldness score    → sum from -20 to +20 (minimal to maximalist)
metalWarmth score → sum (cool-toned to warm-toned)
```

### Step 3 — User Vector Encoding (One-Hot)
The profile is encoded into a 35-dimensional numerical feature vector:

```
User Vector = [
  one_hot(dominantMetal,  4 values),   // 4 dims
  one_hot(dominantStone,  7 values),   // 7 dims
  one_hot(dominantStyle,  15 values),  // 15 dims
  one_hot(accessoryType,  4 values),   // 4 dims
  one_hot(dominantFinish, 4 values),   // 4 dims
  normalised_boldness                  // 1 dim, scaled 0-1
]  → Total: 35-dimensional vector
```

### Step 4 — Product Vector Encoding
Each of 88 CaratLane products is encoded into the same 35-dimensional space using its metal_type, stone_type, style_category, jewelry_type, and sparkle_level.

### Step 5 — Cosine Similarity

similarity(A, B) = (A · B) / (|A| × |B|)

```javascript
function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; magA += a[i]*a[i]; magB += b[i]*b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
```

UX boosts: +0.05 if product has a real image, +0.02 if price is listed.

### Step 6 — Budget Filtering + Ranking
Products are pre-filtered to price ≤ budget (up to ₹50 Lakhs), then sorted by descending similarity. Top 6 matches are returned.

### Step 7 — Natural Language Output
- **"Why It Fits"** — narrative about the person's style persona
- **"Personal Styling Tip"** — contextual advice based on face shape, neckline, and hair answers (Q15, Q17, Q18)

---

## 🏗️ Data Models (MongoDB Schemas)

### GiftLink
```
token, senderId, recipientName, budget, status (pending/completed),
scoredDimensions, recommendations[], createdAt, completedAt
```

### JewelleryCloset
```
userId, name, metalType, metalPurity, stoneType, weightGrams,
stoneWeightCarats, purchaseSource, purchasePrice, purchaseDate, imageUrl
```

### MetalRate
```
rates: { gold: { price_gram_24k, price_gram_22k, ... },
         silver: {...}, platinum: {...} }, updatedAt
```

### CalendarEvent
```
userId, title, eventDate, eventType (birthday/anniversary/festival/other),
source (google_sync/manual), reminderSchedule[], notified[], createdAt
```

### Notification
```
userId, title, message, eventDate, read (bool), createdAt
```

---

## 📡 API Domains — 9 Feature Domains

| # | Domain | Base Route | Description |
|---|---|---|---|
| 1 | **Authentication** | /api/auth/google | Google OAuth 2.0 → JWT session |
| 2 | **Gift Link / Quiz** | /api/gift-links/* | Create shareable links, submit quiz, view results |
| 3 | **Jewellery Closet** | /api/closet/* | Add, view, delete personal jewellery items with image upload |
| 4 | **Live Valuation** | (computed in-memory) | Real-time exchange/sell price via metal rates + stone formula |
| 5 | **Metal Market Rates** | /api/metal-rates | Store and serve today's gold/silver/platinum market prices |
| 6 | **Product Catalog** | /api/products | Serve all 88 CaratLane products for matching |
| 7 | **Calendar Events** | /api/calendar/events | Create, fetch, delete birthday/anniversary events |
| 8 | **Google Calendar Sync** | /api/calendar/google-sync | Import events directly from the user's Google Calendar |
| 9 | **Notifications** | /api/notifications/* | Fetch and mark-as-read reminder alerts (cron at 9 AM daily) |

---

## 📋 The Quiz — 20 Questions

| Question Block | Questions | What It Measures |
|---|---|---|
| Aesthetic & Colour | Q1, Q2 | Overall style category, colour warmth |
| Fashion & Outfit | Q3, Q19 | Traditional/Western/Fusion, makeup style |
| Accessory Preferences | Q4, Q11, Q13, Q14 | Earring type, bracelet, necklace, primary accessory |
| Jewellery Design | Q5, Q6, Q7, Q10 | Pattern, shape, finish, ring style |
| Metal & Gemstone | Q8, Q12, Q15, Q16 | Watch metal, gemstone, pearl, treasure preference |
| Personality | Q9, Q17 | Flower personality, craftsmanship preference |
| Physical Styling | Q18, Q20 | Skin undertone, neckline → styling tips |

All 20 questions use a 2×2 image grid UI with custom hand-cropped images, circular letter badges, progress bar, and single-question animated flow.

---

## 💰 Live Valuation Engine

```
Exchange Value = (weightGrams × currentMetalPricePerGram)
              + (stoneCarats × stoneRate)

Stone Rates:
  Diamond           → ₹80,000/carat
  Coloured Gemstone → ₹15,000/carat
  Pearl             → ₹6,000/carat

CaratLane pieces:  Sell Price = Exchange Value × 0.95
Other sources:     Sell price not applicable
```

Metal purity parsing supports 9K–24K (gold), 925/999 (silver), 950/900 (platinum).

---

## 📅 Notification & Reminder System

- **Trigger:** node-cron runs daily at 09:00 AM
- **Logic:** Scans CalendarEvents where reminderSchedule contains today's date
- **Deduplication:** Events already in notified[] are skipped
- **Output:** Notification document with personalised message
- **Frontend:** Bell icon with unread badge; click to mark as read

---

## 🔐 Authentication System

- **Provider:** Google OAuth 2.0 via googleapis
- **Session:** Stateless JWT (access token + refresh token)
- **Flow:** Google Sign-In → OAuth callback → JWT issued → Bearer token on API calls
- **Note:** Google Cloud OAuth Consent Screen must have test users listed (or be published)

---

## 📊 Product Catalog (88 CaratLane Products)

| Category | Count |
|---|---|
| Necklaces | 30 |
| Bracelets / Mangalsutra Bracelets | 17 |
| Rings | 20 |
| Stud Earrings | 12 |
| Pendants | 5 |
| Mangalsutra | 3 |
| Bangles | 2 |
| Hoop Earrings | 2 |

Metals: 9KT–22KT Yellow Gold, White Gold, Rose Gold, Platinum
Stones: Diamonds, Coloured Gemstones, Pearls, No-Stone

---

## 🚀 Running Locally

### Backend
```bash
cd backend
npm install
# .env: MONGODB_URI, JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
npm start    # http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run build   # Backend serves /dist as static files
```



---

## 🌍 Deployment

Configured for Vercel via vercel.json:
- Frontend static build from /frontend/dist
- Backend API proxied from /api/* to backend/server.js

---

## 📝 9 Domains Summary

1. **Jewellery Style Quiz** — 20-Q personalised image-based quiz
2. **AI Gift Recommendation** — Cosine similarity vector matching engine
3. **Anonymous Gift Links** — Token-based shareable gift-finder URLs
4. **User Authentication** — Google OAuth 2.0 + JWT session management
5. **Jewellery Closet** — Personal collection tracker with image upload
6. **Live Jewellery Valuation** — Real-time exchange/sell price calculator
7. **Metal Market Rates** — Gold / Silver / Platinum rate storage
8. **Reminder Calendar + Google Sync** — Event management + Google Calendar import
9. **Notifications** — Daily 9 AM cron-triggered smart reminder alerts

---

*Built with love for the SheBuilds Hackathon — empowering women through jewellery, technology, and personalisation.*




