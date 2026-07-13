# DashboardScraper - Trade Data Scraping & Analytics Dashboard

DashboardScraper adalah aplikasi dashboard berbasis **Flask** untuk membantu proses pengumpulan, integrasi, dan pemrosesan data perdagangan dari beberapa sumber, termasuk **siinas.kemenperin.go.id**, **BPS**, dan **TradeMap**. Project ini juga dilengkapi workspace **Machine Learning Predictor** untuk prediksi potensi nilai ekspor menggunakan model gravity trade.

Repository: https://github.com/TegarCode/DashboardScraper

## Deskripsi Project

Project ini dibuat untuk menyatukan beberapa workflow data perdagangan ke dalam satu dashboard lokal. Aplikasi membantu user menjalankan scraper, parser, setup database, monitoring background job, serta melakukan prediksi berbasis machine learning dari dataset manual.

Fokus utama project:

- Scraping data dari portal **siinas.kemenperin.go.id** dengan bantuan Selenium.
- Pengambilan data perdagangan dari **BPS Trade API**.
- Parsing file export/import dari **TradeMap**.
- Penyimpanan hasil proses ke database MySQL.
- Dashboard monitoring job dan status proses.
- Prediksi potensi ekspor menggunakan model machine learning.

Project ini cocok untuk portfolio **data analyst**, **data engineer**, dan **business intelligence**, karena mencakup alur dari data acquisition, database integration, automation, hingga analytics.

## Latar Belakang

Analisis perdagangan internasional membutuhkan data dari berbagai sumber. Dalam praktiknya, data tersebut sering tersebar di portal berbeda, memiliki format file yang tidak seragam, dan membutuhkan proses pembersihan sebelum dapat digunakan untuk analisis.

DashboardScraper menyederhanakan proses tersebut dengan menyediakan satu aplikasi terpusat untuk:

- Menarik data dari sumber resmi.
- Mengelola konfigurasi database.
- Menjalankan proses scraping/parsing sebagai background job.
- Menyimpan hasil ke schema database yang konsisten.
- Menyediakan output yang siap dianalisis lebih lanjut.

## Fitur Utama

### 1. Workspace SSINAS

Workspace untuk scraping portal **siinas.kemenperin.go.id**.

Fitur:

- Membuka Chrome secara otomatis menggunakan Selenium.
- Mendukung login manual dan sesi browser aktif.
- Mengatur rentang halaman scraping.
- Mengambil data perusahaan dari portal.
- Menyimpan hasil ke database.
- Mendukung stop job dari dashboard.

### 2. Workspace BPS

Workspace untuk mengambil data perdagangan dari **BPS Trade API**.

Fitur:

- Runner gabungan untuk data export/import.
- Pilihan tahun otomatis mengikuti 10 tahun terakhir.
- Menggunakan daftar HS Code dari resource project.
- Dapat dijalankan dari dashboard atau terminal.
- Mendukung mode dry-run untuk validasi.

### 3. Workspace TradeMap

Workspace untuk memproses file hasil export dari TradeMap.

Fitur:

- Upload folder berisi file `.xls` atau `.xlsx`.
- Deteksi format file TradeMap.
- Parsing data Negara-Mitra.
- Parsing data Negara-ALL.
- Insert hasil parsing ke tabel database yang sesuai.
- Mendukung status data export/import.

### 4. Workspace ML Predictor

Workspace untuk prediksi nilai ekspor menggunakan model machine learning berbasis gravity trade.

Fitur:

- Upload dataset manual dalam format CSV atau Excel.
- Template dataset tersedia di folder `static/ml`.
- Model menggunakan file resource lokal.
- Hasil prediksi ditampilkan sebagai preview.
- Output lengkap dapat diunduh sebagai CSV.

## Tools dan Teknologi

