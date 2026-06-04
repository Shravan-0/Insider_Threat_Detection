import pandas as pd

def preprocess_data(df):

    # Print columns for debugging
    print("Columns:", df.columns)

    # Handle location column safely
    if 'login_location' in df.columns:
        df['login_location'] = df['login_location'].map({
            'local': 0,
            'foreign': 1,
            'unknown': 2
        })

    return df