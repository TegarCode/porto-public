# Start Project Commands

Dokumentasi command terminal untuk menjalankan project `flask-scrapSSinas` dari PowerShell atau terminal VS Code.

## 1. Masuk ke root project

```powershell
cd "C:\Users\Tegar Oktavianto\Documents\Magang\flask-scrapSSinas"
```

## 2. Jalankan dashboard Flask

Paling praktis:

```powershell
py flask-scrapSSinas run
```

Command ini dipakai langsung dari root project `flask-scrapSSinas`.
Saat pertama kali dijalankan di device lain, launcher akan otomatis:

- membuat virtualenv lokal `.venv`
- install dependency dari `requirements.txt`
- lalu menjalankan dashboard Flask

Jadi untuk pindah device, kamu cukup memastikan dua hal:

- Python sudah terpasang dan command `py` tersedia
- Google Chrome tersedia kalau mau memakai fitur `siinas.kemenperin.go.id`

Kalau mau alur paling aman untuk device baru, jalankan dulu:

```powershell
.\install.bat
```

Atau double-click file `install.bat`.

Fungsi `install.bat`:

- membuat virtualenv lokal `.venv`
- install atau sinkronkan dependency dari `requirements.txt`
- menyiapkan environment sebelum app dijalankan

Kalau mau paling mudah untuk user non-terminal, bisa langsung double-click:

```text
start.bat
```

Atau dari terminal `cmd` / PowerShell:

```powershell
.\start.bat
```

Alternatif lama kalau masih mau pakai PowerShell script:

```powershell
.\run-dashboard.ps1
```

Alternatif langsung tanpa script:

```powershell
py app.py
```

Setelah jalan, buka:

```text
http://127.0.0.1:5000/
```

Kalau mau menyiapkan environment dulu tanpa langsung membuka app:

```powershell
py flask-scrapSSinas install
```

Kalau mau cek kesiapan environment:

```powershell
py flask-scrapSSinas doctor
```

## 3. Setup database saat first access

Saat pertama kali membuka aplikasi, isi konfigurasi database dulu di halaman:

```text
http://127.0.0.1:5000/setup/database
```

Setelah database valid, aplikasi akan membuat atau menyesuaikan schema berdasarkan file `flask.sql`.

## 4. Stop dashboard Flask

```powershell
py flask-scrapSSinas stop
```

Alternatif `.bat`:

```powershell
.\stop.bat
```

Alternatif lama:

```powershell
.\stop-dashboard.ps1
```

## 5. Jalankan scraper BPS dari terminal

Pilihan `Year` sekarang otomatis mengikuti 10 tahun terakhir yang selesai, jadi saat ini rentangnya akan menyesuaikan ke tahun sistem kamu.
File sumber HS untuk BPS sekarang sudah ikut disimpan di project pada `flask-scrapSSinas\resources\bps\hscode_clean_BPS.xlsx`, jadi setup di device lain tidak lagi bergantung pada path absolut laptop ini.

Contoh export:

```powershell
.\run-bps.ps1 -Year 2025 -Flow export
```

Contoh import:

```powershell
.\run-bps.ps1 -Year 2024 -Flow import
```

Contoh dry-run:

```powershell
.\run-bps.ps1 -Year 2021 -Flow export -DryRun
```

Alternatif langsung tanpa helper script:

```powershell
py .\project_data\scrapapibps.py --year 2025 --flow export
```

Kalau `Year` tidak diisi di `run-bps.ps1`, script akan otomatis memakai tahun terakhir yang tersedia di rentang 10 tahun itu.
Kalau `StartFromHs` dikosongkan, runner akan mulai dari HS pertama di file sumber project.

## 6. Jalankan parser folder TradeMap dari terminal

Parser ini biasanya dijalankan dari dashboard, tapi bisa juga langsung dari terminal.

Contoh dry-run:

```powershell
py .\project_data\trademap_folder_parser.py --parser-mode model_1_default --status import --parser-profile auto --folder-source "C:\path\ke\folder\TradeMap" --dry-run
```

Contoh insert nyata ke database:

```powershell
py .\project_data\trademap_folder_parser.py --parser-mode model_1_default --status export --parser-profile auto --folder-source "C:\path\ke\folder\TradeMap"
```

Contoh Negara-ALL:

```powershell
py .\project_data\trademap_folder_parser.py --parser-mode model_2_negara_all --status export --parser-profile auto --folder-source "C:\path\ke\folder\TradeMap"
```

Parameter penting:

- `--parser-mode model_1_default` untuk mode `Negara-Mitra` ke tabel `data_perdagangan_full_v3`
- `--parser-mode model_2_negara_all` untuk mode `Negara-ALL` ke tabel `data_perdagangan`
- `--status export` atau `--status import`
- `--parser-profile auto` untuk deteksi otomatis
- `--folder-source` wajib diisi folder yang berisi file `.xls` atau `.xlsx`

## 7. Catatan workflow

- Dashboard Flask sudah auto-reload saat file disimpan.
- Workspace utama di sidebar: `SSINAS`, `BPS`, `TradeMap`, dan `ML Predictor`.
- SSINAS dijalankan dari dashboard karena butuh login browser manual.
- BPS bisa dijalankan dari dashboard atau terminal.
- TradeMap bisa dijalankan dari dashboard upload folder atau direct command.
- ML Predictor sekarang difokuskan ke upload dataset manual penuh dari workspace khusus di dashboard.
- Aset model ML sekarang sudah ikut di project pada `flask-scrapSSinas\resources\ml`.
- Referensi makro fallback untuk GDP dan Growth juga sudah ikut di project pada `flask-scrapSSinas\resources\ml\macro_reference.csv`.
- Template contoh dataset ML ada di `flask-scrapSSinas\static\ml`.

## 8. Alur user baru di device baru

1. Install Python sampai command `py` atau `python` tersedia.
2. Install Google Chrome kalau ingin memakai fitur `siinas.kemenperin.go.id`.
3. Buka folder root project `flask-scrapSSinas`.
4. Jalankan `install.bat` sekali untuk menyiapkan environment.
5. Jalankan `start.bat` atau `py flask-scrapSSinas run`.
6. Buka `http://127.0.0.1:5000/`.
7. Isi konfigurasi database saat first access.
8. Setelah selesai memakai aplikasi, jalankan `stop.bat`.

## 9. File launcher yang tersedia

- `install.bat`
- `run-dashboard.ps1`
- `stop-dashboard.ps1`
- `start.bat`
- `stop.bat`
- `bootstrap.py`
- `__main__.py`
- `requirements.txt`
- `run-bps.ps1`
- `app.py`
- `project_data\scrapapibps.py`
- `project_data\trademap_folder_parser.py`
- `resources\ml\model_rf_gravity.pkl`
- `resources\ml\encoder_rf_gravity.pkl`
- `resources\ml\macro_reference.csv`
- `static\ml\manual_prediction_template_full.csv`
- `static\ml\manual_prediction_example.csv`
