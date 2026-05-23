# QuizMind: High-Performance Neural Learning & Gamified Quiz Platform

QuizMind is a high-performance, gamified flashcard and quiz engine built with a FastAPI backend and a React/TypeScript frontend. It integrates advanced learning mechanics like **Leitner Spaced Repetition (Box 1-5)**, **Daily Focus Goals**, **Achievements Loops**, and **Background AI-Powered Question Analysis** via Gemini, wrapped inside a stunning cyberpunk-glassmorphism user interface.

---

## 1. System Architecture & Modular Layout

QuizMind is designed using a **Modular Monolith** style to enforce code isolation and keep domain logic clean. The application is divided into self-contained logical modules inside `app/modules/`:

```
QuizMind (Root)
├── app/                        # FastAPI Backend Application
│   ├── core/                   # Shared Database Config & Base Models
│   ├── modules/                # Domain-Isolated Monolith Modules
│   │   ├── quiz/               # Quiz definitions, Leitner boxes, and Excel parser
│   │   ├── auth/               # Traditional user records, hashing, and sessions
│   │   ├── gamification/       # User levels, XP increments, and badges
│   │   ├── ai/                 # Gemini integrations and explanations engine
│   │   ├── sso_module/         # Central OAuth2 Single Sign-On configs
│   │   ├── stats/              # User daily learning statistics & history
│   │   └── notification/       # Event-driven user alert messages
│   └── main.py                 # Core Application Router & Lifecycle
├── client/                     # React + TS + Vite SPA Frontend
├── docs/                       # Technical Specifications & Data Formats
└── run_quizmind.py             # Integrated Standalone Application Server
```

---

## 2. Dynamic Feature Highlights

### 🧠 Leitner Spaced Repetition System
Cards dynamically transition between five memory boxes based on performance:
- **Box 1 (New / Hard)**: Cards reset here immediately upon any wrong answer.
- **Box 2 - 4 (Progressing)**: Transitioned as consecutive correct streaks grow.
- **Box 5 (Mastered)**: Reached after 5 correct answers in a row, unlocking mastery XP.

### 🏆 Gamification Loops
Every correct or incorrect response updates user metrics through the scoring pipeline:
- **XP Progression**: Earn +10 XP for correct answers, and +2 XP for wrong attempts to reward effort.
- **Achievements System**: Auto-evaluates requirements to award special badges (e.g. *Speed Demon* for answering 5 questions under 5s each, *Perfect Score*, *Goal Crusher*).
- **Daily Discipline Goals**: A target of new, unique questions per day. Achieving it maintains streaks and triggers a **+50 XP** bonus.

### 🤖 Background AI Question Analysis
Utilizing Google's Gemini models, QuizMind runs a non-blocking background queue to generate rich learning explanations (`ai_explanation`) that parse complex language structures and automatically strip markdown formatting to output clean HTML (supporting pronunciation guides with ruby `<ruby>` markup).

---

## 3. Quick Start & Execution Guide

QuizMind can be launched as a standalone service that automatically runs database migrations, compiles production-ready frontend assets, and spins up the FastAPI web host.

### Prerequisites
- Python 3.10+
- Node.js 18+ (npm)

### Standard Standalone Launch (Fastest)
Run the master utility file in the root directory:
```bash
python run_quizmind.py
```
*This command installs Vite dependencies if missing, compiles the frontend into static distributions (`app/static/dist`), applies SQLite database migrations via Alembic, and launches Uvicorn on `http://localhost:5080`.*

### Developer Mode (Simultaneous dev servers)
For active modification of client assets with hot-reloads, launch both layers independently:

1. **Start FastAPI Backend Server**:
   ```bash
   # In QuizMind root directory
   pip install -r requirements.txt
   python -m alembic upgrade head
   python app/core/init_db.py
   python -m uvicorn app.main:app --reload --port 5080
   ```

2. **Start Vite Frontend Server**:
   ```bash
   # In c:\Code\Ecosystem\QuizMind\client
   npm install
   npm run dev
   ```
   *Navigate to `http://localhost:5173`. Any API queries will be automatically proxied to the backend port.*

---

## 4. API Reference Highlights

QuizMind exposes structured REST APIs from modular endpoints.

### Quiz & Play Data
- `GET /api/quiz/template/download`: Downloads the standard Excel template for offline card creation.
- `POST /api/quiz/upload`: Ingests a new Excel workbook, mapping sheets automatically.
- `GET /api/quiz/{quiz_id}/play-data`: Fetches a complete quiz structure, combining questions, options, Leitner box states, and user history stats.
- `POST /api/quiz/record_answer`: Logs response status, updates Spaced Repetition counters, checks milestones, and returns updated XP results.

### AI Engine
- `POST /api/quiz/{quiz_id}/ask-ai`: Dispatches background threads to request explanations from the Gemini service for a specific question.

### Gamification & Profile
- `GET /api/v1/auth/me`: Decodes session credentials, serving current level details, streaks, and authorized roles.

---

## 5. Technical Specifications Guides
- For a comprehensive guide on designing custom Excel quiz sheets, importing databases, and fuzzy answer-matching, see [docs/QUIZ_STRUCTURE.md](file:///c:/Code/Ecosystem/QuizMind/docs/QUIZ_STRUCTURE.md).
- For internal configurations of the React interface, states, routing layouts, and custom aliases, see [client/README.md](file:///c:/Code/Ecosystem/QuizMind/client/README.md).