| Kategori | Tools |
| --- | --- |
| Backend web | Flask |
| Bahasa pemrograman | Python |
| Database | MySQL |
| Scraping browser | Selenium |
| HTTP request | Requests |
| HTML parsing | BeautifulSoup, lxml |
| Data processing | Pandas, OpenPyXL, xlrd |
| Machine learning | Scikit-learn, Joblib |
| Model ML | Random Forest Gravity Trade |
| Frontend | HTML, CSS, Jinja Template |
| Automation | Batch script, PowerShell script |

## Struktur Project

```text
DashboardScraper/
├── app.py                         # Aplikasi utama Flask
├── bootstrap.py                   # Launcher auto setup virtualenv dan dependency
├── cli.py                         # CLI run/stop dashboard
├── db_runtime.py                  # Setup dan validasi database runtime
├── job_manager.py                 # Manajemen background job
├── scraper.py                     # Scraper SSINAS berbasis Selenium
├── tool_registry.py               # Registry workspace dan tool dashboard
├── ml_predictor.py                # Logic prediksi ML gravity trade
├── project_data/
│   ├── scrapapibps.py             # Runner BPS Trade API
│   ├── trademap_folder_parser.py  # Parser folder TradeMap
│   └── bps_paths.py               # Resolver file resource BPS
├── resources/
│   ├── bps/                       # File referensi HS Code BPS
│   └── ml/                        # Model, encoder, dan referensi makro ML
├── static/
│   ├── dashboard.css              # Styling dashboard
│   └── ml/                        # Template dataset ML
├── templates/                     # Template HTML dashboard
├── flask.sql                      # Schema utama database
├── data_perdagangan (2).sql       # Schema tambahan data perdagangan
├── requirements.txt               # Dependency Python
├── START_PROJECT.md               # Catatan command operasional
├── install.bat                    # Setup environment Windows
├── start.bat                      # Jalankan dashboard Windows
├── stop.bat                       # Stop dashboard Windows
├── run-dashboard.ps1              # Runner PowerShell dashboard
├── stop-dashboard.ps1             # Stop dashboard PowerShell
└── run-bps.ps1                    # Runner BPS via PowerShell
```

## Database

Aplikasi menggunakan MySQL sebagai database utama. Saat first access, user akan diarahkan ke halaman setup database:

```text
http://127.0.0.1:5000/setup/database
```

Setelah konfigurasi valid, aplikasi akan membuat atau menyesuaikan schema berdasarkan file:

- `flask.sql`
- `data_perdagangan (2).sql`

Beberapa tabel penting:

| Tabel | Fungsi |
| --- | --- |
| `perusahaan` | Menyimpan data hasil scraping SSINAS |
| `tbtrade` | Menyimpan data perdagangan |
| `tbnegara` | Referensi negara |
| `tbsumber` | Referensi sumber data |
| `data_perdagangan_full_v3` | Tabel hasil parser TradeMap model Negara-Mitra |
| `data_perdagangan` | Tabel hasil parser TradeMap model Negara-ALL |
| `ref_negara` | Mapping nama negara dan kode Alpha-3 |

## Cara Menjalankan Project

### 1. Clone Repository

```bash
git clone https://github.com/TegarCode/DashboardScraper.git
cd DashboardScraper
```

Jika repository menggunakan Git LFS untuk file model besar, jalankan:

```bash
git lfs install
git lfs pull
```

### 2. Install Python dan Chrome

Pastikan sudah tersedia:

- Python 3
- Google Chrome, terutama untuk fitur SSINAS berbasis Selenium
- MySQL Server

### 3. Setup Environment

Cara paling mudah di Windows:

```bat
install.bat
```

Atau via terminal:

```bash
py flask-scrapSSinas install
```

Launcher akan membuat virtual environment lokal `.venv` dan menginstall dependency dari `requirements.txt`.

### 4. Jalankan Dashboard

Cara mudah di Windows:

```bat
start.bat
```

Atau via terminal:

```bash
py flask-scrapSSinas run
```

Alternatif langsung:

