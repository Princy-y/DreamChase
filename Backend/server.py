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

@app.route("/generate-roadmap", methods=["POST"])
def generate_roadmap():
    try:
        data = request.json
        
        dream = data.get("dream") or data.get("career") or data.get("query") or "Tech Professional"

        prompt = f"""
        Act as an expert Career Coach. A student wants to become a {dream}.
        Create a practical, step-by-step learning roadmap.

        CRITICAL INSTRUCTION: You MUST return the response ONLY as valid HTML code. 
        Do not use markdown backticks (```html).
        Use ONLY these specific HTML structures to format your response:

        1. For phase or week headings: 
           <div class="rm-h2">Phase 1: Title</div>
           
        2. For specific tasks/steps:
           <div class="rm-step">
             <div class="rm-num">#</div>
             <div class="rm-p"><span class="rm-bold">Task:</span> Description here</div>
           </div>
           
        3. For bullet points (resources, tips):
           <div class="rm-bullet">
             <div class="rm-dot"></div>
             <div class="rm-p">Your tip or resource link</div>
           </div>

        Keep it concise, highly motivating, and structure it into 3-4 distinct phases.
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