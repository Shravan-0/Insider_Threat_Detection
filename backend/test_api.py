import requests

url = "http://127.0.0.1:5000/predict"

data = {
    "login_hour": 2,
    "files_accessed": 80,
    "usb_usage": 1,
    "emails_sent": 25,
    "is_after_hours": 1,
    "is_foreign": 1,
    "high_file_access": 1,
    "high_email_activity": 1
}

response = requests.post(url, json=data)

print(response.json())