```bash
python app.py
```

Buka dashboard:

```text
http://127.0.0.1:5000/
```

### 5. Setup Database

Pada akses pertama, buka:

```text
http://127.0.0.1:5000/setup/database
```

Isi konfigurasi MySQL:

- Host
- Port
- User
- Password
- Nama database

Setelah konfigurasi berhasil, dashboard akan masuk ke halaman utama.

### 6. Stop Dashboard

```bat
stop.bat
```

Atau:

```bash
py flask-scrapSSinas stop
```

## Menjalankan BPS dari Terminal

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

Alternatif langsung:

```bash
py .\project_data\scrapapibps.py --year 2025 --flow export
```

## Menjalankan Parser TradeMap dari Terminal

Mode Negara-Mitra:

```bash
py .\project_data\trademap_folder_parser.py --parser-mode model_1_default --status export --parser-profile auto --folder-source "C:\path\folder\TradeMap"
```

Mode Negara-ALL:

```bash
py .\project_data\trademap_folder_parser.py --parser-mode model_2_negara_all --status import --parser-profile auto --folder-source "C:\path\folder\TradeMap"
```

Dry-run:

```bash
py .\project_data\trademap_folder_parser.py --parser-mode model_1_default --status export --parser-profile auto --folder-source "C:\path\folder\TradeMap" --dry-run
```

## ML Predictor

Workspace ML digunakan untuk memprediksi potensi nilai ekspor menggunakan model gravity trade.

Input utama berupa dataset manual dengan format yang sesuai template. File contoh tersedia di:

```text
static/ml/manual_prediction_template_full.csv
static/ml/manual_prediction_example.csv
```

Kolom utama pada template:

- `Reporter`
- `Partner`
- `HS4`
- `Year`
- `Reporter_GDP`
- `Partner_GDP`
- `Reporter_Growth`
- `Partner_Growth`
- `Status`

Catatan:

- Model difokuskan untuk data dengan `Status = Export`.
- Nilai HS4 akan dinormalisasi oleh sistem.
- Hasil prediksi dapat diunduh sebagai CSV.

## Dependency Utama

Daftar dependency berada di `requirements.txt`:

```text
Flask
mysql-connector-python
pandas
requests
beautifulsoup4
selenium
joblib
scikit-learn
openpyxl
lxml
xlrd
```

## Workflow User Baru

1. Clone repository.
2. Pull Git LFS jika model belum terunduh.
3. Pastikan Python, MySQL, dan Google Chrome tersedia.
4. Jalankan `install.bat`.
5. Jalankan `start.bat`.
6. Buka `http://127.0.0.1:5000/`.
7. Isi konfigurasi database.
8. Pilih workspace: SSINAS, BPS, TradeMap, atau ML Predictor.
9. Jalankan tool sesuai kebutuhan.
10. Unduh atau gunakan hasil output untuk analisis lanjutan.

## Use Case

Project ini dapat digunakan untuk:

- Pengumpulan data perdagangan dari berbagai sumber.
- Automasi scraping dan parsing data.
- Integrasi data ke MySQL.
- Monitoring job scraping dari dashboard.
- Persiapan dataset untuk analisis perdagangan internasional.
- Prediksi potensi nilai ekspor berbasis machine learning.
- Portfolio data analyst, data engineer, dan BI developer.

## Nilai Portfolio

Project ini menunjukkan kemampuan dalam:

- Web dashboard development dengan Flask.
- Scraping dan browser automation.
- Integrasi API dan parsing file.
- Database design dan SQL schema management.
- Background job management.
- Data pipeline untuk perdagangan internasional.
- Machine learning deployment dalam dashboard.
- Pengemasan aplikasi agar mudah dijalankan di device baru.

## Author

**Tegar Oktavianto Simbolon**  
Data Analyst | Information Systems Graduate

Fokus pada data analysis, data engineering, ETL, scraping automation, machine learning, dan dashboard development.
