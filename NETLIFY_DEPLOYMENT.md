# ResearchPilot Netlify Deployment Guide

## Architecture Overview

Your ResearchPilot has:
- **Frontend**: React + Vite (can be deployed to Netlify)
- **Backend**: FastAPI/Python (requires separate hosting)
- **Database**: SQLite (needs migration for production)
- **Storage**: Local filesystem (needs cloud storage)

## Option 1: Frontend Only on Netlify (Recommended for Development)

### Step 1: Prepare Frontend for Netlify

1. **Update `frontend/vite.config.js`:**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
```

2. **Create `frontend/netlify.toml`:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[redirects]
  from = "/api/*"
  to = "YOUR_BACKEND_URL/api/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

3. **Update environment variables in `frontend/src/utils/api.js`:**
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_BASE_URL = process.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});
```

### Step 2: Deploy Frontend to Netlify

1. **Via Netlify CLI:**
```bash
npm install -g netlify-cli
cd frontend
netlify deploy --prod
```

2. **Via GitHub (Recommended):**
   - Push to GitHub
   - Connect repo to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Add environment variables in Netlify dashboard

### Step 3: Deploy Backend Separately

Choose one of these options:

#### Option A: Render (Free tier available)
```bash
# 1. Create account at https://render.com
# 2. Create new Web Service
# 3. Connect GitHub repo
# 4. Environment: Python
# 5. Build command: pip install -r backend/requirements.txt
# 6. Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

#### Option B: Railway (Free tier available)
```bash
# 1. Create account at https://railway.app
# 2. Deploy with: railway up
# 3. Set start command in railway.json
```

#### Option C: Fly.io
```bash
# 1. Install fly CLI
# 2. fly launch --dockerfile ./backend/Dockerfile
# 3. fly deploy
```

#### Option D: Heroku (paid, but reliable)
```bash
# Create Procfile in root:
web: cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

---

## Option 2: Full Stack on Netlify (with Netlify Functions)

### Limitations:
- ⚠️ Netlify Functions timeout after 26 seconds
- ⚠️ Cold starts can be slow
- ⚠️ Not ideal for your FastAPI backend
- ✅ Works for simple API endpoints

### Implementation:

1. **Create `netlify/functions/api.js`:**
```javascript
const http = require('http');

exports.handler = async (event, context) => {
  // Proxy requests to local backend during dev
  // This won't work in production - use Option 1 instead
  
  return {
    statusCode: 503,
    body: JSON.stringify({ error: "Backend must be deployed separately" })
  };
};
```

**This is NOT recommended for ResearchPilot** - your backend has long-running operations that won't work with Netlify Functions.

---

## Configuration Steps

### 1. Update `.env` for Production

```bash
# Update CORS to include your Netlify domain
CORS_ORIGINS=https://your-site.netlify.app,http://localhost:5173

# Update backend URL in frontend
VITE_API_URL=https://your-backend-url.com/api
```

### 2. Create Environment Variables File

**`frontend/.env.production`:**
```
VITE_API_URL=https://your-backend-url.com/api
```

### 3. Update Backend for Production

**`backend/.env`:**
```bash
DATABASE_URL=postgresql://user:pass@host/db  # Use cloud database
UPLOAD_DIR=/tmp/uploads  # Use cloud storage (S3, etc.)
CHROMA_PERSIST_DIR=/tmp/chroma
CORS_ORIGINS=https://your-site.netlify.app,http://localhost:5173
```

---

## Database Migration

SQLite won't work in production (no persistent storage on serverless). Options:

### Option 1: PostgreSQL (Free tier on Render)
```python
# Update DATABASE_URL
DATABASE_URL=postgresql://user:password@host:5432/researchpilot
```

### Option 2: MongoDB (Free tier on MongoDB Atlas)
```python
DATABASE_URL=mongodb+srv://user:password@cluster.mongodb.net/researchpilot
```

---

## Storage Migration

Local filesystem won't work in production.

### Option 1: AWS S3
```bash
pip install boto3
# Update backend to use S3 instead of local filesystem
```

### Option 2: Cloudinary (Free tier)
```bash
pip install cloudinary
```

---

## Deployment Checklist

- [ ] Frontend `vite.config.js` configured
- [ ] `netlify.toml` created with redirects
- [ ] `.env` files updated with production URLs
- [ ] Backend deployed to Render/Railway/Fly.io
- [ ] Database migrated to PostgreSQL/MongoDB
- [ ] Storage configured (S3/Cloudinary)
- [ ] CORS settings updated in backend
- [ ] Environment variables set in Netlify dashboard
- [ ] API URL set in frontend environment
- [ ] Test API connectivity between frontend and backend
- [ ] Monitor logs for errors

---

## Quick Start: Recommended Path

1. **Deploy Frontend to Netlify:**
   ```bash
   cd frontend
   npm run build
   netlify deploy --prod
   ```

2. **Deploy Backend to Render:**
   - Create Render account
   - Deploy from GitHub
   - Set start command: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

3. **Update Environment Variables:**
   - Netlify: `VITE_API_URL` = your Render backend URL
   - Render: `CORS_ORIGINS` = your Netlify domain

4. **Test:**
   - Visit your Netlify domain
   - Check browser console for API errors
   - Monitor backend logs on Render

---

## Troubleshooting

### CORS Errors
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:** Update `CORS_ORIGINS` in backend to include Netlify domain

### API Not Found (404)
**Solution:** Check `VITE_API_URL` is correctly set in frontend environment

### Backend Timeout
**Solution:** Make sure you're not using Netlify Functions - deploy backend separately

### Database Connection Error
**Solution:** Update `DATABASE_URL` to cloud database, ensure firewall allows connections
