#!/usr/bin/env bash
# exit on error
set -o errexit

echo "🚀 Starting Laravel deployment on Render (Docker)..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 5

# Run database migrations
echo "🗄️  Running database migrations..."
php artisan migrate --force --no-interaction

# Seed database (optional - uncomment if needed)
# echo "🌱 Seeding database..."
# php artisan db:seed --force --no-interaction

# Create storage link
echo "🔗 Creating storage link..."
php artisan storage:link || true

# Clear and regenerate caches
echo "⚙️  Clearing caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

echo "✅ Build complete!"
