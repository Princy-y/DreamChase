def get_roadmap_prompt(dream):
    return f"""
    Act as an expert Career Coach. A student wants to become a {dream}.
    Create a practical, step-by-step learning roadmap.

    CRITICAL INSTRUCTION: You MUST return ONLY valid JSON (no markdown backticks like ```json).
    Use this exact structure:
    {{
      "phases": [
        {{
          "num": "1", 
          "title": "Foundation", 
          "time": "Weeks 1-2", 
          "tasks": [
            {{"text": "Learn the basics", "done": false}},
            {{"text": "Build a small project", "done": false}}
          ]
        }}
      ],
      "skills": [
        {{"label": "Core Concept", "value": 20}}
      ],
      "dailyTasks": [
        {{"text": "Read documentation for 30 mins", "tag": "Morning", "done": false}}
      ]
    }}
    Keep it concise, highly motivating, and structure it into 3-4 distinct phases.
    """

def get_chat_prompt(user_message):
    return f"You are a helpful AI Career Mentor for DreamChase. Answer this student's question concisely: {user_message}"