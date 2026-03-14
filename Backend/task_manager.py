user_db = {
    "phases": [],
    "skills": [],
    "dailyTasks": []
}

def save_dashboard_data(data):
    global user_db
    user_db["phases"] = data.get("phases", [])
    user_db["skills"] = data.get("skills", [])
    user_db["dailyTasks"] = data.get("dailyTasks", [])

def get_dashboard_data():
    return user_db