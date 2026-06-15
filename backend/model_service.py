import joblib
import pandas as pd


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "models", "isolation_model.pkl")

model = joblib.load(MODEL_PATH)

def predict_risk(data):
    df = pd.DataFrame([data])

    # Remove label if accidentally passed
    if 'is_threat' in df.columns:
        df = df.drop(columns=['is_threat'])

    # Keep only numeric
    df = df.select_dtypes(include=['number'])

    score = model.decision_function(df)
    prediction = model.predict(df)

    return {
        "risk_score": float(score[0]),
        "anomaly": int(prediction[0])
    }