from flask import Flask, render_template, request
import pytesseract
from PIL import Image
import requests
from io import BytesIO
import os

# Inisialisasi Flask
app = Flask(__name__)

# Path ke Tesseract (Windows)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

@app.route('/', methods=['GET', 'POST'])
def index():
    ocr_text = ""
    image_url = ""

    if request.method == 'POST':
        image_url = request.form.get('image_url')
        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(image_url, headers=headers)
            content_type = response.headers.get('Content-Type', '')

            if 'image' in content_type:
                img = Image.open(BytesIO(response.content)).convert("RGB")
                ocr_text = pytesseract.image_to_string(img)
            else:
                ocr_text = f"[Gagal] URL tidak mengembalikan gambar. Content-Type: {content_type}"

        except Exception as e:
            ocr_text = f"[Error] Tidak bisa mengakses gambar: {e}"

    return render_template('index.html', ocr_text=ocr_text, image_url=image_url)

if __name__ == '__main__':
    app.run(debug=True)
