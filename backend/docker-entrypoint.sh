#!/bin/bash
set -e

echo "🐳 Starting Laravel Docker container..."

# Run migrations and setup
if [ -f "/var/www/html/build.sh" ]; then
    echo "📦 Running build script..."
    chmod +x /var/www/html/build.sh
    /var/www/html/build.sh
fi

# Start Apache
echo "🚀 Starting Apache..."
exec apache2-foreground
