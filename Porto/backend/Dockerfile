FROM php:8.3-cli-bookworm

ENV PORT=10000 \
    APP_ENV=production \
    LOG_CHANNEL=stderr \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    NLTK_DATA=/tmp/nltk_data \
    PATH="/opt/venv/bin:${PATH}"

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        default-mysql-client \
        git \
        libicu-dev \
        libonig-dev \
        libzip-dev \
        python3 \
        python3-pip \
        python3-venv \
        unzip \
    && docker-php-ext-install intl mbstring opcache pdo_mysql zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app/Porto/backend

COPY Porto/backend/composer.json Porto/backend/composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --prefer-dist --optimize-autoloader --no-scripts

COPY Porto/backend ./
COPY BenchmarkSentimen /app/BenchmarkSentimen
COPY DashboardScraper /app/DashboardScraper

RUN python3 -m venv /opt/venv \
    && pip install --upgrade pip \
    && pip install -r /app/BenchmarkSentimen/requirements.txt \
    && mkdir -p \
        /tmp/nltk_data \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache /tmp/nltk_data \
    && composer dump-autoload --optimize \
    && php artisan package:discover --ansi

EXPOSE 10000

CMD ["sh", "-c", "php artisan config:clear && php artisan route:clear && php artisan view:clear && php artisan serve --host=0.0.0.0 --port=${PORT:-10000}"]
