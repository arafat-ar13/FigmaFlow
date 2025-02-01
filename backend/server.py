from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin

app = Flask(__name__)
CORS(app=app)

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

if __name__ == '__main__':
    app.run(debug=True)