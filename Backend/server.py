import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

app = Flask(__name__)
CORS(app)

genai.configure(api_key=API_KEY)
model = genai.GenerativeModel("gemini-3.1-flash-lite-preview")

# A simple in-memory database
# This resets when the server restarts, but it's perfect for a demo!
USERS_DB = {
    "test@dream.com": {"password": "123", "name": "Dream"}
}

@app.route("/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return jsonify({"message": "CORS preflight"}), 200

    try:
        data = request.json
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        # Auto-Registration : If it's a new email, create the account instantly!
        if email not in USERS_DB:
            # Extract the first part of the email to use as their name
            name = email.split("@")[0].capitalize()
            USERS_DB[email] = {"password": password, "name": name}
            print(f"New user auto-registered: {name} ({email})")

        # Verify Password
        if USERS_DB[email]["password"] == password:
            return jsonify({
                "success": True, 
                "name": USERS_DB[email]["name"], 
                "email": email
            }), 200
        else:
            return jsonify({"success": False, "error": "Incorrect password. Try again!"}), 401

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/generate-roadmap", methods=["POST"])
def generate_roadmap():
    try:
        data = request.json
        
        dream = data.get("dream") or data.get("career") or data.get("query") or "Tech Professional"

        prompt = f"""
        Act as an expert Career Coach. A student wants to become a {dream}.
        Create a practical, step-by-step 7-day learning roadmap, starting from absolute beginner.
        Break it down into simple, achievable DAILY tasks. Do not use broad phases.

        CRITICAL INSTRUCTION: You MUST return the response ONLY as valid HTML code. 
        Do not use markdown backticks (```html).
        Use ONLY these specific HTML structures:

        1. For the Day heading: 
           <div class="rm-h2">Task 1: [Topic]</div>
           
        2. For the specific daily task (Make it simple and actionable for 1 hour):
           <div class="rm-step task-step">
             <div class="rm-num">☐</div>
             <div class="rm-p"><span class="rm-bold">Action:</span> [Specific 1-hour task]</div>
           </div>
           
        3. For resources:
           <div class="rm-bullet">
             <div class="rm-dot"></div>
             <div class="rm-p">[Link/Resource]</div>
           </div>

        Generate exactly 7 tasks. Keep it concise, highly motivating, and achievable.
        """

        response = model.generate_content(prompt)
        
        html_output = response.text.replace('```html', '').replace('```', '').strip()

        return jsonify({"roadmap": html_output, "message": html_output, "data": html_output})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/chat", methods=["POST"])
def chat_mentor():
    try:
        data = request.json
        user_message = data.get("message", "")
        
        prompt = f"You are a helpful AI Career Mentor for DreamChase. Answer this student's question concisely: {user_message}"
        response = model.generate_content(prompt)
        
        return jsonify({"response": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000, debug=True)