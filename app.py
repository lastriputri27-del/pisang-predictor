from flask import Flask, request, send_file
from flask_cors import CORS
from rembg import remove
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

@app.route("/api/remove-bg", methods=["POST"])
def remove_bg():
    file = request.files.get("image")

    if not file:
        return {"error": "No image uploaded"}, 400

    input_image = Image.open(file.stream).convert("RGBA")
    output = remove(input_image)

    img_io = io.BytesIO()
    output.save(img_io, format="PNG")
    img_io.seek(0)

    return send_file(img_io, mimetype="image/png")


# 🔥 INI YANG PENTING (entry point Vercel)
def handler(environ, start_response):
    return app(environ, start_response)
