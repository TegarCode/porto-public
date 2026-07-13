from flask import Flask, render_template, request, send_file
import pandas as pd
import joblib
import pytesseract
from PIL import Image
import os
import requests
from io import BytesIO
import uuid
import base64
import plotly.graph_objects as go
import json
import re
import nltk
from nltk.corpus import stopwords
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from nltk.stem import PorterStemmer
from nltk.stem.snowball import SnowballStemmer



# Inisialisasi Flask app
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads/'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Load model dan vectorizer
aspects = ["network", "body", "display", "platform", "performance", "memory",
           "camera", "sound", "communications", "features", "battery", "accessories"]
models = {aspect: joblib.load(f"models/model_{aspect}.pkl") for aspect in aspects}
vectorizer = joblib.load("models/vectorizer.pkl")

# Konfigurasi Tesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'



def remove_URL(text):
    url = re.compile(r'http[s]?://\S+')
    return url.sub(r'', text)

def remove_html(text):
    html = re.compile(r'<.*?>')
    return html.sub(r'', text)

def remove_numbers_with_words(text):
    text = re.sub(r'\b\d+[a-zA-Z]+\b', '', text)
    text = re.sub(r'\b\d+\b', '', text)
    return text

def remove_emoji(text):
    emoji_pattern = re.compile("[" 
                               u"\U0001F600-\U0001F64F"  # emoticon
                               u"\U0001F300-\U0001F5FF"  # simbol lainnya
                               u"\U0001F680-\U0001F6FF"  # simbol kendaraan
                               u"\U0001F1E0-\U0001F1FF"  # simbol bendera
                               "]+", flags=re.UNICODE)
    return emoji_pattern.sub(r'', text)

def remove_acc_and_hashtag(text):
    # Hapus @username
    text = re.sub(r'@\w+', '', text)
    # Hapus #hashtag
    text = re.sub(r'#\w+', '', text)
    return text

def remove_symbols(text):
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    return text


kamus_alay = pd.read_csv('static/kamus_alay.csv')  # Sesuaikan path dengan lokasi file kamus_alay.csv Anda

# Konversi ke dictionary
alay_dict = dict(zip(kamus_alay['slang'], kamus_alay['formal']))

# Fungsi normalisasi alay
def normalisasi_alay(text):
    if isinstance(text, str):
        return ' '.join([alay_dict.get(kata, kata) for kata in text.split()])
    else:
        return text

# Fungsi Tokenization
def tokenize(text):
    tokens = text.split()  # Memisahkan teks menjadi token berdasarkan spasi
    return tokens

# Pastikan stopwords di-download
nltk.download('stopwords')

# Memuat stopwords Bahasa Indonesia dari NLTK
stop_words = set(stopwords.words('indonesian'))

