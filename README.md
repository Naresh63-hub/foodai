# 🥗 Know What You’re Eating — AI Food Transparency & Pre-Eating Intelligence

[![Frontend - React 18](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Backend - Django REST](https://img.shields.io/badge/Backend-Django%204.2%20REST-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase Auth](https://img.shields.io/badge/Auth-Firebase-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel&logoColor=white)](https://vercel.com/)
[![License - MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Know What You’re Eating** is an AI-powered food transparency, safety, and personalized health intelligence platform. It analyzes food barcodes and ingredient labels to reveal true processing levels, exact nutrient breakdowns, Indian FSSAI warning badges, and personalized pre-eating health alerts tailored to your medical profile.

---

## ✨ Key Features

### 1. ⚠️ Personalized Pre-Eating Health Warnings
Before you consume a product, the platform cross-references the ingredient list and nutrient profile against your health preferences:
- **🩸 Diabetes & Pre-Diabetes**: Highlights excessive free sugars, high glycemic refined flours (Maida), and artificial sweeteners.
- **❤️ Hypertension & High BP**: Flags dangerous sodium concentrations (>1.5% wt / >600mg per 100g).
- **🫀 Heart & Cholesterol (CVD)**: Alerts on saturated fats, trans fats, and palm oil.
- **👶 Child Safe Mode**: Warns about caffeine, excessive refined sugar, synthetic food dyes, and hyperactivity-linked additives.
- **🌾 Celiac & Gluten Sensitivity**: Detects wheat, barley, rye, and malt derivatives.
- **🥛 Lactose Intolerance**: Pinpoints milk solids, whey protein, casein, and dairy derivatives.
- **🧬 Kidney & Renal Care**: Warns on high potassium/sodium processing salts.
- **🥑 Fatty Liver (NAFLD)**: Identifies High-Fructose Corn Syrup (HFCS) and excessive liquid sugars.

---

### 2. 🛑 FSSAI Front-of-Pack Nutritional Warning Badges (FOPNL)
Calculates official thresholds in accordance with Indian Food Safety and Standards Authority (FSSAI) guidelines:
- **🛑 High in Sugar** (≥ 10% weight)
- **🛑 High in Saturated Fat** (≥ 4% weight)
- **🛑 High in Salt / Sodium** (≥ 1.5% weight)

---

### 3. 🛡️ Science-Backed "Damage Control" & Glucose Spike Blunting
If you choose to consume a processed treat, the platform gives tactical damage mitigation protocols:
- **Glucose Spike Buffering**: Recommends consuming fiber, chia seeds, or raw almonds 5 minutes before eating.
- **Sodium Flushing**: Outlines hydration guidance to assist renal clearance.
- **Post-Meal Activity**: Advises a light 10–15 minute walk to activate GLUT-4 muscular glucose uptake.

---

### 4. 📊 24-Hour Safe Intake & Chemical Load Tracker (`/tracker`)
Tracks your cumulative daily consumption against **World Health Organization (WHO)** recommended maximum limits:
- **Free Sugar**: 25g daily ceiling with animated visual progress rings.
- **Salt / Sodium**: 5g daily ceiling with safe threshold indicators.
- **Saturated Fat**: 20g daily budget.
- **Chemical Additives Count**: Tracks artificial colors, preservatives, and emulsifiers.

---

### 5. 🛒 Pre-Checkout Grocery Basket Screener (`/cart`)
- Evaluates your multi-item grocery shopping basket before checkout.
- Assigns an overall **Basket Health Grade** (**Grade A to D**).
- Pinpoints the single worst ultra-processed culprit and suggests healthier drop-in swaps.

---

### 6. 🔍 Food Catalog Explorer & Search Engine (`/explore`)
- Instant search across 30+ popular packaged Indian FMCG brands (*Britannia, Parle, Amul, Nestle, Haldiram's, PepsiCo, ITC*).
- Multi-facet filters: **Category**, **Brand**, **Palm-Oil Free**, **Low Sugar (<5%)**, and **Low Salt (<0.3%)**.

---

### 7. 📷 Live Camera Scanner with Audio Chime & Laser Line
- **Zero-Dependency Web Audio API**: Crisp barcode confirmation beep synthesized dynamically in-browser.
- **Haptic Feedback**: Subtle vibration feedback on mobile devices.
- **Interactive Viewfinder**: High-visibility animated laser scan line.

---

### 8. 📄 Printable Doctor / Dietitian Report Card
- One-tap `"Print Report"` button with dedicated `@media print` styling to generate a high-contrast clinical report card for consultations.

---

## 🏗️ Project Architecture & Tech Stack

```
foodai/
├── src/                          # React 18 + Vite Frontend
│   ├── api/                      # API client (/api/food)
│   ├── components/               # Skeletons, Modals, SafeAreaView, Cards
│   ├── contexts/                 # AuthContext (Google, Email/Pass, Demo, Reset)
│   ├── config/                   # Firebase configuration & auth modes
│   ├── pages/                    # Home, Scan, ProductResults, CatalogExplorer,
│   │                             # DailyTracker, GroceryCart, Login, Register, ForgotPassword
│   ├── types/                    # Food, Health & Nutrition types
│   └── services/                 # Firestore & Web Speech Voice Meal Logger
├── server/                       # Node.js Express Backend
│   ├── analysis/                 # Food processing classifier, FOPNL thresholds, health evaluator
│   ├── data/                     # Packaged FMCG products dataset & additives library
│   ├── services/                 # Gemini Vision & AI Nutrition analyzer
│   └── routes.ts                 # Express REST endpoints (/api/food/*)
├── server.ts                     # Full-stack entry point (Express + Vite middlewares)
├── .env.example                  # Environment variables template
└── package.json                  # Single unified scripts & dependencies
```

---

## ⚡ Quickstart: Running Locally

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (comes with Node.js) or **bun**

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Naresh63-hub/MelodyMap.git
cd MelodyMap
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Create your local environment file:
```bash
cp .env.example .env
```

Your `.env` contains:
```env
PORT=3000
NODE_ENV=development
VITE_AUTH_BYPASS=true
GEMINI_API_KEY=
```

> **Note**: The app works out-of-the-box in local development with sample FMCG presets, curated nutrition database, and demo mode. To enable live Gemini image OCR and AI nutrition queries, set your `GEMINI_API_KEY`.

### Step 4: Start the Local Development Server
```bash
npm run dev
```

Open your browser at **[http://localhost:3000](http://localhost:3000)**.
Both frontend and backend are running together with live hot reload!

---

## 🧪 Running Tests & Build

### Run Unit & Integration Tests (Vitest)
```bash
npm test
```
Runs all 32 unit and component tests across 10 test suites (auth, routing, parser, skeletons, forms).

### Build for Production
```bash
npm run build
```
Typechecks with `tsc -b` and bundles with Vite into the `/dist` directory.

### Run Production Server Locally
```bash
npm start
```
Starts the production Express server serving the optimized `/dist` build on `http://localhost:3000`.

---

## 🔑 Authentication Options Available Locally

1. **⚡ 1-Click Instant Demo Access**: Tap "Explore in Instant Demo Mode (No Login)" to test all features instantly.
2. **Sign in with Google**: Works with live accounts or auto-falls back to preview user if domain is not whitelisted.
3. **Email & Password**: Sign up, sign in, and reset passwords with the dedicated "Forgot Password" flow.

---

## 📜 License
This project is licensed under the MIT License.
