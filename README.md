# In_Threat

AI-powered Insider Threat Detection System that uses behavioral analytics, machine learning, and role-based access control (RBAC) to identify suspicious employee activities and generate real-time risk alerts.

---

## Features

* JWT Authentication
* Role-Based Access Control (Admin, Manager, Employee)
* Employee Activity Monitoring
* Insider Risk Scoring
* Machine Learning Threat Detection
* Alert Generation
* Dashboard Analytics
* Manager Configuration Panel
* MongoDB Integration
* Real-Time Risk Evaluation

---

## System Architecture

![Architecture](screenshots/architecture-diagram.png)
![Use_Case](screenshots/Use-Case-diagram.png)

---

## Tech Stack

### Frontend

* React.js
* Material UI
* Axios
* Recharts

### Backend

* Node.js
* Express.js
* JWT Authentication

### Database

* MongoDB
* Mongoose

### Machine Learning

* Python
* Scikit-Learn
* Isolation Forest
* Pandas
* NumPy

---

## Project Structure

```text
IN_THREAT/

├── backend/
├── frontend/
├── ml/
├── configs/
├── data/
├── notebooks/
├── screenshots/

├── README.md
├── requirements.txt
└── .gitignore
```

---

## Screenshots

### Login Page

![Login](screenshots/login-page.png)

### Dashboard Overview
//Admin
![Dashboard](screenshots/dashboard-overview(1).png)
![Dashboard](screenshots/dashboard-overview(2).png)

### Risk Prediction

![Risk Prediction](screenshots/risk-prediction.png)

### Alerts Management

![Alerts](screenshots/alerts-page.png)

### Activity Logs

![Logs](screenshots/activity-logs.png)

### Manager Configuration Panel

![Manager Config](screenshots/manager-config-panel.png)

### User Management

![Users](screenshots/user-management.png)

---

## Machine Learning

The system uses an Isolation Forest model to identify abnormal employee behavior and generate risk scores.

### Features Used

* File Access Count
* Email Activity
* Failed Logins
* USB Usage
* Login Time
* Network Activity

---

## Installation

### Clone Repository

```bash
git clone https://github.com/Shravan-0/In_Threat.git
cd In_Threat
```

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm start
```

### Machine Learning Service

```bash
cd ml
pip install -r requirements.txt
python predict.py
```

---

## Future Improvements

* Explainable AI (XAI)
* SIEM Integration
* Cloud Deployment
* Real-Time Monitoring Agents
* Blockchain Audit Logging
* Automated Incident Response

---

## License

This project is licensed under the MIT License.
