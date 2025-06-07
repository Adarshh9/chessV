# modules/groq_explainer.py

import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()  # Load .env file if exists

def build_prompt(fen, best_move, pv_line, score):
    move_sequence = " → ".join([move.uci() for move in pv_line])
    return f"""
You are a chess coach helping a beginner understand a position.

Position (FEN): {fen}  
Recommended move: {best_move.uci()}  
Principal variation: {move_sequence}  
Engine evaluation: {score}

Please explain the following in simple, clear, beginner-friendly language (one sentence each):

1. **Best Move Explanation**  
   Why is {best_move.uci()} the best move in this position? Mention any tactical or positional advantage it provides.

2. **Strategic Idea**  
   What is the long-term goal behind this move? (e.g., improve piece activity, king safety, center control)

3. **Tactical Motif**  
   Is there a short-term tactical reason (e.g., fork, pin, discovered attack) that makes this move strong?
""".strip()

def get_explanation_from_groq(prompt, stream=True):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("Missing GROQ_API_KEY in environment variables")

    client = Groq(api_key=api_key)

    completion = client.chat.completions.create(
        model="llama3-70b-8192",  # or "llama3-8b-8192" for faster replies
        messages=[{"role": "user", "content": prompt}],
        temperature=0.6,
        max_tokens=128,
        top_p=0.95,
        stream=stream,
    )

    print("🧠 Explanation:\n")
    explanation = ""

    if stream:
        for chunk in completion:
            content = chunk.choices[0].delta.content or ""
            print(content, end="", flush=True)
            explanation += content
    else:
        message = completion.choices[0].message.content
        print(message)
        explanation = message

    return explanation
