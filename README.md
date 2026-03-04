# Tracker

Tracker is a modern role-based web app with separate Student and Staff portals, secure authentication, student profiles, friends, and messaging.

## Stack
- Frontend: React + Vite + Framer Motion
- Backend: Node.js + Express + MongoDB (Mongoose)
- Auth: JWT + bcrypt password hashing

## Features Implemented
- Landing page with role selection (Student or Staff)
- Student login with Create Account flow
- Staff login with role-based access
- Student dashboard with sidebar sections: profile icon area, dashboard, skills, friends, messages, settings, logout
- First-login profile completion and anytime profile update
- Student profile fields: photo, bio, skills, projects, certifications, achievements, department, year, links
- Friends system: search students, send request, accept/reject request
- Chat: students can message connected friends
- Staff dashboard:
  - search students by name, skill, department, year
  - view full profile details
  - contact/message selected student
- Responsive modern UI with animated transitions

## Project Structure
- `server/` Express API + MongoDB models
- `client/` React app

## MongoDB Compass Setup
1. Open MongoDB Compass.
2. Use this URI (local MongoDB default):
   - `mongodb://127.0.0.1:27017/tracker`
3. Create/open database `tracker`.

## Backend Setup
1. Open terminal in `tracker/server`
2. Install dependencies:
   - `npm install`
3. Create `.env` from `.env.example`:
   - `PORT=5000`
   - `MONGO_URI=mongodb://127.0.0.1:27017/tracker`
   - `JWT_SECRET=your-strong-secret`
   - `CLIENT_URL=http://localhost:5173`
4. Run backend:
   - `npm run dev`

## Frontend Setup
1. Open terminal in `tracker/client`
2. Install dependencies:
   - `npm install`
3. Create `.env` from `.env.example`:
   - `VITE_API_URL=http://localhost:5000/api`
4. Run frontend:
   - `npm run dev`

## API Overview
- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
- Student:
  - `GET /api/student/profile`
  - `PUT /api/student/profile`
  - `GET /api/student/search`
- Friends:
  - `GET /api/friends/state`
  - `POST /api/friends/request`
  - `POST /api/friends/respond`
- Messages:
  - `GET /api/messages/:peerId`
  - `POST /api/messages`
- Staff:
  - `GET /api/staff/students`
  - `GET /api/staff/students/:id`

## Security Notes
- Passwords are hashed with bcrypt.
- JWT-based protected APIs.
- Role checks enforce student/staff authorization on routes.

## Optional Next Upgrades
- Socket.IO for real-time chat
- File upload (Cloudinary/S3) for profile photos
- Rate limiting + helmet middleware
- Refresh tokens and secure cookie auth
