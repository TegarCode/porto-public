# Import Database

File `porto_side.sql` disiapkan untuk database MySQL `porto_side`.

Contoh import lokal:

```bash
mysql -h HOST -P PORT -u USER -p < database/porto_side.sql
```

Untuk Aiven, gunakan connection string/credential dari Aiven Console. Jika
Aiven meminta SSL CA, download CA certificate dari dashboard Aiven lalu pakai
opsi SSL di MySQL client.

Isi dump ini adalah versi demo deploy, bukan full database lokal.
