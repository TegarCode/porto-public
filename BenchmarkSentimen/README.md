# Benchmark Sentimen - Aspect-Based Sentiment Analysis Smartphone

## 📌 Deskripsi Project

**Benchmark Sentimen** adalah project penelitian dan implementasi dashboard untuk melakukan **Aspect-Based Sentiment Analysis (ABSA)** pada data multimodal Twitter dengan studi kasus produk smartphone. Project ini dikembangkan sebagai bagian dari skripsi berjudul **"Aspect-Based Sentiment Analysis pada Data Multimodal Twitter untuk Benchmark Performa Produk Studi Kasus Smartphone"**.

Sistem ini dirancang untuk membantu menganalisis opini pengguna media sosial secara lebih detail, tidak hanya menentukan sentimen umum, tetapi juga mengidentifikasi sentimen berdasarkan aspek produk seperti kamera, baterai, performa, layar, jaringan, memori, dan aspek smartphone lainnya.

Selain analisis berbasis teks, project ini juga mendukung data multimodal melalui pemrosesan gambar menggunakan OCR, sehingga teks yang terdapat pada gambar di Twitter dapat ikut dianalisis.

---

## 🎯 Latar Belakang Masalah

Perkembangan industri smartphone membuat opini pengguna di media sosial menjadi sumber informasi yang sangat berharga untuk memahami persepsi pasar. Pengguna Twitter sering membagikan pengalaman terkait berbagai aspek produk, misalnya kualitas kamera, daya tahan baterai, performa, jaringan, layar, suara, hingga fitur pendukung.

Namun, analisis sentimen konvensional umumnya hanya mengklasifikasikan opini menjadi positif, negatif, atau netral secara umum. Pendekatan tersebut belum cukup untuk menjawab pertanyaan yang lebih spesifik, seperti:

- Aspek apa yang paling sering mendapat sentimen positif?
- Fitur apa yang paling banyak dikeluhkan pengguna?
- Bagaimana perbandingan persepsi pengguna terhadap beberapa produk smartphone?
- Apakah informasi pada gambar juga memuat opini yang relevan?

Oleh karena itu, project ini menggunakan pendekatan **Aspect-Based Sentiment Analysis** untuk menghasilkan insight yang lebih granular dan relevan bagi benchmarking performa produk smartphone.

---

## ⚙️ Metodologi

Tahapan utama dalam project ini meliputi:

### 1. Scraping Data Twitter

Data dikumpulkan dari Twitter untuk memperoleh opini pengguna terkait produk smartphone. Berdasarkan portfolio, jumlah data awal yang dikumpulkan adalah **12.777 tweet**.

### 2. Data Labeling

Data diberi label oleh **lima anotator** untuk mengidentifikasi aspek produk dan sentimen pada masing-masing aspek. Label digunakan untuk membangun dataset supervised learning.

### 3. Preprocessing Teks

Pipeline preprocessing digunakan untuk membersihkan dan menyiapkan teks sebelum masuk ke model machine learning. Tahapan yang digunakan meliputi:

- Case folding
- Cleaning URL, HTML, angka, emoji, simbol, mention, dan hashtag
- Normalisasi kata tidak baku menggunakan kamus alay
- Tokenizing
- Stopword removal
- Stemming
- Penggabungan teks tweet dengan hasil OCR gambar

### 4. Data Augmentation

Karena jumlah data valid setelah pelabelan dan pembersihan masih terbatas, dilakukan augmentasi data untuk memperkaya variasi data latih. Teknik yang digunakan mencakup:

- Backtranslation
- Synonym replacement

### 5. Feature Extraction dengan TF-IDF

Teks yang telah diproses diubah menjadi representasi numerik menggunakan **TF-IDF (Term Frequency-Inverse Document Frequency)** agar dapat digunakan oleh model klasifikasi.

### 6. Modeling dengan SVM

Model klasifikasi dibangun menggunakan **Support Vector Machine (SVM)** untuk memprediksi sentimen pada setiap aspek. Evaluasi dilakukan melalui beberapa skenario eksperimen, termasuk penggunaan undersampling dan hyperparameter tuning dengan GridSearchCV.

