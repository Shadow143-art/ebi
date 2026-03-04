# Tracker

Tracker is a role-based web app with Student and Staff portals, profile management, friend/contact requests, and messaging.

## Stack
- Frontend: React + Vite + Framer Motion
- Backend: Node.js + Express + MongoDB (Mongoose)
- Auth: JWT + bcrypt

## Project Structure
- `client/` frontend
- `server/` backend API + socket server

## Local Run

### 1) Backend
```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Required `server/.env` keys:
- `PORT=5000`
- `MONGO_URI=...`
- `JWT_SECRET=...`
- `CLIENT_URL=http://localhost:5173`
- `CLIENT_URLS=http://localhost:5173,https://shadow143-art.github.io`

### 2) Frontend
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Default frontend env:
- `VITE_API_URL=http://localhost:5000/api`
- `VITE_BASE_PATH=` (leave empty for local/normal hosting)

## Easy Production Deploy (Recommended)

Use two hosts:
1. Backend on Render (Web Service)
2. Frontend on Vercel (or Render Static Site)

### Backend (Render)
- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables:
  - `MONGO_URI`
  - `JWT_SECRET`
  - `CLIENT_URL=https://<your-frontend-domain>`
  - `CLIENT_URLS=https://<your-frontend-domain>,http://localhost:5173`

### Frontend (Vercel / Render Static)
- Root directory: `client`
- Build command: `npm install && npm run build`
- Output directory: `dist`
- Environment variable:
  - `VITE_API_URL=https://<your-backend-domain>/api`

Then redeploy frontend.

## GitHub Pages Note
GitHub Pages is static hosting only. UI can load there, but login/register/chat need a live backend URL. If you use GitHub Pages, set:
- `VITE_BASE_PATH=/ebi/`
- `VITE_API_URL=https://<your-backend-domain>/api`

and rebuild/publish.

## Android APK (Auto Build)

A native Android WebView wrapper is included in `android-app/`.

### Build from GitHub Actions
1. Open your repo on GitHub.
2. Go to `Actions` -> `Build APK`.
3. Click `Run workflow`.
4. After completion, download artifact `tracker-debug-apk`.

### App Details
- Package: `com.shadow143.ebi`
- Web URL loaded in app: `https://shadow143-art.github.io/ebi/#/`

### Change app URL
Edit:
- `android-app/app/src/main/res/values/strings.xml` -> `home_url`
