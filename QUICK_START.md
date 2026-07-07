# 🚀 Quick Start - Deploy to Render in 10 Minutes!

Follow these steps to deploy your app to Render with PostgreSQL.

---

## ⚡ STEP 1: Generate Keys (2 minutes)

```bash
cd backend

# Generate APP_KEY
php artisan key:generate --show

# Generate JWT_SECRET
php artisan tinker
```

In tinker, run:
```php
echo "base64:" . base64_encode(random_bytes(32));
exit
```

**📝 COPY BOTH KEYS!** You'll need them in Render.

---

## ⚡ STEP 2: Check PostgreSQL Compatibility (1 minute)

```bash
php check-postgresql.php
```

Fix any critical issues if found.

---

## ⚡ STEP 3: Push to GitHub (1 minute)

```bash
# Make build script executable (Linux/Mac)
chmod +x build.sh

# Or on Windows Git Bash:
git update-index --chmod=+x build.sh

# Commit everything
git add .
git commit -m "Deploy to Render with PostgreSQL"
git push origin main
```

---

## ⚡ STEP 4: Create Render Services (6 minutes)

### A. Create Database (2 min)

1. Go to https://render.com → Sign in with GitHub
2. Click **"New +"** → **"PostgreSQL"**
3. Settings:
   - Name: `disc-mansalay-db`
   - Region: **Singapore**
   - Plan: **Free**
4. Click **"Create Database"**
5. 📝 **SAVE CREDENTIALS** shown on next page

### B. Create Backend (4 min)

1. Click **"New +"** → **"Web Service"**
2. Select your repository
3. Settings:
   - Name: `disc-mansalay-api`
   - Region: **Singapore**
   - Root Directory: `backend`
   - Environment: **Docker**
   - Dockerfile Path: `Dockerfile`
   - Docker Context: `backend`
   - Plan: **Free**

4. **Environment Variables** (click "Advanced"):

**Copy-paste this template and fill in YOUR values:**

```env
APP_NAME=DiscoverMansalay
APP_ENV=production
APP_KEY=<YOUR_APP_KEY_FROM_STEP_1>
APP_DEBUG=false
APP_URL=https://disc-mansalay-api.onrender.com
LOG_CHANNEL=errorlog

DB_CONNECTION=pgsql
DB_HOST=<FROM_DATABASE_INTERNAL_HOST>
DB_PORT=5432
DB_DATABASE=<FROM_DATABASE>
DB_USERNAME=<FROM_DATABASE>
DB_PASSWORD=<FROM_DATABASE>
DB_SSLMODE=require

CACHE_DRIVER=file
SESSION_DRIVER=file
BROADCAST_DRIVER=log
QUEUE_CONNECTION=sync

JWT_SECRET=<YOUR_JWT_SECRET_FROM_STEP_1>
JWT_TTL=1440

FRONTEND_URL=http://localhost:3000

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=<YOUR_GMAIL>
MAIL_PASSWORD=<YOUR_GMAIL_APP_PASSWORD>
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=<YOUR_GMAIL>
MAIL_FROM_NAME=DiscoverMansalay
```

5. Click **"Create Web Service"**
6. ⏳ Wait 5-10 minutes for deployment

---

## ⚡ STEP 5: Test! (30 seconds)

Open in browser:
```
https://disc-mansalay-api.onrender.com/api/public/stats
```

Should return JSON ✅

---

## 🎯 WHAT'S NEXT?

### Deploy Frontend (Optional)
See `RENDER_DEPLOYMENT_GUIDE.md` Step 5

### Update CORS
After frontend deployment, update `FRONTEND_URL` in Render dashboard

### Monitor Logs
Render Dashboard → Your Service → Logs tab

---

## 🆘 NEED HELP?

**Common Issues:**

1. **"Connection refused"** → Check database credentials
2. **"500 error"** → Check logs in Render dashboard
3. **"CORS error"** → Update `FRONTEND_URL` in environment variables
4. **"Migration failed"** → Run manually via Render Shell

**Full Guide:** See `RENDER_DEPLOYMENT_GUIDE.md`

---

## ✅ SUCCESS!

Your API is now live at:
**https://disc-mansalay-api.onrender.com** 🎉

**⚠️ Free Tier Note:** Service sleeps after 15min of inactivity. First request after sleep takes ~30 seconds to wake up.

**💰 Upgrade to Starter ($7/mo) for:**
- Always-on service
- Faster response times
- Persistent database