---

## 📊 Dataset

Berdasarkan portfolio project:

| Tahap Dataset | Jumlah Data |
| --- | ---: |
| Data awal hasil scraping Twitter | 12.777 tweet |
| Data valid setelah labeling dan cleaning | 3.468 data |
| Data setelah augmentasi | 6.851 data |

Aspek yang dianalisis dalam project:

- Network
- Body
- Display
- Platform
- Performance
- Memory
- Camera
- Sound
- Communications
- Features
- Battery
- Accessories

---

## 🧠 Model & Evaluasi

Model utama yang digunakan adalah **Support Vector Machine (SVM)** dengan ekstraksi fitur **TF-IDF**. Evaluasi dilakukan menggunakan:

- Confusion matrix
- Accuracy
- Precision
- Recall
- F1-score
- K-Fold Cross Validation
- GridSearchCV untuk tuning parameter

Berdasarkan portfolio, dari 12 skenario pengujian, **Skenario 12** dengan kombinasi **undersampling + GridSearchCV** dan split data **80:20** menghasilkan performa terbaik dan paling stabil.

Berdasarkan file evaluasi `results_skenario_12.json`, performa rata-rata pada data uji untuk 12 aspek adalah:

| Metrik | Nilai |
| --- | ---: |
| Rata-rata Test Accuracy | 97,99% |
| Rata-rata Weighted F1-score | 97,95% |
| Rentang Test Accuracy per aspek | 96,06% - 99,42% |

Beberapa aspek dengan performa test accuracy tertinggi:

| Aspek | Test Accuracy | Weighted F1-score |
| --- | ---: | ---: |
| Sound | 99,42% | 99,42% |
| Platform | 98,83% | 98,88% |
| Memory | 98,69% | 98,66% |
| Body | 98,54% | 98,49% |

Confusion matrix digunakan untuk melihat distribusi prediksi benar dan salah pada tiap kelas sentimen, sehingga performa model dapat dievaluasi secara lebih detail pada masing-masing aspek.

---

## 🌐 Implementasi Aplikasi

Project ini diimplementasikan sebagai aplikasi web berbasis **Flask**. Aplikasi memuat model hasil training dalam format `.pkl` dan menyediakan antarmuka dashboard untuk melakukan analisis sentimen.

Teknologi utama yang digunakan:

- Python
- Flask
- Pandas
- NumPy
- Scikit-learn
- NLTK
- Sastrawi
- Pytesseract / OCR
- Plotly
- Matplotlib
- HTML, CSS

### Dukungan Multimodal

Aplikasi mendukung pemrosesan data multimodal berupa:

- **Teks tweet** melalui kolom `full_text`
- **Gambar** melalui `image_url`, kemudian diproses menggunakan OCR

Hasil OCR digabungkan dengan teks tweet, lalu diproses menggunakan pipeline preprocessing dan diklasifikasikan menggunakan model SVM per aspek.

---

## 📈 Fitur Dashboard

Fitur utama aplikasi:

- Prediksi sentimen berbasis input teks
- Upload file CSV berisi data Twitter
- Validasi kolom input seperti `full_text` dan `image_url`
- OCR otomatis untuk mengekstrak teks dari gambar
- Preprocessing otomatis pada teks dan hasil OCR
- Prediksi sentimen untuk 12 aspek smartphone
- Visualisasi hasil analisis menggunakan chart
- Perbandingan hasil antar file CSV
- Download hasil prediksi dalam format CSV

Dashboard ini dapat digunakan untuk membantu proses benchmarking produk smartphone berdasarkan opini pengguna di media sosial.

---

## 📁 Struktur Project

```text
BenchmarkSentimen/
├── app.py                         # Aplikasi utama Flask
├── app1.py                        # Eksperimen aplikasi tambahan
├── app3.py                        # Eksperimen aplikasi tambahan
├── requirements.txt               # Daftar dependency Python
├── Skripsijosjaya.ipynb           # Notebook eksperimen skripsi
├── results_skenario_*.json        # Hasil evaluasi model per skenario
├── models/                        # Model SVM dan vectorizer TF-IDF
├── static/                        # Asset, kamus alay, dan folder upload
├── templates/                     # Template HTML dashboard
└── hasil/                         # Output hasil prediksi
```

