# 🚀 Render Deployment Guide - DiscoverMansalay

Complete step-by-step guide to deploy your Laravel + React app to Render with PostgreSQL.

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ 1. Generate Required Keys

**APP_KEY:**
```bash
cd backend
php artisan key:generate --show
```
Copy the output (starts with `base64:`)

**JWT_SECRET:**
```bash
php artisan tinker
```
Then run:
```php
echo base64_encode(random_bytes(32));
exit
```
Copy the output and prefix with `base64:`

### ✅ 2. Gmail App Password (for email functionality)

1. Go to: https://myaccount.google.com/apppasswords
2. Create new app password for "DiscoverMansalay"
3. Copy the 16-character password (no spaces)

### ✅ 3. Prepare Your Repository

```bash
# Make build script executable
cd backend
chmod +x build.sh

# Commit all changes
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

---

## 🎯 DEPLOYMENT STEPS

### STEP 1: Create Render Account

1. Go to: https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

---

### STEP 2: Create PostgreSQL Database

1. Click **"New +"** → **"PostgreSQL"**
2. Fill in:
   - **Name:** `disc-mansalay-db`
   - **Database:** `disc_mansalay_prod`
   - **User:** (auto-generated)
   - **Region:** Singapore
   - **Plan:** Free
3. Click **"Create Database"**
4. ⏳ Wait for database to provision (2-3 minutes)
5. 📝 Save these credentials (you'll see them in dashboard):
   - Internal Database URL
   - External Database URL
   - Host, Port, Database, Username, Password

---

### STEP 3: Deploy Backend (Laravel API)

1. Click **"New +"** → **"Web Service"**
2. Connect your repository: `Mobileresponsivewebplatform`
3. Fill in:
   - **Name:** `disc-mansalay-api`
   - **Region:** Singapore
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Environment:** `PHP`
   - **Build Command:** `chmod +x build.sh && ./build.sh`
   - **Start Command:** `php artisan serve --host=0.0.0.0 --port=$PORT`
   - **Plan:** Free

4. **Add Environment Variables** (click "Advanced" → "Add Environment Variable"):

#### Required Variables:

```env
APP_NAME=DiscoverMansalay
APP_ENV=production
APP_KEY=base64:YOUR_GENERATED_APP_KEY
APP_DEBUG=false
APP_URL=https://disc-mansalay-api.onrender.com
LOG_CHANNEL=errorlog
LOG_LEVEL=error

# Database (from STEP 2)
DB_CONNECTION=pgsql
DB_HOST=<from-render-db-internal-host>
DB_PORT=5432
DB_DATABASE=disc_mansalay_prod
DB_USERNAME=<from-render-db>
DB_PASSWORD=<from-render-db>
DB_SSLMODE=require

# Cache & Sessions
CACHE_DRIVER=file
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120
BROADCAST_DRIVER=log

# JWT Configuration
JWT_SECRET=base64:YOUR_GENERATED_JWT_SECRET
JWT_TTL=1440
JWT_REFRESH_TTL=20160
JWT_ALGO=HS256

# CORS (Update after frontend deployment)
FRONTEND_URL=https://disc-mansalay.onrender.com

# Mail (Gmail App Password)
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-16-char-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your-email@gmail.com
MAIL_FROM_NAME=DiscoverMansalay
```

5. Click **"Create Web Service"**
6. ⏳ Wait for deployment (5-10 minutes)
7. ✅ Your API will be live at: `https://disc-mansalay-api.onrender.com`

---

### STEP 4: Test Backend API

Open in browser:
```
https://disc-mansalay-api.onrender.com/api/public/stats
```

Should return JSON with platform statistics ✅

---

### STEP 5: Deploy Frontend (React/Vite) - OPTIONAL

If you want to deploy frontend separately:

1. Click **"New +"** → **"Static Site"**
2. Connect your repository
3. Fill in:
   - **Name:** `disc-mansalay-frontend`
   - **Branch:** `main`
   - **Root Directory:** Leave empty or `./`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

