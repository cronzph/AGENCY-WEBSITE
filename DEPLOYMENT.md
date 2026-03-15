# Deployment Guide

## Prerequisites
- Vercel account
- GitHub account
- All `.env` variables ready (see `.env.example`)

## Steps

### 1. Push code to GitHub
```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New → Project**
3. Import your GitHub repository
4. Vercel will auto-detect it as a **Vite** project
5. Add all environment variables from `.env.example`:

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase project API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_GROQ_API_KEY` | Groq AI API key |
| `VITE_CEREBRAS_API_KEY` | Cerebras AI API key (if used) |

6. Click **Deploy**

---

## Post-Deployment Checklist

### Update Firebase Authorized Domains
Firebase Console → **Authentication** → **Settings** → **Authorized domains** → Add your Vercel URL (e.g. `your-project.vercel.app`)

### Update Firebase Security Rules
Firebase Console → **Firestore Database** → **Rules** → paste contents of [`firestore.rules`](./firestore.rules) → **Publish**

### Test All Flows on Live URL
- [ ] Inquiry form (`/inquiry`) — submit a test inquiry
- [ ] Proposal page (`/proposal/:id`) — view a generated proposal
- [ ] Payment page (`/payment/:id`) — upload payment proof
- [ ] Admin login (`/admin/login`) — sign in with Firebase Auth
- [ ] Admin dashboard — verify data loads correctly

---

## Project Structure Notes

- **Frontend**: React + Vite, deployed as static site on Vercel
- **Serverless API**: `api/assess.js` runs as a Vercel serverless function
- **Database**: Firebase Firestore (no backend server needed)
- **Auth**: Firebase Authentication
- **Routing**: SPA rewrites handled by `vercel.json`

## vercel.json
The `vercel.json` at the project root handles:
- `/api/*` → Vercel serverless functions
- `/*` → React SPA (client-side routing)

No changes needed to `vercel.json` before deploying.