# Menambahkan stopwords custom (opsional)
custom_stopwords = {"iphone", "Huawei", "s24", "xt", "pro", "max", "pura", "ulta", "ai", "samsung", "pro", "handphone", "produk", "apple","16", "ada", "adalah",
                    "adanya", "adapun", "agak", "agaknya", "agar", "akan", "akankah", "akhir", "akhiri", "akhirnya",
    "aku", "akulah", "amat", "amatlah", "anda", "andalah", "antar", "antara", "antaranya", "apa", "apaan", "apabila", "apakah", "apalagi", "apatah", "artinya",
    "asal", "asalkan", "atas", "atau", "ataukah", "ataupun", "awal", "awalnya", "bagai", "bagaikan", "bagaimana", "bagaimanakah", "bagaimanapun", "bagi", "bagian",
    "bahkan", "bahwa", "bahwasanya", "baik", "bakal", "bakalan", "balik", "banyak", "bapak", "baru", "bawah", "beberapa", "begini", "beginian", "beginikah",
    "beginilah", "begitu", "begitukah", "begitulah", "begitupun", "bekerja", "belakang", "belakangan", "belum", "belumlah", "benar", "benarkah", "benarlah",
    "berada", "berakhir", "berakhirlah", "berakhirnya", "berapa", "berapakah", "berapalah", "berapapun", "berarti", "berawal", "berbagai", "berdatangan", "beri",
    "berikan", "berikut", "berikutnya", "berjumlah", "berkali-kali", "berkata", "berkehendak", "berkeinginan", "berkenaan", "berlainan", "berlalu", "berlangsung",
    "berlebihan", "bermacam", "bermacam-macam", "bermaksud", "bermula", "bersama", "bersama-sama", "bersiap", "bersiap-siap", "bertanya", "bertanya-tanya",
    "berturut", "berturut-turut", "bertutur", "berujar", "berupa", "besar", "betul", "betulkah", "biasa", "biasanya", "bila", "bilakah", "bisa", "bisakah", "boleh",
    "bolehkah", "bolehlah", "buat", "bukan", "bukankah", "bukanlah", "bukannya", "bulan", "bung", "cara", "caranya", "cukup", "cukupkah", "cukuplah", "cuma",
    "dahulu", "dalam", "dan", "dapat", "dari", "daripada", "datang", "dekat", "demi", "demikian", "demikianlah", "dengan", "depan", "di", "dia", "diakhiri",
    "diakhirinya", "dialah", "diantara", "diantaranya", "diberi", "diberikan", "diberikannya", "dibuat", "dibuatnya", "didapat", "didatangkan", "digunakan",
    "diibaratkan", "diibaratkannya", "diingat", "diingatkan", "diinginkan", "dijawab", "dijelaskan", "dijelaskannya", "dikarenakan", "dikatakan", "dikatakannya",
    "dikerjakan", "diketahui", "diketahuinya", "dikira", "dilakukan", "dilalui", "dilihat", "dimaksud", "dimaksudkan", "dimaksudkannya", "dimaksudnya", "diminta",
    "dimintai", "dimisalkan", "dimulai", "dimulailah", "dimulainya", "dimungkinkan", "dini", "dipastikan", "diperbuat", "diperbuatnya", "dipergunakan",
    "diperkirakan", "diperlihatkan", "diperlukan", "diperlukannya", "dipersoalkan", "dipertanyakan", "dipunyai", "diri", "dirinya", "disampaikan", "disebut",
    "disebutkan", "disebutkannya", "disini", "disinilah", "ditambahkan", "ditandaskan", "ditanya", "ditanyai", "ditanyakan", "ditegaskan", "ditujukan", "ditunjuk",
    "ditunjuki", "ditunjukkan", "ditunjukkannya", "ditunjuknya", "dituturkan", "dituturkannya", "diucapkan", "diucapkannya", "diungkapkan", "dong", "dua", "dulu",
    "empat", "enggaknya", "entah", "entahlah", "guna", "gunakan", "hal", "hampir", "hanya", "hanyalah", "hari", "harus", "haruslah", "harusnya", "hendak",
    "hendaklah", "hendaknya", "hingga", "ia", "ialah", "ibarat", "ibaratkan", "ibaratnya", "ibu", "ikut", "ingat", "ingat-ingat", "ingin", "inginkah", "inginkan",
    "ini", "inikah", "inilah", "itu", "itukah", "itulah", "jadi", "jadilah", "jadinya", "jangan", "jangankan", "janganlah", "jauh", "jawab", "jawaban", "jawabnya",
    "jelas", "jelaskan", "jelaslah", "jelasnya", "jika", "jikalau", "juga", "jumlah", "jumlahnya", "justru", "kala", "kalau", "kalaulah", "kalaupun", "kalian",
    "kami", "kamilah", "kamu", "kamulah", "kan", "kapan", "kapankah", "kapanpun", "karena", "karenanya", "kasus", "kata", "katakan", "katakanlah", "katanya",
    "ke", "keadaan", "kebetulan", "kecil", "kedua", "keduanya", "keinginan", "kelamaan", "kelihatan", "kelihatannya", "kelima", "keluar", "kembali", "kemudian",
    "kemungkinan", "kemungkinannya", "kenapa", "kepada", "kepadanya", "kesampaian", "keseluruhan", "keseluruhannya", "keterlaluan", "ketika", "khususnya", "kini",
    "kinilah", "kira", "kira-kira", "kiranya", "kita", "kitalah", "kok", "kurang", "lagi", "lagian", "lah", "lain", "lainnya", "lalu", "lama", "lamanya", "lanjut",
    "lanjutnya", "lebih", "lewat", "lima", "luar", "macam", "maka", "makanya", "makin", "malah", "malahan", "mampu", "mampukah", "mana", "manakala", "manalagi",
    "masa", "masalah", "masalahnya", "masih", "masihkah", "masing", "masing-masing", "mau", "maupun", "melainkan", "melakukan", "melalui", "melihat",
    "melihatnya", "memang", "memastikan", "memberi", "memberikan", "membuat", "memerlukan", "memihak", "meminta", "memintakan", "memisalkan", "memperbuat",
    "mempergunakan", "memperkirakan", "memperlihatkan", "mempersiapkan", "mempersoalkan", "mempertanyakan", "mempunyai", "memulai", "memungkinkan", "menaiki",
    "menambahkan", "menandaskan", "menanti", "menanti-nanti", "menantikan", "menanya", "menanyai", "menanyakan", "mendapat", "mendapatkan", "mendatang",
    "mendatangi", "mendatangkan", "menegaskan", "mengakhiri", "mengapa", "mengatakan", "mengatakannya", "mengenai", "mengerjakan", "mengetahui", "menggunakan",
    "menghendaki", "mengibaratkan", "mengibaratkannya", "mengingat", "mengingatkan", "menginginkan", "mengira", "mengucapkan", "mengucapkannya",
    "mengungkapkan", "menjadi", "menjawab", "menjelaskan", "menuju", "menunjuk", "menunjuki", "menunjukkan", "menunjuknya", "menurut", "menuturkan",
    "menyampaikan", "menyangkut", "menyatakan", "menyebutkan", "menyeluruh", "menyiapkan", "merasa", "mereka", "merekalah", "merupakan", "meski", "meskipun",
    "meyakini", "meyakinkan", "minta", "mirip", "misal", "misalkan", "misalnya", "mula", "mulai", "mulailah", "mulanya", "mungkin", "mungkinkah", "nah", "naik",
    "namun", "nanti", "nantinya", "nyaris", "nyatanya", "oleh", "olehnya", "pada", "padahal", "padanya", "pak", "paling", "panjang", "pantas", "para", "pasti",
    "pastilah", "penting", "pentingnya", "per", "percuma", "perlu", "perlukah", "perlunya", "pernah", "persoalan", "pertama", "pertama-tama", "pertanyaan",
    "pertanyakan", "pihak", "pihaknya", "pukul", "pula", "pun", "punya", "rasa", "rasanya", "rata", "rupanya", "saat", "saatnya", "saja", "sajalah", "saling",
    "sama", "sama-sama", "sambil", "sampai", "sampai-sampai", "sampaikan", "sana", "sangat", "sangatlah", "satu", "saya", "sayalah", "se", "sebab", "sebabnya",
    "sebagai", "sebagaimana", "sebagainya", "sebagian", "sebaik", "sebaik-baiknya", "sebaiknya", "sebaliknya", "sebanyak", "sebegini", "sebegitu", "sebelum",
    "sebelumnya", "sebenarnya", "seberapa", "sebesar", "sebetulnya", "sebisanya", "sebuah", "sebut", "sebutlah", "sebutnya", "secara", "secukupnya", "sedang",
    "sedangkan", "sedemikian", "sedikit", "sedikitnya", "seenaknya", "segala", "segalanya", "segera", "seharusnya", "sehingga", "seingat", "sejak", "sejauh",
    "sejenak", "sejumlah", "sekadar", "sekadarnya", "sekali", "sekali-kali", "sekalian", "sekaligus", "sekalipun", "sekarang", "sekecil", "seketika", "sekiranya",
    "sekitar", "sekitarnya", "sekurang-kurangnya", "sekurangnya", "sela", "selain", "selaku", "selalu", "selama", "selama-lamanya", "selamanya", "selanjutnya",
    "seluruh", "seluruhnya", "semacam", "semakin", "semampu", "semampunya", "semasa", "semasih", "semata", "semata-mata", "semaunya", "sementara", "semisal",
    "semisalnya", "sempat", "semua", "semuanya", "semula", "sendiri", "sendirian", "sendirinya", "seolah", "seolah-olah", "seorang", "sepanjang", "sepantasnya",
    "sepantasnyalah", "seperlunya", "seperti", "sepertinya", "sepihak", "sering", "seringnya", "serta", "serupa", "sesaat", "sesama", "sesampai", "sesegera",
    "sesekali", "seseorang", "sesuatu", "sesuatunya", "sesudah", "sesudahnya", "setelah", "setempat", "setengah", "seterusnya", "setiap", "setiba", "setibanya",
    "setidak-tidaknya", "setidaknya", "setinggi", "seusai", "sewaktu", "siap", "siapa", "siapakah", "siapapun", "sini", "sinilah", "soal", "soalnya", "suatu",
    "sudah", "sudahkah", "sudahlah", "supaya", "tadi", "tadinya", "tahu", "tahun", "tak", "tambah", "tambahnya", "tampak", "tampaknya", "tandas", "tandasnya",
    "tanpa", "tanya", "tanyakan", "tanyanya", "tapi", "tegas", "tegasnya", "telah", "tempat", "tengah", "tentang", "tentu", "tentulah", "tentunya", "tepat",
    "terakhir", "terasa", "terbanyak", "terdahulu", "terdapat", "terdiri", "terhadap", "terhadapnya", "teringat", "teringat-ingat", "terjadi", "terjadilah",
    "terjadinya", "terkira", "terlalu", "terlebih", "terlihat", "termasuk", "ternyata", "tersampaikan", "tersebut", "tersebutlah", "tertentu", "tertuju", "terus",
    "terutama", "tetap", "tetapi", "tiap", "tiba", "tiba-tiba", "tidakkah", "tidaklah", "tiga", "tinggi", "toh", "tunjuk", "turut", "tutur", "tuturnya", "ucap",
    "ucapnya", "ujar", "ujarnya", "umum", "umumnya", "ungkap", "ungkapnya", "untuk", "usah", "usai", "waduh", "wah", "wahai", "waktu", "waktunya", "walau",
    "walaupun", "wong", "yaitu", "yakin", "yakni", "yang"}  # Add your stopwords here
