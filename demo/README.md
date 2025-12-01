# Aether: The Cognitive RPG

**Master knowledge through the art of teaching. Restore the Archives.**

Aether is a gamified learning platform that leverages the **Feynman Technique**. Instead of answering multiple-choice questions, players must explain concepts to AI characters to prove their understanding.

---

## 🚀 Features

### 1. The Neural Map (Knowledge Graph)
- Visual representation of your knowledge.
- **Force-Directed Graph**: Interactive nodes representing concepts.
- **Status System**:
    - 🔒 **Locked**: Prerequisites not met.
    - 🔴 **Corrupted**: Needs restoration (learning).
    - 🔵 **Restored**: Mastered concepts.

### 2. Quest System (The Feynman Loop)
- **Briefing**: Receive context and learning materials.
- **Battle (The Teaching Phase)**:
    - Chat interface with an AI "student".
    - Explain the concept in your own words.
    - AI challenges your understanding with follow-up questions.
- **Grading**:
    - Real-time analysis of your explanation.
    - Scores based on Accuracy, Clarity, and Completeness.
    - XP rewards for passing.

### 3. RPG Progression
- **Profile**: Track Level, XP, and Character Class.
- **Achievements**: Unlock badges for milestones (e.g., "First Step", "Scholar").
- **Leaderboard**: Compete with other operatives globally.

### 4. Cyberpunk Aesthetic
- Immersive UI with glassmorphism, neon accents, and CRT effects.
- Sound effects and ambient music for deep focus.

---

## 🛠️ Technical Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: TailwindCSS, Lucide React
- **Visualization**: React Force Graph, Recharts
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI/LLM**: Groq API (Llama 3 70B) via Supabase Edge Functions
- **Deployment**: Render (Static Site)

---

## 📦 Setup Instructions

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-repo/aether-rpg.git
    cd aether-rpg
    ```

2.  **Install dependencies**:
    ```bash
    cd cyberpunk-ui
    npm install
    ```

3.  **Environment Variables**:
    Create a `.env` file in `cyberpunk-ui` with:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_anon_key
    GROQ_API_KEY=your_groq_api_key
    ```

4.  **Run Locally**:
    ```bash
    npm run dev
    ```

---

## 🔑 Demo Credentials

To access the live demo without signing up:

- **URL**: [https://aether-cognitive-rpg.onrender.com](https://aether-cognitive-rpg.onrender.com)
- **Email**: `demo@aether.com`
- **Password**: `password123`

*(Note: Ensure this user exists in your Supabase Auth)*

---

## 📡 API Documentation (Edge Functions)

### `feynman-grader`
Analyzes user explanations and awards XP.

- **Endpoint**: `/functions/v1/feynman-grader`
- **Method**: `POST`
- **Body**:
    ```json
    {
      "questId": "uuid",
      "userExplanation": "string",
      "conversationHistory": [...]
    }
    ```
- **Response**:
    ```json
    {
      "score": 85,
      "feedback": "Good explanation, but you missed...",
      "passed": true,
      "xp": 100
    }
    ```

---

## 🏆 Credits

- **Design & Development**: [Your Name/Team]
- **AI Model**: Meta Llama 3 via Groq
- **Icons**: Lucide
