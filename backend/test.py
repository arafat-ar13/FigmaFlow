import requests
import os

def upload_image():
    upload_url = "http://127.0.0.1:5000/api/upload"
    
    with open("qr-code.png", 'rb') as img:
        files = {'image': img}
        response = requests.post(upload_url, files=files)
    
    print("Image Upload Response:", response.json())
    return response.json().get('filename')

upload_image()