stop_words.update(custom_stopwords)

# Fungsi untuk melakukan stopword removal
def remove_stopwords(tokens):
    if isinstance(tokens, list):  # Pastikan input adalah list (tokenized words)
        return [word for word in tokens if word.lower() not in stop_words]
    return tokens  # Jika input bukan list, kembalikan tanpa perubahan

    


# Fungsi cleaning dan normalisasi
def clean_and_normalize_text(text):
    text = remove_URL(text)
    text = remove_html(text)
    text = remove_emoji(text)
    text = remove_symbols(text)
    text = remove_numbers_with_words(text)
    text = remove_acc_and_hashtag(text)
    text = normalisasi_alay(text)  # Menambahkan normalisasi setelah cleaning
    return text

factory = StemmerFactory()
stemmer = factory.create_stemmer()

# Fungsi untuk melakukan stemming pada teks
def stem_text(text):
    return [stemmer.stem(word) for word in text]


def case_folding(text):
    if isinstance(text, str):
        return text.lower()  # Mengubah semua teks menjadi huruf kecil
    return text

# Fungsi untuk preprocessing lengkap: case folding, cleaning, tokenization, stopword removal, dan stemming
def preprocess_text(text):
    # Case Folding
    text = case_folding(text)

    # Cleaning dan Normalisasi
    text = clean_and_normalize_text(text)

    # Tokenization
    tokens = tokenize(text)

    # Stopword Removal
    filtered_tokens = remove_stopwords(tokens)

    # Stemming
    stemmed_tokens = stem_text(filtered_tokens)

    # Gabungkan kembali token yang sudah di-stem menjadi string
    stemmed_text = ' '.join(stemmed_tokens)

    return stemmed_text



