# Vercel Backend Deployment

Deploy this Laravel API as a separate Vercel project from the same GitHub repo.

## Project settings

```txt
Framework Preset: Other
Root Directory: Porto/backend
Build Command: leave empty
Output Directory: leave empty
Install Command: leave empty
```

`vercel.json` routes every request to `api/index.php`, which boots Laravel through the community PHP runtime.

## Required environment variables

Paste these in Vercel Project Settings > Environment Variables.

```env
APP_NAME=Portfolio API Gateway
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-backend-project.vercel.app
APP_KEY=base64:...

LOG_CHANNEL=stderr
CACHE_STORE=array
SESSION_DRIVER=array
QUEUE_CONNECTION=sync
LARAVEL_STORAGE_PATH=/tmp/laravel-storage
APP_CONFIG_CACHE=/tmp/config.php
APP_EVENTS_CACHE=/tmp/events.php
APP_PACKAGES_CACHE=/tmp/packages.php
APP_ROUTES_CACHE=/tmp/routes.php
APP_SERVICES_CACHE=/tmp/services.php
VIEW_COMPILED_PATH=/tmp/views

DB_CONNECTION=mysql
DB_HOST=mysql-2aa035c8-oktaviantotegar2-9017.i.aivencloud.com
DB_PORT=15907
DB_DATABASE=defaultdb
DB_USERNAME=avnadmin
DB_PASSWORD=your-aiven-password

MYSQL_ATTR_SSL_CA=/etc/ssl/certs/ca-certificates.crt
MYSQL_ATTR_SSL_VERIFY_SERVER_CERT=false

SIDE_DB_HOST=mysql-2aa035c8-oktaviantotegar2-9017.i.aivencloud.com
SIDE_DB_PORT=15907
SIDE_DB_DATABASE=defaultdb
SIDE_DB_USERNAME=avnadmin
SIDE_DB_PASSWORD=your-aiven-password

PORTFOLIO_ALLOWED_ORIGINS=*
PORTFOLIO_ALLOWED_METHODS=GET,POST,OPTIONS
PORTFOLIO_ALLOWED_HEADERS=Content-Type,Accept,Authorization,X-Requested-With,X-API-KEY
PORTFOLIO_RATE_LIMIT_PER_MINUTE=60
PORTFOLIO_SIDE_CACHE_TTL=300

SENTIMENT_PYTHON_ADAPTER_ENABLED=false
SENTIMENT_FALLBACK_TO_FLASK=false
SENTIMENT_SERVICE_ENABLED=false
SENTIMENT_SERVICE_URL=http://127.0.0.1:5000

DASHBOARD_SCRAPER_PATH=
BPS_HS_FILE=
SCRAPING_SERVICE_ENABLED=false
SCRAPING_SERVICE_URL=http://127.0.0.1:5000
SCRAPING_SERVICE_TIMEOUT=5
```

Generate `APP_KEY` locally:

```powershell
cd C:\laragon\www\porto-public\Porto\backend
php artisan key:generate --show
```

## Supported in this serverless deployment

- Health endpoint.
- SIDE analysis endpoints backed by Aiven MySQL.
- Pentaho dashboard endpoints backed by Aiven MySQL.
- Scraping option metadata, with live scraping actions returning service-unavailable until a worker is deployed elsewhere.

## Frontend variable

After this backend is deployed, set the frontend Vercel project variable:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-project.vercel.app/api/v1
```
