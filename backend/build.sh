#!/usr/bin/env bash
# exit on error
set -o errexit

echo 'Starting Laravel deployment on Render...'

# Wait for PostgreSQL to be ready (up to 60 seconds)
echo 'Waiting for database to be ready...'
MAX_TRIES=12
WAIT_SEC=5
for i in $(seq 1 $MAX_TRIES); do
    if php artisan migrate:status --no-interaction 2>/dev/null; then
        echo 'Database is ready!'
        break
    fi
    echo "   Attempt $i/$MAX_TRIES - retrying in ${WAIT_SEC}s..."
    sleep $WAIT_SEC
done

# Storage symlink and caching
echo 'Creating storage link...'
php artisan storage:link || true

# Optimize for production
echo 'Optimizing for production...'
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo 'Build complete!'
