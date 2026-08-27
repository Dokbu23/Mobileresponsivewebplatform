# Use official PHP 8.1 with Apache
FROM php:8.1-apache

# Set working directory
WORKDIR /var/www/html

# Install system dependencies and PHP extensions
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libpq-dev \
    libzip-dev \
    zip \
    unzip \
    && docker-php-ext-configure gd \
    && docker-php-ext-install pdo_pgsql pgsql mbstring exif pcntl bcmath gd zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy ALL application files
COPY . .

# Remove Windows-built vendor (will reinstall fresh for Linux)
RUN rm -rf vendor/ node_modules/

# Set dummy APP_KEY so any artisan calls during build don't fail
ENV APP_KEY=base64:dGVzdGtleWZvcmJ1aWxkb25seXRlc3RrZXk=

# Install PHP dependencies (fresh, Linux-native)
ENV COMPOSER_MEMORY_LIMIT=-1
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-interaction \
    --prefer-dist \
    --no-scripts \
    --verbose \
    && composer dump-autoload --optimize --no-scripts

# Create required directories
RUN mkdir -p storage/framework/{sessions,views,cache} \
    && mkdir -p storage/logs \
    && mkdir -p bootstrap/cache

# Set permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache && \
    chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Configure Apache DocumentRoot to point to public/
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf && \
    sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Write entrypoint script inline (avoids COPY file-not-found issues)
RUN printf '#!/bin/bash\nset -e\n\nRENDER_PORT="${PORT:-80}"\necho "Configuring Apache on port ${RENDER_PORT}..."\nsed -i "s/Listen 80/Listen ${RENDER_PORT}/" /etc/apache2/ports.conf || true\nsed -i "s/<VirtualHost \\*:80>/<VirtualHost *:${RENDER_PORT}>/" /etc/apache2/sites-available/000-default.conf || true\n\nif [ -f "/var/www/html/build.sh" ]; then\n    echo "Running build.sh..."\n    chmod +x /var/www/html/build.sh\n    /var/www/html/build.sh\nfi\n\necho "Starting Apache on port ${RENDER_PORT}..."\nexec apache2-foreground\n' > /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 80

# Use custom entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]
