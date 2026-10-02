# Firebase Setup Guide

This guide will help you set up Firebase for authentication in the FoodAI project.

## Prerequisites

- A Google account
- Firebase project created at [console.firebase.google.com](https://console.firebase.google.com)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name (e.g., "foodai")
4. Follow the setup wizard

## Step 2: Enable Authentication

1. In Firebase Console, go to "Authentication" → "Sign-in method"
2. Enable "Email/Password" sign-in provider
3. Enable "Google" sign-in provider (optional but recommended)
4. Save changes

## Step 3: Get Firebase Configuration

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click the web icon (</>) to add a web app
4. Copy the firebaseConfig object values

## Step 4: Get Service Account Key (Backend)

1. In Firebase Console, go to Project Settings → Service accounts
2. Click "Generate new private key"
3. Save the JSON file as `firebase-service-account.json`
4. **IMPORTANT**: Never commit this file to version control!
5. Add it to `.gitignore`

## Step 5: Configure Environment Variables

### Frontend (.env.local in frontend/)

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_URL=http://localhost:8000
```

### Backend (.env in project root)

```bash
DATABASE_URL=sqlite:///db.sqlite3
SECRET_KEY=your-secret-key-change-in-production
DEBUG=True

# Firebase Admin SDK
FIREBASE_ADMIN_SDK_KEY_PATH=path/to/firebase-service-account.json

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS=true
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

## Step 6: Add Firebase Service Account Key to Backend

Place the `firebase-service-account.json` file in the backend directory or a secure location.

## Step 7: Test the Setup

1. Start the backend server:
   ```bash
   cd foodai_backend
   python manage.py runserver
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser
4. Try to register a new account
5. Check that authentication works

## Production Deployment

### Vercel (Frontend)

1. Add Firebase config as environment variables in Vercel project settings
2. Set `VITE_API_URL` to your production backend URL

### Render (Backend)

1. Upload the Firebase service account key securely
2. Set `FIREBASE_ADMIN_SDK_KEY_PATH` environment variable
3. Update `CORS_ALLOWED_ORIGINS` to include your Vercel domain

## Security Notes

- Never commit Firebase service account keys to git
- Use different Firebase projects for development and production
- Regularly rotate Firebase service account keys
- Enable Firebase security rules for Firestore if using it
- Monitor Firebase Console for suspicious activity
