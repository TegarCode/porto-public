# Porto Public Deployment

Repository deploy-ready untuk portfolio data analyst.

## Struktur

```txt
Porto/
  backend/              Laravel API Gateway
  portfolio-frontend/   Next.js frontend untuk Vercel
BenchmarkSentimen/      Source model dan adapter sentiment
DashboardScraper/       Source scraping worker
database/
  porto_side.sql        Dump demo untuk Aiven MySQL Free
```

## Target Deploy Gratis

```txt
GitHub
├─ Vercel  -> Porto/portfolio-frontend
├─ Render  -> Porto/backend
└─ Aiven   -> database/porto_side.sql
```

## Catatan Database

`database/porto_side.sql` adalah dump demo yang diperkecil agar aman untuk
GitHub dan Aiven Free. Tabel Pentaho dan referensi tetap dibawa, sedangkan
tabel SIDE terbesar dipotong untuk kombinasi default portfolio `IDN -> CHN`.

Full dump lokal tidak ikut commit karena ukurannya terlalu besar untuk GitHub.

## Vercel Env

```env
NEXT_PUBLIC_API_BASE_URL=https://your-render-backend.onrender.com/api/v1
```

## Render Env Utama

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-render-backend.onrender.com

SIDE_DB_HOST=your-aiven-host
SIDE_DB_PORT=your-aiven-port
SIDE_DB_DATABASE=porto_side
SIDE_DB_USERNAME=your-aiven-user
SIDE_DB_PASSWORD=your-aiven-password

PORTFOLIO_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
```
