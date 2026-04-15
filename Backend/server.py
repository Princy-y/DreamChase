import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sock import Sock
from google import genai
from google.genai import types
from dotenv import load_dotenv
import json
import time
import base64
import io

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

app = Flask(__name__)
CORS(app)
sock = Sock(app)

client = genai.Client(api_key=API_KEY)
MODEL_ID = "gemini-2.5-flash"

# Google Search grounding tool
google_search_tool = types.Tool(google_search=types.GoogleSearch())
search_config = types.GenerateContentConfig(tools=[google_search_tool])

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
        
        image_base64 = data.get("imageBase64")
        dream = data.get("dream") or data.get("career") or data.get("query") or "Tech Professional"

        base_prompt = f"""
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

        if image_base64:
            prompt_modifier = "\n\nCRITICAL INSTRUCTION FOR ATTACHED IMAGE: A syllabus or a related photo has been attached. You MUST tailor the 7-day roadmap explicitly to the provided content. Incorporate its topics into the daily tasks."
            prompt = base_prompt + prompt_modifier
            
            # Extract actual base64 data if it has a data URI prefix
            if "base64," in image_base64:
                image_base64 = image_base64.split("base64,")[1]
                
            image_data = base64.b64decode(image_base64)
            image_part = types.Part.from_bytes(data=image_data, mime_type="image/jpeg")
            contents = [types.Content(parts=[types.Part.from_text(text=prompt), image_part])]
        else:
            contents = base_prompt

        response = client.models.generate_content(model=MODEL_ID, contents=contents, config=search_config)
        
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
        response = client.models.generate_content(model=MODEL_ID, contents=prompt, config=search_config)
        
        return jsonify({"response": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@sock.route('/ws/verify')
def verify_socket(ws):
    print("WebSocket client connected")
    
    # Session state
    latest_frame = None
    task_ctx = {}
    conversation_history = []
    
    # 1. Initial State: Live Ready
    ws.send(json.dumps({"type": "session_state", "value": "live_ready"}))
    
    while True:
        data = ws.receive()
        if not data:
            break
            
        try:
            msg = json.loads(data)
            
            if msg.get("type") == "proof_frame":
                # Store the latest frame for analysis
                frame_data = msg.get("frame")
                if frame_data and "," in frame_data:
                    latest_frame = frame_data.split(",")[1]
            
            elif msg.get("type") == "start_verification":
                task_ctx = {
                    "index": msg.get("task_index"),
                    "text": msg.get("task_text"),
                    "career": msg.get("career")
                }
                
                # 2. Transition to Verifying
                ws.send(json.dumps({"type": "session_state", "value": "verifying"}))
                
                # Dynamic Analysis using Gemini Vision
                if latest_frame:
                    prompt = f"""
                    Act as an AI Career Mentor for DreamChase. 
                    The user is becoming a {task_ctx.get('career')} and is verifying: "{task_ctx.get('text')}".
                    Look at the attached image (screen/camera proof). 
                    If it looks like they are working on the task, give a short encouraging feedback (1 sentence) and ask a relevant technical question.
                    If the proof is invalid or empty, ask them to show their work clearly.
                    Return JSON: {{"feedback": "...", "question": "..."}}
                    """
                    
                    image_data = base64.b64decode(latest_frame)
                    image_part = types.Part.from_bytes(data=image_data, mime_type="image/jpeg")
                    response = client.models.generate_content(
                        model=MODEL_ID,
                        contents=[types.Content(parts=[types.Part.from_text(text=prompt), image_part])]
                    )
                    
                    try:
                        # Attempt to parse JSON from AI response
                        result = json.loads(response.text.replace('```json', '').replace('```', '').strip())
                        feedback = result.get("feedback", "I see your progress!")
                        question = result.get("question", "How did you implement this part?")
                    except:
                        # Fallback if AI doesn't return clean JSON
                        feedback = "I see your work. Great progress!"
                        question = response.text.split('?')[0] + '?' if '?' in response.text else "Can you explain your approach?"

                    ws.send(json.dumps({"type": "mentor_prompt", "text": feedback}))
                    time.sleep(2)
                    ws.send(json.dumps({
                        "type": "verification_question",
                        "index": 1,
                        "text": question
                    }))
                    conversation_history.append({"role": "assistant", "content": question})
                else:
                    ws.send(json.dumps({"type": "mentor_prompt", "text": "I can't see your proof yet. Please share your screen or camera."}))

            elif msg.get("type") == "user_reply":
                user_text = msg.get("text")
                if not task_ctx:
                    ws.send(json.dumps({"type": "error", "message": "Session context missing. Start verification again."}))
                    continue
                    
                conversation_history.append({"role": "user", "content": user_text})
                
                # Analyze user's answer and decide if verified
                prompt = f"""
                Analyze the user's answer to the mentor's question.
                Career: {task_ctx.get('career')}, Task: {task_ctx.get('text')}
                History: {conversation_history}
                
                If the answer is correct and shows understanding, approve it.
                If it needs more detail, ask ONE follow-up question.
                
                Return JSON: {{"status": "approved" | "pending", "message": "...", "question": "..."}}
                """
                
                response = client.models.generate_content(model=MODEL_ID, contents=prompt)
                try:
                    res = json.loads(response.text.replace('```json', '').replace('```', '').strip())
                except:
                    res = {"status": "approved", "message": "Excellent work!", "question": ""}

                if res.get("status") == "approved":
                    ws.send(json.dumps({
                        "type": "verification_result",
                        "status": "approved",
                        "message": res.get("message")
                    }))
                else:
                    ws.send(json.dumps({
                        "type": "verification_question",
                        "index": 2,
                        "text": res.get("question")
                    }))
                    conversation_history.append({"role": "assistant", "content": res.get("question")})

        except Exception as e:
            print(f"WS Error: {e}")
            ws.send(json.dumps({"type": "error", "message": str(e)}))

if __name__ == "__main__":
    app.run(port=5000, debug=True)