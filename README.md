# 🚀 DreamChase — AI-Powered Career Coaching Platform

DreamChase is a gamified, AI-driven career coaching platform that transforms your dream career into a personalized, actionable learning roadmap. Powered by **Google Gemini**, it features real-time AI mentor verification, XP progression, and multimodal learning support.

## ✨ Key Features

- **AI Roadmap Generation** — Enter any dream career and get a personalized 7-day learning plan with curated resources, powered by Gemini with Google Search grounding.
- **Multimodal Input** — Upload a syllabus photo or screenshot and the AI tailors the roadmap to your specific curriculum.
- **Live AI Mentor Verification** — Share your screen or camera, and the AI mentor visually verifies your work using Gemini Vision, asks follow-up questions, and awards XP + Gold Stars.
- **Text-to-Speech Mentor Voice** — The AI speaks questions aloud with a premium, humanoid voice while the central orb pulses in sync.
- **Gamified Progression** — XP system, Gold Stars, task locking/unlocking, level-up celebrations with confetti animations.
- **Dual Completion Paths** — Mark tasks as done (+25 XP) or verify with an AI mentor (+100 XP + ⭐).
- **Firebase Google OAuth** — One-click Google login with Firebase Authentication.

## 🛠️ Tech Stack

| Layer     | Technology                                         |
|-----------|-----------------------------------------------------|
| Frontend  | HTML5, CSS3 (Glassmorphism), Vanilla JavaScript     |
| Backend   | Python, Flask, Flask-Sock (WebSockets)              |
| AI Engine | Google Gemini 2.5 Flash (via `google-genai` SDK)    |
| Auth      | Firebase Authentication (Google OAuth)              |
| Search    | Google Search Grounding (for verified resource URLs)|

## 📁 Project Structure

```
DreamChase/
├── Backend/
│   ├── server.py          # Flask API + WebSocket verification server
│   ├── requirements.txt   # Python dependencies
│   └── .env               # API keys (not committed)
├── Frontend/
│   ├── index.html         # Landing page + roadmap generator
│   ├── dashboard.html     # Career dashboard with XP & task tracking
│   ├── chat.html          # Live AI mentor verification page
│   ├── login.html         # Authentication page
│   ├── css/style.css      # Full design system
│   └── js/
│       ├── app.js         # Landing page logic
│       ├── roadmap.js     # Dashboard + task locking + XP system
│       ├── chat.js        # WebSocket verification + TTS + media capture
│       ├── login.js       # Firebase Auth + email/password login
│       └── progress.js    # Progress tracking visuals
└── .gitignore
```

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- A [Google Gemini API Key](https://aistudio.google.com/apikey)

### 1. Clone & Setup Backend

```bash
git clone https://github.com/your-username/DreamChase.git
cd DreamChase/Backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start the server
python server.py
```

### 2. Open Frontend

Simply open `Frontend/index.html` in your browser, or serve it with any static server:

```bash
cd Frontend
python -m http.server 8000
# Then visit http://localhost:8000
```

### 3. Demo Login

- **Email:** `test@dream.com`
- **Password:** `123`

Or sign in with Google (Firebase OAuth).

## 🎮 How It Works

1. **Generate** → Enter your dream career on the homepage. The AI creates a 7-day plan.
2. **Track** → View your roadmap on the Dashboard. Complete tasks to earn XP.
3. **Verify** → Click "Verify with Mentor" on any task. Share your screen, and the AI visually confirms your work.
4. **Level Up** → Complete all 7 tasks to unlock the next level with celebratory animations.

