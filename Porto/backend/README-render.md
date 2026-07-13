# Render Deployment

This backend is prepared for Render as a Docker web service.

## Create the service

Use the root `render.yaml` as a Render Blueprint, or create a manual Web Service with:

```txt
Runtime: Docker
Dockerfile path: ./Porto/backend/Dockerfile
Docker context: .
Health check path: /api/v1/health
```

## Required secret env values

Render will ask for these because they use `sync: false` in `render.yaml`:

```env
APP_KEY=base64:...
DB_PASSWORD=...
SIDE_DB_PASSWORD=...
```

Generate the Laravel key locally:

```powershell
cd C:\laragon\www\porto-public\Porto\backend
php artisan key:generate --show
```

Use the same Aiven password for `DB_PASSWORD` and `SIDE_DB_PASSWORD`.

## Aiven database mapping

The imported public demo data is in Aiven's `defaultdb`, so Render must use:

```env
DB_DATABASE=defaultdb
SIDE_DB_DATABASE=defaultdb
```

Do not change this to `porto_side` unless you create that database in Aiven and import the dump there.

The Blueprint sets MySQL SSL options for Aiven:

```env
MYSQL_ATTR_SSL_CA=/etc/ssl/certs/ca-certificates.crt
MYSQL_ATTR_SSL_VERIFY_SERVER_CERT=false
```

If Aiven rejects the connection, create a Render Secret File from the Aiven CA certificate and point `MYSQL_ATTR_SSL_CA` to that file path.

## After Vercel deploy

Replace:

```env
PORTFOLIO_ALLOWED_ORIGINS=*
```

with your actual Vercel URL, for example:

```env
PORTFOLIO_ALLOWED_ORIGINS=https://porto-public.vercel.app
```

## Service notes

The Docker image includes `BenchmarkSentimen` and installs its Python dependencies, so the sentiment upload endpoint can run through the Python adapter.

The Laravel API knows the `DashboardScraper` path, but this Docker service does not start the scraper Flask/browser worker as a second process. Scraping endpoints that require a live scraper service still need a separate worker/service, or a later multi-process container setup.
