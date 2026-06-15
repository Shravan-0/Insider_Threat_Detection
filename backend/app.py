from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import joblib
import pandas as pd

app = Flask(__name__)
CORS(app)

# 🔥 MANAGER CONTROL CONFIG
config = {
    "fileHigh": 300,
    "emailHigh": 20,
    "after_hours_weight": 1,
    "foreign_weight": 1,
    "usb_weight": 1,
    "file_weight": 1,
    "email_weight": 1
}

# 🔧 CONFIG ROUTES
@app.route('/config', methods=['GET'])
def get_config():
    # Return both canonical and compatibility keys
    res = dict(config)
    res["file_threshold"] = config.get("fileHigh")
    res["email_threshold"] = config.get("emailHigh")
    return jsonify(res)

@app.route('/config', methods=['POST'])
def update_config_route():
    global config
    data = request.json
    # Handle compatibility mappings
    if "file_threshold" in data and "fileHigh" not in data:
        data["fileHigh"] = data["file_threshold"]
    if "email_threshold" in data and "emailHigh" not in data:
        data["emailHigh"] = data["email_threshold"]
    config.update(data)
    return jsonify({"message": "Config updated", "config": config})

# 🔥 LOAD MODEL ONCE
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "models", "isolation_model.pkl")

model = joblib.load(MODEL_PATH)


# 🚀 MAIN ML API
@app.route('/predict-batch', methods=['POST'])
def predict_batch():
    data = request.json

    df = pd.DataFrame(data)

    scores = model.decision_function(df)
    predictions = model.predict(df)

    results = []
    important_logs = []

    for i in range(len(df)):
        row = data[i]

        risk_score = float(scores[i])
        anomaly = int(predictions[i])

        # 🔥 APPLY CONFIG RULES (STRONG EFFECT)

        # Rule 1: File threshold
        file_limit = config.get("fileHigh") or config.get("file_threshold") or 300
        if row.get("files_accessed", 0) > file_limit:
            anomaly = -1

        # Rule 2: Email threshold
        email_limit = config.get("emailHigh") or config.get("email_threshold") or 20
        if row.get("emails_sent", 0) > email_limit:
            anomaly = -1

        # Rule 3: After hours weighted
        elif row.get("is_after_hours", 0) == 1 and config.get("after_hours_weight", 1) > 0:
            anomaly = -1

        # Rule 4: Foreign access
        elif row.get("is_foreign", 0) == 1 and config.get("foreign_weight", 1) > 0:
            anomaly = -1

        # Rule 5: USB usage
        elif row.get("usb_usage", 0) == 1 and config.get("usb_weight", 1) > 0:
            anomaly = -1

        res = {
            "input": row,
            "risk_score": risk_score,
            "anomaly": anomaly
        }

        results.append(res)

        # 🔥 STORE ONLY IMPORTANT LOGS
        if anomaly == -1:
            important_logs.append(res)

    # 🔥 SAVE LOGS SAFELY
    LOG_FILE = os.path.join(BASE_DIR, "..", "data", "logs.json")

    try:
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE, "r") as f:
                existing = json.load(f)
        else:
            existing = []
    except:
        existing = []  # 🔥 prevents crash if file corrupted

    existing.extend(important_logs)

    # 🔥 LIMIT LOG SIZE
    MAX_LOGS = 500
    if len(existing) > MAX_LOGS:
        existing = existing[-MAX_LOGS:]

    with open(LOG_FILE, "w") as f:
        json.dump(existing, f, indent=2)

    return jsonify(results)


# 📜 LOGS API (FIXED)
@app.route('/logs', methods=['GET'])
def get_logs():
    LOG_FILE = os.path.join(BASE_DIR, "..", "data", "logs.json")

    if not os.path.exists(LOG_FILE):
        return jsonify([])

    try:
        with open(LOG_FILE, "r") as f:
            existing = json.load(f)
    except:
        existing = []

    return jsonify(existing[-50:])  # ✅ FIXED


# 🚀 RUN SERVER
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)