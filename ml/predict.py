import json
import sys
from pathlib import Path

import joblib
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"
ISOLATION_MODEL_PATH = MODEL_DIR / "isolation_model.pkl"
RANDOM_FOREST_MODEL_PATH = MODEL_DIR / "insider_model.pkl"

FEATURES = [
    "login_hour",
    "files_accessed",
    "usb_usage",
    "emails_sent",
    "is_after_hours",
    "is_foreign",
    "high_file_access",
    "high_email_activity",
]


def normalize_record(record):
    login_hour = record.get("login_hour", record.get("loginHour", 0))
    files_accessed = record.get("files_accessed", record.get("fileAccessCount", 0))
    usb_usage = record.get("usb_usage", record.get("usbUsage", 0))
    emails_sent = record.get("emails_sent", record.get("emailCount", 0))
    is_foreign = record.get("is_foreign", record.get("isForeign", 0))
    location = str(record.get("location", "")).lower()

    if location == "foreign":
        is_foreign = 1

    login_hour = int(float(login_hour or 0))
    files_accessed = int(float(files_accessed or 0))
    emails_sent = int(float(emails_sent or 0))

    return {
        "login_hour": login_hour,
        "files_accessed": files_accessed,
        "usb_usage": int(float(usb_usage or 0)),
        "emails_sent": emails_sent,
        "is_after_hours": int(record.get("is_after_hours", record.get("isAfterHours", int(login_hour >= 22 or login_hour <= 6))) or 0),
        "is_foreign": int(float(is_foreign or 0)),
        "high_file_access": int(record.get("high_file_access", record.get("highFileAccess", int(files_accessed > 300))) or 0),
        "high_email_activity": int(record.get("high_email_activity", record.get("highEmailActivity", int(emails_sent > 80))) or 0),
    }


def load_optional_model(path):
    if not path.exists():
        return None
    try:
        return joblib.load(path)
    except Exception:
        return None


def normalize_anomaly_risk(score):
    # IsolationForest decision_function: lower values are more anomalous.
    risk = max(0.0, min(100.0, (0.08 - float(score)) * 625))
    return round(risk, 2)


def fallback_result():
    return {
        "anomaly": 1,
        "anomalyScore": 0.0,
        "normalizedAnomalyRisk": 0.0,
        "randomForestClass": None,
        "randomForestConfidence": None,
        "mlAvailable": False,
        "mlError": "Model unavailable",
    }


def main():
    payload = json.load(sys.stdin)
    records = payload.get("records", [])

    if not records:
        json.dump([], sys.stdout)
        return

    if not ISOLATION_MODEL_PATH.exists():
        json.dump([fallback_result() for _ in records], sys.stdout)
        return

    normalized = [normalize_record(record) for record in records]
    df = pd.DataFrame(normalized, columns=FEATURES)

    try:
        isolation_model = joblib.load(ISOLATION_MODEL_PATH)
    except Exception:
        json.dump([fallback_result() for _ in records], sys.stdout)
        return

    anomaly_scores = isolation_model.decision_function(df)
    anomaly_predictions = isolation_model.predict(df)

    random_forest = load_optional_model(RANDOM_FOREST_MODEL_PATH)
    rf_predictions = [None] * len(df)
    rf_confidence = [None] * len(df)

    if random_forest is not None:
        try:
            rf_predictions = random_forest.predict(df).tolist()
            if hasattr(random_forest, "predict_proba"):
                rf_confidence = [round(float(max(row)), 4) for row in random_forest.predict_proba(df)]
        except Exception:
            rf_predictions = [None] * len(df)
            rf_confidence = [None] * len(df)

    results = []
    for index, score in enumerate(anomaly_scores):
        results.append(
            {
                "anomaly": int(anomaly_predictions[index]),
                "anomalyScore": float(score),
                "normalizedAnomalyRisk": normalize_anomaly_risk(score),
                "randomForestClass": None if rf_predictions[index] is None else str(rf_predictions[index]),
                "randomForestConfidence": rf_confidence[index],
                "mlAvailable": True,
            }
        )

    json.dump(results, sys.stdout)


if __name__ == "__main__":
    main()
