# Netlify Deployment Quick Start

## 🚀 Deploy Frontend to Netlify (5 minutes)

### Option 1: Via Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build frontend
cd researchpilot/frontend
npm install
npm run build

# Deploy
netlify deploy --prod

# You'll get a URL like: https://your-site.netlify.app
```

### Option 2: Via GitHub (Recommended)
1. Push code to GitHub: `git push origin main`
2. Go to https://netlify.com and sign in
3. Click "New site from Git"
4. Select your GitHub repo
5. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Base directory**: `researchpilot/frontend`
6. Add environment variables:
   - `VITE_API_URL` = `https://your-backend-url.com` (add later after backend deployed)
7. Deploy!

---

## 🔧 Deploy Backend to Render (10 minutes)

### Step 1: Create Render Account
- Go to https://render.com
- Sign up with GitHub account

### Step 2: Deploy Backend
1. Click "New +" → "Web Service"
2. Connect GitHub repo
3. Configure:
   - **Name**: `researchpilot-api`
   - **Environment**: `Python 3`
   - **Region**: Choose closest to you
   - **Build command**: `pip install -r requirements.txt`
   - **Start command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free (or Starter for more stability)

4. Add environment variables in Render dashboard:
   ```
   GROQ_API_KEY=your_key_here
   TAVILY_API_KEY=your_key_here
   OPENROUTER_API_KEY=your_key_here
   CORS_ORIGINS=https://your-site.netlify.app
   DATABASE_URL=sqlite:///./data/researchpilot.db
   ```

5. Deploy!

### Step 3: Get Backend URL
- After deployment, Render will give you a URL like: `https://researchpilot-api.onrender.com`
- Copy this URL

---

## 🔗 Connect Frontend to Backend

### Update Frontend Environment Variables

1. **In Netlify Dashboard**:
   - Go to Site settings → Environment
   - Add `VITE_API_URL` = `https://researchpilot-api.onrender.com`
   - Trigger redeploy

2. **Or in GitHub**:
   - Create `.env.production` (already created)
   - Update: `VITE_API_URL=https://researchpilot-api.onrender.com`
   - Push to trigger rebuild

### Update Backend CORS

On Render dashboard, update:
```
CORS_ORIGINS=https://your-site.netlify.app,http://localhost:5173
```

---

## 🧪 Test the Deployment

1. Visit your Netlify URL: `https://your-site.netlify.app`
2. Open browser DevTools (F12)
3. Go to Network tab
4. Try searching/querying
5. Check that API calls go to your backend URL
6. Look for any CORS errors

**Common errors and fixes:**
| Error | Solution |
|-------|----------|
| `CORS error` | Update `CORS_ORIGINS` in backend to match frontend URL |
| `API 404` | Check `VITE_API_URL` is correct and backend is running |
| `Cannot reach backend` | Ensure backend URL is accessible, check firewall |
| `Slow response` | Cold start is normal on free tier, wait 30s |

---

## 💾 Database Setup (Optional)

Currently using SQLite. For production, consider:

### PostgreSQL on Render (Free tier available)
1. In Render, click "New +" → "PostgreSQL"
2. Copy connection string
3. Set `DATABASE_URL` on backend

### MongoDB Atlas (Free tier available)
1. Create account at https://mongodb.com/cloud
2. Create cluster (free tier)
3. Set `DATABASE_URL` to connection string

---

## 📁 Storage Setup (Optional)

Currently using local filesystem. For production:

### AWS S3
```bash
pip install boto3
# Set in backend .env:
# AWS_ACCESS_KEY_ID=your_key
# AWS_SECRET_ACCESS_KEY=your_secret
# S3_BUCKET=your_bucket
```

### Cloudinary (Easier for files)
```bash
pip install cloudinary
# Set in backend .env:
# CLOUDINARY_URL=cloudinary://key:secret@cloud
```

---

## 📊 Monitoring

### Netlify Logs
- https://app.netlify.com → Site settings → Logs → Functions/Deploy logs

### Render Logs
- https://dashboard.render.com → Your service → Logs

Check logs for errors:
```bash
# Or from CLI
netlify logs:functions
render logs --service researchpilot-api
```

---

## 🆘 Troubleshooting

### Frontend builds but shows blank page
- Check browser console for errors (F12)
- Verify `VITE_API_URL` environment variable is set
- Check `dist/` folder exists after build

### "Cannot reach backend" error
- Verify backend service is running on Render
- Check backend URL in `VITE_API_URL`
- Ensure no CORS errors in browser console

### API calls return 503 or timeout
- Backend might be cold starting (free tier sleeps after 15 min)
- Give it 30 seconds to wake up
- Or upgrade to paid tier for always-on

### Database connection error
- Verify `DATABASE_URL` format is correct
- Check database is accessible from Render
- Firewall might be blocking - configure IP whitelist

---

## ✅ Deployment Checklist

- [ ] Frontend builds locally: `npm run build`
- [ ] Frontend deployed to Netlify
- [ ] Backend deployed to Render
- [ ] `VITE_API_URL` set in Netlify environment
- [ ] `CORS_ORIGINS` updated in backend
- [ ] Test login/search works
- [ ] Check browser console for errors
- [ ] Monitor backend logs for issues
- [ ] (Optional) Set up database
- [ ] (Optional) Set up file storage
- [ ] (Optional) Configure custom domain
- [ ] (Optional) Set up SSL/HTTPS (Netlify does this automatically)

---

## 🔐 Security Notes

⚠️ **Never commit `.env` with real API keys**

Before pushing to GitHub:
```bash
# Make sure .env is in .gitignore
echo ".env" >> .gitignore
echo "*.env" >> .gitignore
git rm --cached .env
git commit -m "Remove .env from tracking"
```

Set all API keys as environment variables in:
- Netlify dashboard
- Render dashboard

---

## 📚 Additional Resources

- [Netlify Docs](https://docs.netlify.com)
- [Render Docs](https://render.com/docs)
- [Vite Config Reference](https://vitejs.dev/config/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

---

## 💬 Need Help?

**Stuck?** Check:
1. Browser console (F12 → Console tab)
2. Network tab to see failed requests
3. Backend logs on Render
4. Frontend build logs on Netlify
5. Run locally first: `npm run dev` in frontend, `python main.py` in backend
