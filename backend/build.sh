#!/usr/bin/env bash
# exit on error
set -o errexit

echo "🚀 Starting Laravel deployment on Render (Docker)..."

# ── Wait for PostgreSQL to be ready (up to 60 seconds) ──────────────────
echo "⏳ Waiting for database to be ready..."
MAX_TRIES=12
WAIT_SEC=5
for i in $(seq 1 $MAX_TRIES); do
    if php artisan db:show --no-interaction 2>/dev/null | grep -q "Connected"; then
        echo "✅ Database is ready!"
        break
    fi
    echo "   Attempt $i/$MAX_TRIES — retrying in ${WAIT_SEC}s..."
    sleep $WAIT_SEC
done

# ── Run migrations ───────────────────────────────────────────────────────
echo "🗄️  Running database migrations..."
php artisan migrate --force --no-interaction

# ── Seed essential data (safe — uses firstOrCreate) ─────────────────────
echo "🌱 Seeding essential data (users, tourism data, payment settings)..."
php artisan db:seed --force --no-interaction || true

# ── Create storage symlink ───────────────────────────────────────────────
echo "🔗 Creating storage link..."
php artisan storage:link || true

# ── Clear and cache config for production ───────────────────────────────
echo "⚙️  Optimizing for production..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "✅ Build complete!"
