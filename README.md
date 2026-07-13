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
render.yaml             Blueprint Render untuk Laravel API
```

## Target Deploy Gratis

```txt
GitHub
|-- Vercel  -> Porto/portfolio-frontend
|-- Vercel  -> Porto/backend
`-- Aiven   -> database/porto_side.sql
```

## Catatan Database

`database/porto_side.sql` adalah dump demo yang diperkecil agar aman untuk
GitHub dan Aiven Free. Tabel Pentaho dan referensi tetap dibawa, sedangkan
tabel SIDE terbesar dipotong untuk kombinasi default portfolio `IDN -> CHN`.

Full dump lokal tidak ikut commit karena ukurannya terlalu besar untuk GitHub.
Data Aiven yang sudah di-import berada di database `defaultdb`.

## Vercel Env

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-project.vercel.app/api/v1
```

## Backend Vercel

Deploy backend sebagai project Vercel terpisah dengan root directory:

```txt
Porto/backend
```

Detail env dan setting ada di `Porto/backend/README-vercel.md`.

## Render Opsional

`render.yaml` tetap tersedia sebagai opsi Docker/Render jika nanti ada kartu
untuk verifikasi billing. Untuk jalur 100% tanpa kartu, gunakan Vercel backend.
