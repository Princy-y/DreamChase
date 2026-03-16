import os
import json
import asyncio
import base64
import traceback
import warnings  # Added to hide warnings!
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from google import genai
from dotenv import load_dotenv

# Hide the scary yellow warnings from the terminal
warnings.filterwarnings("ignore")

load_dotenv()

app = FastAPI()

# The official model that successfully connected for you
MODEL_ID = "gemini-2.5-flash-native-audio-preview-12-2025" 
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(
    api_key=GEMINI_API_KEY, 
    http_options={'api_version': 'v1alpha'}
)

@app.websocket("/ws/verify")
async def verification_socket(websocket: WebSocket):
    await websocket.accept()
    print("\n Mentor Session Started")

    try:
        initial_setup = await websocket.receive_text()
        setup_data = json.loads(initial_setup)
        task_text = setup_data.get("task_text", "General Progress")

        config = {
            "system_instruction": {
                "parts": [{"text": f"You are the DreamChase AI Mentor. Verifying: '{task_text}'. 1. If screen/camera is visible, ask 1 question about it. 2. If audio-only, ask 1 conceptual question. 3. If correct, say EXACTLY: VERIFICATION_SUCCESSFUL."}]
            },
            "response_modalities": ["AUDIO"]
        }

        async with client.aio.live.connect(model=MODEL_ID, config=config) as session:
            print("Connected to Google's Live Server! Listening to mic...")
            
            async def send_to_gemini():
                async for message in websocket.iter_text():
                    data = json.loads(message)
                    
                    if "realtimeInput" in data:
                        for chunk in data["realtimeInput"].get("mediaChunks", []):
                            b64_data = chunk["data"]
                            # Fix mathematical padding from the browser
                            b64_data += "=" * ((4 - len(b64_data) % 4) % 4)
                            
                            await session.send(input={
                                "mime_type": chunk["mimeType"], 
                                "data": base64.b64decode(b64_data)
                            })
                    
                    if data.get("type") == "start_verification":
                        prompt = "The student just clicked verify! Please say hello and ask your 1 question right now."
                        await session.send(input=prompt, end_of_turn=True)

            async def receive_from_gemini():
                async for response in session.receive():
                    if response.server_content and response.server_content.model_turn:
                        for part in response.server_content.model_turn.parts:
                            
                            if part.inline_data:
                                audio_b64 = base64.b64encode(part.inline_data.data).decode('utf-8')
                                await websocket.send_json({
                                    "type": "assistant_audio", 
                                    "data": audio_b64
                                })
                            
                            if part.text:
                                await websocket.send_json({
                                    "type": "assistant_transcript",
                                    "text": part.text
                                })
                                if "VERIFICATION_SUCCESSFUL" in part.text:
                                    await websocket.send_json({
                                        "type": "verification_result",
                                        "status": "approved",
                                        "message": "Excellent work! Verification complete."
                                    })

            await asyncio.gather(send_to_gemini(), receive_from_gemini())

    except WebSocketDisconnect:
        print(" Session ended by student.")
    except Exception as e:
        print(f"\nSERVER CRASHED! Here is the exact reason:")
        traceback.print_exc()
        try:
            await websocket.send_json({"type": "error", "message": "Backend crashed! Check Python terminal."})
        except:
            pass
    finally:
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)