import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib
from preprocess import preprocess_data

df = pd.read_csv('../data/insider_threat_processed.csv')

df = preprocess_data(df)

# ❌ Remove label column
if 'is_threat' in df.columns:
    df = df.drop(columns=['is_threat'])

# Keep only numeric columns
X = df.select_dtypes(include=['number'])

model = IsolationForest(
    n_estimators=100,
    contamination=0.1,
    random_state=42
)

model.fit(X)

joblib.dump(model, 'isolation_model.pkl')

print("✅ Model trained correctly (no leakage)")