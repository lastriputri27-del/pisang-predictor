from flask import Flask, request, send_file
from flask_cors import CORS
from rembg import remove
from PIL import Image
import io
import os 

app = Flask(__name__)
CORS(app)
@app.route("/")
def home():
    return "API Remove Background is running"

@app.route("/remove-bg", methods=["POST"])
def remove_bg():
   
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
    api.run()
