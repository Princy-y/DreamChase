import json
from prompts import get_roadmap_prompt
from gemini_service import generate_ai_response
from task_manager import save_dashboard_data

def process_roadmap(dream):
    prompt = get_roadmap_prompt(dream)
    raw_response = generate_ai_response(prompt)
    
    if not raw_response:
        raise Exception("Failed to get response from AI")

    clean_json = raw_response.replace('```json', '').replace('```', '').strip()
    roadmap_data = json.loads(clean_json)
    
    save_dashboard_data(roadmap_data)
    
    html_output = ""
    for phase in roadmap_data.get("phases", []):
        html_output += f'<div class="rm-h2">Phase {phase["num"]}: {phase["title"]}</div>\n'
        for i, task in enumerate(phase["tasks"]):
            html_output += f'''
            <div class="rm-step">
              <div class="rm-num">{i+1}</div>
              <div class="rm-p"><span class="rm-bold">Task:</span> {task["text"]}</div>
            </div>
            '''
    
    return html_output