---

## 🚀 Cara Menjalankan Project

### 1. Clone Repository

```bash
git clone https://github.com/TegarCode/BenchmarkSentimen.git
cd BenchmarkSentimen
```

### 2. Buat Virtual Environment

```bash
python -m venv venv
```

Aktifkan virtual environment:

```bash
# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate
```

### 3. Install Dependency

```bash
pip install -r requirements.txt
```

### 4. Konfigurasi Tesseract OCR

Pastikan Tesseract OCR sudah terinstal. Pada Windows, path default yang digunakan di `app.py` adalah:

```text
C:\Program Files\Tesseract-OCR\tesseract.exe
```

Jika lokasi instalasi berbeda, sesuaikan konfigurasi berikut di `app.py`:

```python
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

### 5. Jalankan Aplikasi

```bash
python app.py
```

Aplikasi dapat diakses melalui browser pada:

```text
http://localhost:5000
```

---

## 📊 AdventureWorks ETL Dashboard

Selain project skripsi Benchmark Sentimen, portfolio juga mencakup project **AdventureWorks ETL Dashboard**, yaitu dashboard analitik yang dibangun untuk mengeksplorasi dan memvisualisasikan data hasil proses ETL ke dalam database relasional.

### Deskripsi Project

AdventureWorks ETL Dashboard berfokus pada pengolahan data penjualan dan penyajiannya dalam bentuk dashboard interaktif. Project ini membantu pengguna melihat performa penjualan dari berbagai perspektif bisnis, seperti waktu, produk, wilayah, dan alasan penjualan.

### Tujuan

- Mengintegrasikan data dari proses ETL ke dalam database relasional
- Menyediakan visualisasi performa penjualan
- Mendukung analisis penjualan berdasarkan dimensi bisnis
- Membantu pengguna memahami pola dan tren penjualan secara lebih cepat

### Tools yang Digunakan

- Pentaho Data Integration (PDI)
- Mondrian OLAP
- Database relasional
- SQL
- Dashboard visualisasi berbasis web

### Proses ETL

Proses utama dalam project:

- **Extract**: Mengambil data sumber yang relevan untuk analisis penjualan
- **Transform**: Membersihkan, menyesuaikan struktur, dan membentuk data agar siap dianalisis
- **Load**: Memuat data hasil transformasi ke database relasional

### Insight yang Dihasilkan

Dashboard digunakan untuk melihat insight seperti:

- Tren penjualan berdasarkan waktu
- Performa penjualan berdasarkan produk
- Distribusi penjualan berdasarkan wilayah
- Analisis alasan penjualan
- Ringkasan performa bisnis dari data AdventureWorks

### Use Case Dashboard

AdventureWorks ETL Dashboard dapat digunakan sebagai contoh implementasi data warehouse sederhana untuk:

- Monitoring performa penjualan
- Eksplorasi data historis
- Analisis multidimensi berbasis OLAP
- Demonstrasi proses ETL end-to-end
- Portfolio project di bidang data analyst dan business intelligence

---

## 🧩 Value Project untuk Portfolio

Project ini menunjukkan kemampuan dalam beberapa area penting:

- Natural Language Processing
- Aspect-Based Sentiment Analysis
- Machine Learning classification
- Data preprocessing dan data augmentation
- Model evaluation berbasis metrik yang terukur
- Pengembangan dashboard berbasis Flask
- Integrasi OCR untuk data multimodal
- Visualisasi data untuk mendukung pengambilan keputusan
- ETL dan dashboard analytics melalui project AdventureWorks

---

## 👤 Author

**Tegar Oktavianto Simbolon**  
Data Analyst | Information Systems Graduate  
Fokus pada data analysis, machine learning, sentiment analysis, ETL, dan dashboard development.

Repository: [BenchmarkSentimen](https://github.com/TegarCode/BenchmarkSentimen)
