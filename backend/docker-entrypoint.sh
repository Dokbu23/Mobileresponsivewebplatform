#!/bin/bash
set -e

echo 'Starting Laravel Docker container...'

# Update Apache to listen on Render dynamic PORT
RENDER_PORT="${PORT:-80}"
echo "Configuring Apache on port ${RENDER_PORT}..."
sed -i "s/Listen 80/Listen ${RENDER_PORT}/" /etc/apache2/ports.conf || true
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${RENDER_PORT}>/" /etc/apache2/sites-available/000-default.conf || true

# Run build script
if [ -f '/var/www/html/build.sh' ]; then
    echo 'Running build script...'
    chmod +x /var/www/html/build.sh
    /var/www/html/build.sh
fi

# Start Apache
echo "Starting Apache on port ${RENDER_PORT}..."
exec apache2-foreground
