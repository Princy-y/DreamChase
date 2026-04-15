import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")
try:
    response = model.generate_content("What is the stock price of google today?", tools='google_search_retrieval')
    print("Success:", response.text[:50])
except Exception as e:
    print("Error:", e)
