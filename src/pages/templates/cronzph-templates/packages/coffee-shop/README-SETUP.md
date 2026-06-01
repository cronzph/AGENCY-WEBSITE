# ☕ Coffee Shop Template - Setup Guide

## Requirements

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** package manager (`npm install -g pnpm`)
- **Firebase account** ([Create one](https://firebase.google.com/))

---

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter a project name (e.g., `my-coffee-shop`)
4. Disable Google Analytics (optional, not needed)
5. Click **"Create project"**

---

## Step 2: Enable Firestore Database

1. In your Firebase project, go to **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll set rules later)
4. Select a region closest to your users
5. Click **"Enable"**

---

## Step 3: Enable Email/Password Authentication

1. Go to **Build → Authentication**
2. Click **"Get started"**
3. Under **Sign-in method**, click **"Email/Password"**
4. Toggle **"Enable"** and click **"Save"**

---

## Step 4: Get Firebase Config

1. Go to **Project Settings** (gear icon in sidebar)
2. Scroll down to **"Your apps"**
3. Click the **web icon** (`</>`) to add a web app
4. Register the app with a nickname (e.g., `coffee-shop-web`)
5. Copy the Firebase config values

---

## Step 5: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase credentials in `.env`:
   ```
   VITE_FIREBASE_API_KEY=AIzaSy...your_key
   VITE_FIREBASE_AUTH_DOMAIN=my-coffee-shop.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=my-coffee-shop
   VITE_FIREBASE_STORAGE_BUCKET=my-coffee-shop.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   VITE_IS_DEMO=false
   ```

---

## Step 6: Install Dependencies & Run Locally

From the **monorepo root** directory:

```bash
pnpm install
pnpm dev:coffee
```

Or from this package directory:

```bash
pnpm install
pnpm dev
```

The app will be available at `http://localhost:5173`

---

## Step 7: Create Your First Admin Account

1. Go to **Firebase Console → Authentication → Users**
2. Click **"Add user"**
3. Enter an email and password
4. Click **"Add user"**
5. Use these credentials to log in to your coffee shop app

---

## Step 8: Deploy to Vercel

1. Push your code to a GitHub repository
2. Go to [Vercel](https://vercel.com/) and import the repository
3. Set the **Root Directory** to `packages/coffee-shop`
4. Add all environment variables from your `.env` file in Vercel's settings
5. Deploy!

### Vercel Settings:
- **Framework Preset:** Vite
- **Build Command:** `pnpm build`
- **Output Directory:** `dist`
- **Install Command:** `pnpm install`

---

## Firestore Security Rules

For production, apply these rules in **Firestore → Rules**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Client collections - require authentication
    match /products/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /orders/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Demo collections - read only
    match /demo_coffee_products/{document=**} {
      allow read: if true;
      allow write: if false;
    }
    match /demo_coffee_orders/{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

---

## Demo Mode

Set `VITE_IS_DEMO=true` in your `.env` to enable demo mode:
- All data is read from Firestore (pre-seeded demo collections)
- Write operations only affect local state (not saved to Firestore)
- A "Demo Mode" badge appears in the UI
- A "Reset Demo" button reloads the page

---

## Need Help?

Contact CronzPH at [your-email@example.com] for support.
