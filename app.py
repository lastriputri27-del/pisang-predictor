from flask import Flask, request, send_file
from flask_cors import CORS
from rembg import remove
from PIL import Image
import io
import os  # <--- Ini wajib ditambah agar bisa baca port dari Render

app = Flask(__name__)
CORS(app)

@app.route("/remove-bg", methods=["POST"])
def remove_bg():
    # Pastikan file ada dalam request
    if 'image' not in request.files:
        return {"error": "No image provided"}, 400
        
    file = request.files["image"]
    input_image = Image.open(file.stream).convert("RGBA")

    # Proses hapus background
    output = remove(input_image)

    img_io = io.BytesIO()
    output.save(img_io, 'PNG')
    img_io.seek(0)

    return send_file(img_io, mimetype='image/png')
    
if __name__ == "__main__":
    # Mengambil port dari environment variable Render, default ke 5000 jika lokal
    port = int(os.environ.get("PORT", 5000))
    # Gunakan host 0.0.0.0 agar bisa diakses secara publik oleh server Render
    app.run(host='0.0.0.0', port=port)