@app.route('/text_prediction', methods=['GET', 'POST'])
def text_prediction():
    if request.method == 'POST':
        text = request.form.get('comment')

        if not text or text.strip() == '':
            return render_template('text_prediction.html', error="Masukkan komentar terlebih dahulu")

        # Proses Preprocessing Lengkap: Case Folding, Cleaning, Tokenization, Stopword Removal, dan Stemming
        processed_text = preprocess_text(text)  # Langsung proses semua tahapan preprocessing

        # Transformasi teks komentar yang telah di-stem dan diproses
        X = vectorizer.transform([processed_text])

        predictions = []

        # Melakukan prediksi untuk setiap aspek
        for aspect in aspects:
            prediction = models[aspect].predict(X)[0]
            if prediction != 0:  # Tampilkan hanya jika tidak netral
                sentiment_label = "Positif" if prediction == 2 else "Negatif"
                predictions.append((aspect, sentiment_label))

        # Tampilkan hasil prediksi atau pesan jika tidak ada prediksi yang relevan
        if predictions:
            return render_template("text_prediction.html", text=text, predictions=predictions)
        else:
            return render_template("text_prediction.html", text=text, no_aspect=True)

    return render_template("text_prediction.html")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process_csv', methods=['POST'])
def process_csv():
    file1 = request.files.get('file_csv1')
    file2 = request.files.get('file_csv2')

    if not file1 and not file2:
        return "⚠️ Minimal upload satu file CSV."

    headers = {'User-Agent': 'Mozilla/5.0'}

    def process_file(file):
        df = pd.read_csv(file, encoding='latin1')
        if 'full_text' not in df.columns or 'image_url' not in df.columns:
            return None, None, None, "⚠️ Kolom 'full_text' dan 'image_url' wajib ada."

        ocr_texts = []
        for _, row in df.iterrows():
            try:
                res = requests.get(row['image_url'], headers=headers, timeout=10)
                if 'image' in res.headers.get('Content-Type', ''):
                    img = Image.open(BytesIO(res.content)).convert("RGB")
                    text = pytesseract.image_to_string(img)
                else:
                    text = ""
            except:
                text = ""
            ocr_texts.append(text)

        df['ocr_text'] = ocr_texts
        df['combined_text'] = df['full_text'] + " " + df['ocr_text']

        # Proses Preprocessing: Case Folding, Cleaning, Tokenization, Stopword Removal, dan Stemming pada combined_text
        df['combined_text'] = df['combined_text'].fillna('')
        df['processed_combined_text'] = df['combined_text'].apply(preprocess_text)

        # Transformasi teks yang telah diproses
        X = vectorizer.transform(df['processed_combined_text'])

        # Hitung jumlah positif untuk setiap aspek
        for aspect in aspects:
            df[f'pred_{aspect}'] = models[aspect].predict(X)

        # Hitung jumlah positif untuk setiap aspek
        positive_counts = {aspect: (df[f'pred_{aspect}'] == 2).sum() for aspect in aspects}
        
        # Hitung persentase positif untuk setiap aspek
        positive_percentages = {aspect: (df[f'pred_{aspect}'] == 2).sum() / len(df) * 100 for aspect in aspects}

        filename = f"{uuid.uuid4()}.csv"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        df.to_csv(filepath, index=False)

        return positive_counts, positive_percentages, filename, df.shape[0], None  # Mengembalikan jumlah positif, persentase positif, filename, dan jumlah baris

    result_counts = []
    result_percentages = []
    dataset_ids = []
    dataset_sizes = []

    if file1:
        counts1, percentages1, filename1, size1, err1 = process_file(file1)
        if err1:
            return err1
        result_counts.append(counts1)
        result_percentages.append(percentages1)
        dataset_ids.append(filename1)
        dataset_sizes.append(size1)

    if file2:
        counts2, percentages2, filename2, size2, err2 = process_file(file2)
        if err2:
            return err2
        result_counts.append(counts2)
        result_percentages.append(percentages2)
        dataset_ids.append(filename2)
        dataset_sizes.append(size2)

    def generate_spider_chart(result_percentages, aspects_group, chart_id):
        fig = go.Figure()

        colors = ['red', 'blue']
        for i, counts in enumerate(result_percentages):
            values = [counts[a] for a in aspects_group]
            fig.add_trace(go.Scatterpolar(
                r=values + [values[0]],  # Menambahkan nilai pertama di akhir untuk membuat lingkaran
                theta=aspects_group + [aspects_group[0]],  # Menambahkan aspek pertama di akhir
                fill='toself',
                name=f'Dataset {i+1}',
                line_color=colors[i]
            ))

        fig.update_layout(
            polar=dict(radialaxis=dict(visible=True)),
            showlegend=True,
            margin=dict(l=30, r=30, t=30, b=30),
            height=500
        )

        chart_html = fig.to_html(full_html=False, include_plotlyjs=False, div_id=chart_id)
        return chart_html

    # Menghasilkan grafik spider chart berdasarkan persentase positif
    spider_chart_1 = generate_spider_chart(result_percentages, aspects[:6], 'chart1')
    spider_chart_2 = generate_spider_chart(result_percentages, aspects[6:], 'chart2')

    return render_template(
        'result.html',
        aspects=aspects,
        spider_chart_1=spider_chart_1,
        spider_chart_2=spider_chart_2,
        result_counts=result_counts,  # Menampilkan jumlah positif di tabel
        result_percentages=result_percentages,  # Menampilkan persentase positif di grafik
        dataset_ids=dataset_ids,
        dataset_sizes=dataset_sizes
    )


@app.route('/download_result/<filename>')
def download_result(filename):
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return "⚠️ File tidak ditemukan.", 404
    return send_file(filepath, as_attachment=True, download_name=filename)

if __name__ == '__main__':
    app.run(debug=True)
