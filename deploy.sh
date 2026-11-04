#!/bin/bash
# DiscoverMansalay Frontend Deployment Script
# This script extracts and deploys the frontend package to EC2

set -e  # Exit on error

cd /tmp

# Check if ZIP exists
if [ ! -f "frontend-dist-deploy.zip" ]; then
    echo "Error: frontend-dist-deploy.zip not found in /tmp"
    exit 1
fi

echo "Extracting deployment package..."

# Extract with proper handling
unzip -o frontend-dist-deploy.zip

# Verify extraction
if [ ! -d "dist" ]; then
    echo "Error: dist folder not created after extraction"
    exit 1
fi

echo "dist/ folder extracted successfully"
echo ""
echo "Deploying to web root..."

cd /var/www/discovermansalay.online/public

# Backup current dist
if [ -d dist ]; then
    echo "Backing up current dist..."
    sudo mv dist dist.backup.\1793791226
fi

# Move new dist
sudo mv /tmp/dist .

# Fix ownership and permissions
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist
sudo chmod 644 dist/.htaccess

echo "Restarting Apache..."
sudo apache2ctl -t
sudo systemctl restart apache2

echo ""
echo "Deployment complete!"
echo "Testing frontend..."
curl -I https://discoverymansalay.online/