4. **Environment Variables:**
```env
VITE_API_URL=https://disc-mansalay-api.onrender.com/api
NODE_ENV=production
```

5. Click **"Create Static Site"**
6. ✅ Frontend will be live at: `https://disc-mansalay.onrender.com`

---

### STEP 6: Update CORS After Frontend Deployment

1. Go back to backend service in Render dashboard
2. Click **"Environment"**
3. Update `FRONTEND_URL`:
```env
FRONTEND_URL=https://disc-mansalay.onrender.com
```
4. Click **"Save Changes"**
5. Backend will auto-redeploy

---

## 🔧 POST-DEPLOYMENT

### Run Migrations (if needed)

1. Go to backend service in Render
2. Click **"Shell"**
3. Run:
```bash
php artisan migrate --force
php artisan db:seed --force
```

### Check Logs

1. Go to service dashboard
2. Click **"Logs"** tab
3. Monitor for any errors

---

## ⚠️ TROUBLESHOOTING

### Problem: "SQLSTATE[08006] Connection refused"
**Solution:** Check database credentials in environment variables

### Problem: "500 Internal Server Error"
**Solution:** 
1. Check logs in Render dashboard
2. Ensure `APP_DEBUG=false` (don't show errors publicly)
3. Check `LOG_CHANNEL=errorlog`

### Problem: "CORS Error"
**Solution:**
1. Verify `FRONTEND_URL` matches your frontend domain
2. Check `CorsMiddleware.php` has correct origins
3. Clear config: Go to Shell → `php artisan config:clear`

### Problem: "Database migration failed"
**Solution:**
1. Check database is running (green status)
2. Verify DB credentials are correct
3. Run manually via Shell

### Problem: "Storage link not working"
**Solution:**
Render's filesystem is ephemeral. Use external storage:
- **Option 1:** AWS S3 (recommended)
- **Option 2:** Cloudinary
- **Option 3:** Use Render Disks (paid feature)

---

## 🎯 PERFORMANCE TIPS

### 1. Enable OpCache (PHP)
Add to environment variables:
```env
PHP_OPCACHE_ENABLE=1
```

### 2. Use Redis Cache (Paid Plans)
```env
CACHE_DRIVER=redis
REDIS_HOST=<render-redis-host>
```

### 3. Database Connection Pooling
Already configured in `database.php`

---

## 💰 COST ESTIMATE

**Free Tier:**
- Backend: Free (sleeps after 15min inactivity)
- Database: Free (90 days, then expires)
- Frontend: Free

**Paid Plans (Recommended for Production):**
- Backend Starter: $7/month (always on)
- Database Starter: $7/month (persistent)
- Total: ~$14/month

---

## 🔐 SECURITY REMINDERS

✅ Never commit `.env` with real credentials
✅ Use strong `APP_KEY` and `JWT_SECRET`
✅ Enable 2FA on Render account
✅ Set `APP_DEBUG=false` in production
✅ Use Gmail App Password (not real password)
✅ Monitor logs regularly
✅ Set up error notifications

---

## 📞 SUPPORT

**Render Documentation:** https://render.com/docs
**Laravel Deployment:** https://laravel.com/docs/deployment
**Community:** Render Community Forum

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Repository pushed to GitHub
- [ ] Build script executable (`chmod +x build.sh`)
- [ ] APP_KEY generated
- [ ] JWT_SECRET generated
- [ ] Gmail App Password created
- [ ] PostgreSQL database created on Render
- [ ] Backend deployed and running
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] API endpoint tested
- [ ] Frontend deployed (if applicable)
- [ ] CORS configured correctly
- [ ] Mail sending tested
- [ ] Logs monitored

---

**🎉 Congratulations! Your app is now live on Render!**

**API URL:** `https://disc-mansalay-api.onrender.com`
**Frontend URL:** `https://disc-mansalay.onrender.com` (if deployed)
