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
├── frontend/                     # React 18 + Vite SPA
│   ├── src/
│   │   ├── api/                  # Axios HTTP client with Firebase token injection
│   │   ├── components/           # UI Components, Badges & Navigation
│   │   ├── contexts/             # Firebase Auth Context
│   │   ├── config/               # Firebase configuration
│   │   ├── pages/                # Scan, Results, Explorer, Tracker, Cart, DNA, Login, Register
│   │   ├── types/                # TypeScript Interfaces (Health, Nutrition)
│   │   └── utils/                # Audio synthesizer & helper utilities
│   ├── e2e/                      # Playwright E2E tests
│   ├── vercel.json               # Vercel deployment configuration
│   └── package.json
│
├── foodai_backend/               # Python Django REST Backend
│   ├── food_analysis/            # Core processing engine, classification & FOPNL
│   │   ├── classifier.py         # Ingredient categorization & additive detection
│   │   ├── health_evaluator.py   # Medical conditions & damage control logic
│   │   ├── nutrition.py          # Weight percentage & nutrition analysis
│   │   └── management/commands/  # Catalog seeders & dataset importers
│   ├── users/                    # User health preference profiles
│   ├── scans/                    # Scan history & OCR integration
│   ├── firebase_auth.py          # Firebase authentication backend
│   ├── firebase_config.py        # Firebase Admin SDK configuration
│   ├── middleware.py             # Firebase token extraction middleware
│   └── manage.py
│
├── .github/workflows/            # CI/CD pipelines (GitHub Actions)
├── requirements.txt              # Python dependencies
├── FIREBASE_SETUP.md             # Firebase setup guide
└── README.md
```

---

## ⚡ Quickstart: Local Development

### Prerequisites
- **Node.js** (v18+) & **npm**
- **Python** (v3.10+) & **pip**
- **Firebase Project** (for authentication) - See [FIREBASE_SETUP.md](FIREBASE_SETUP.md)

---

### 1. Firebase Setup (Required for Authentication)

Follow the detailed setup guide in [FIREBASE_SETUP.md](FIREBASE_SETUP.md) to:
- Create a Firebase project
- Enable Email/Password authentication
- Get Firebase configuration
- Download service account key for backend
- Configure environment variables

### 2. Backend Setup (Django)

```powershell
# 1. Navigate to the project root and activate virtualenv
cd d:/foodai
python -m venv venv
.\venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy .env.example to .env and configure
# Add your Firebase configuration and service account key path

# 4. Apply database migrations
cd foodai_backend
python manage.py migrate

# 5. Seed the curated FMCG food catalog
python manage.py import_food_dataset

# 6. Start the backend server
python manage.py runserver 8000
```
Backend API will be live at `http://127.0.0.1:8000/` with API docs at `/api/docs/`

---

### 3. Frontend Setup (React Vite)

```powershell
# In a new terminal window:
cd d:/foodai/frontend

# 1. Install dependencies
npm install

# 2. Create .env.local file with Firebase configuration
# Copy from Firebase Console (see FIREBASE_SETUP.md)

# 3. Start Vite development server
npm run dev
```
Frontend web application will be live at `http://localhost:5173/`.

---

## 🧪 Running Tests

### Backend Tests (Pytest)
```powershell
cd d:/foodai/foodai_backend
pytest
# Result: 45+ passed (including Firebase auth tests)
```

### Frontend Unit Tests (Vitest)
```powershell
cd d:/foodai/frontend
npm run test
# Result: 10+ passed (including auth, login, register tests)
```

### Frontend E2E Tests (Playwright)
```powershell
cd d:/foodai/frontend
npm run test:e2e
# Runs end-to-end tests in Chromium, Firefox, and WebKit
```

---

## 🚀 Production Deployment Guide (Render.com)

### Complete Full-Stack Deployment via Render Blueprint (`render.yaml`)

The repository includes a ready-to-use `render.yaml` blueprint that provisions:
1. **Managed PostgreSQL Database (`foodai-db`)**: Persistent database storage with zero-config `DATABASE_URL` injection.
2. **Backend Web Service (`foodai-backend`)**: Python Django REST API with Gunicorn, auto-running migrations and catalog seeding on build.
3. **Frontend Static Site (`foodai-frontend`)**: React 18 + Vite SPA served via Render's global CDN with client-side routing support.

#### 1. First-Time Setup on Render
1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub repository (`Naresh63-hub/foodai`).
4. Render detects `render.yaml` and sets up `foodai-backend`, `foodai-db`, and `foodai-frontend`.
5. In **Environment Variables** / **Secret Files**:
   - Upload your `firebase-service-account.json` under Secret Files (or paste contents into `FIREBASE_SERVICE_ACCOUNT_JSON`).
   - Add your `GEMINI_API_KEY` (for AI nutrition and meal plate analysis).
   - In `foodai-frontend`, add your Firebase web config (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, etc.).
6. Click **Apply**. Render will automatically build, migrate, and deploy your live app!

---

### 🔄 How to Go Live Every Time (Continuous Deployment)

Once your Render Blueprint or services are connected:
1. Make your changes and test locally:
   ```bash
   npm run test --prefix frontend
   python -m pytest foodai_backend/foodai_backend/tests
   ```
2. Commit and push your changes to GitHub:
   ```bash
   git add .
   git commit -m "feat: my latest updates"
   git push origin main
   ```
3. **Render takes care of the rest automatically:**
   - Render detects the push to `main`.
   - Runs database migrations (`python manage.py migrate`).
   - Seeds the FMCG food dataset (`python manage.py import_food_dataset`).
   - Builds the optimized frontend bundle.
   - Deploys the new version live with zero downtime.

---

### Alternative: Frontend on Vercel + Backend on Render

If you prefer keeping the frontend on Vercel:
1. Import `Naresh63-hub/foodai` on [Vercel](https://vercel.com/new).
2. Set Root Directory to `frontend`.
3. Add `VITE_API_URL` pointing to your Render backend URL (e.g., `https://foodai-backend.onrender.com` or `https://foodai-1-cht5.onrender.com`).
4. Both Vercel and Render will auto-deploy simultaneously whenever you `git push origin main`.

---

## 📜 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
