from flask import Flask, render_template, request
import joblib

app = Flask(__name__)

# Load model dan vectorizer
model_camera = joblib.load("models/model_camera.pkl")
vectorizer = joblib.load("models/vectorizer.pkl")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    text = request.form['input_text']

    # Transform input text pakai vectorizer hasil training
    text_vector = vectorizer.transform([text])

    # Prediksi
    prediction = model_camera.predict(text_vector)
    result = int(prediction[0])

    return render_template('index.html', text=text, result=result)

if __name__ == '__main__':
    app.run(debug=True)
