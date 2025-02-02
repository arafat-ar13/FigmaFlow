from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import os
from werkzeug.utils import secure_filename
from PIL import Image

app = Flask(__name__)
CORS(app=app)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def hello_world():
    return 'Hello, World!'

@app.route('/api/test', methods=['GET'])
def test_endpoint():
    return jsonify({
        "message": "This is a test response",
        "status": "success",
        "data": {
            "sample": "value",
            "number": 42
        }
    })

@app.route('/api/process', methods=['POST'])
def process_data():
    data = request.get_json()
    
    # Extract the data
    code = data.get('code')
    prompt = data.get('prompt')
    
    # You can process the data here
    # For now, let's just echo it back
    return jsonify({
        "status": "success",
        "received_data": {
            "code": code,
            "prompt": prompt
        }
    })

@app.route('/api/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image file"}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = f"{UPLOAD_FOLDER}/{file.filename}"

        img_file = Image.open(file)

        img_file.save(filepath)
        
        return jsonify({
            "status": "success",
            "message": "File uploaded successfully",
            "filename": filename
        })

if __name__ == '__main__':
    app.run(debug=True)