# ♟️ ChessV - Vision-Powered Chess Analyzer

ChessV is an AI-powered chess analysis tool that converts board images into FEN notation, evaluates positions using Stockfish, and provides rich strategic and tactical explanations with the help of a multimodal LLM (Groq). It supports advanced engine analysis and visualizations to guide both casual and advanced players through chess reasoning.

---

## 🧠 Key Features

- 🔍 **Image-to-FEN Recognition**: Upload an image of a physical or digital chessboard to automatically detect the FEN position.
- ♟️ **Stockfish Evaluation**: Suggests the top 3 engine-recommended moves and visualizes them.
- 📊 **Move Analysis & Simulation**:
  - Visualizes each suggested move with a rendered board.
  - Simulates and saves future move sequences from those moves.
- 🧠 **Groq LLM Explanation**: Each top move is described with:
  - **Best Move Explanation**
  - **Strategic Idea**
  - **Tactical Motif**
- 🧮 **Advanced Move Ranking**: Scores and ranks moves using factors like engine evaluation, complexity, positional impact, and tactic types.

---

## 🗂️ Project Structure

```
CHESSV/
├── modules/               # All core Python modules (image → FEN, engine logic, LLM, etc.)
├── static/                # Static files (uploads, artifacts, rendered images)
├── stockfish/             # Stockfish engine binary
├── ui/                    # Frontend React+Vite project (runs on port 3000)
├── weights/               # Any model weights (if used)
└── flask_app.py           # Main Flask backend server (runs on port 5000)
```

---

## 🚀 Getting Started

### 1. 📦 Backend Setup

Ensure Python ≥ 3.8 and install dependencies (via `requirements.txt`, assumed to exist):

```bash
cd CHESSV
pip install -r requirements.txt
```

Run the Flask server:

```bash
python flask_app.py
```

The backend will start on: `http://localhost:5000`

---

### 2. 🌐 Frontend Setup

In a separate terminal:

```bash
cd CHESSV/ui
npm install
npm run dev
```

The frontend will start on: `http://localhost:3000`

---

## 🛠️ Backend API Endpoints

### `POST /api/analyze`
Accepts an uploaded image of a chessboard and optional `turn` (White/Black).  
Returns:
- Generated FEN
- Top 3 move suggestions
- Rendered board images
- Natural language reasoning via Groq
- Advanced move analysis

### `GET /api/sequence/<int:move_id>`
Returns the future move sequence visualizations for a given move suggestion ID.

### `GET /api/health`
Simple health check: returns status OK if server is up.

---

## 🔬 Deep Dive: `flask_app.py` Core Logic

1. **Image Upload & Preprocessing**:
   - Saves the uploaded image to `static/uploads`
   - Converts image → FEN using `get_fen_from_image`

2. **Engine Analysis**:
   - Top 3 moves generated using Stockfish
   - Rendered via `render_board_with_move`

3. **Groq-Powered Explanation**:
   - Custom prompt built using FEN, move, PV, and score
   - Returns structured sections (Best Move, Strategic Idea, Tactical Motif)
   - Parsed by `parse_explanation`

4. **Advanced Scoring**:
   - Uses `perform_advanced_analysis` to score and rank all top moves based on:
     - Engine Eval
     - Complexity
     - Positional Strength
     - Tactical Themes

5. **Simulation**:
   - Future sequences are simulated and saved per move in `static/artifacts/sequences`

---

## 📷 Example Flow

1. Upload an image of a chessboard (e.g., from a tournament).
2. Backend detects the position and evaluates it.
3. Get back:
   - FEN
   - Best moves
   - Explanation of why it’s the best
   - Rendered PNG images
4. Optional: View simulation of how a position could evolve from each move.

---

## 🧩 Tech Stack

| Component   | Technology          |
|-------------|---------------------|
| Backend     | Python, Flask       |
| Frontend    | React, Vite, TypeScript |
| Chess Engine| Stockfish           |
| AI/NLP      | Groq API (LLM-based Explanation) |
| Image Parsing | OpenCV, CV model for board detection |

---

## 🧠 Future Enhancements

- [ ] OCR for player names and move history
- [ ] Support for PDF score sheets
- [ ] Real-time webcam integration
- [ ] User accounts and game tracking

---

## 👨‍💻 Author

**Adarsh Kesharwani**  
Frontend + Backend developer • AI/ML Enthusiast • Chess Tech Explorer

---

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## 📬 Feedback or Issues?

Raise an issue or drop feedback via GitHub Issues or Discussions tab.
