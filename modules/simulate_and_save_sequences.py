# modules/simulate_and_save_sequences.py

import os
import chess
from modules.chess_engine import render_board_with_move

def simulate_and_save_sequences(board, suggestions, output_dir="static/artifacts/sequences"):
    os.makedirs(output_dir, exist_ok=True)

    for idx, (move, pv_line, score) in enumerate(suggestions, 1):
        subdir = os.path.join(output_dir, f"move_{idx}_{move.uci()}")
        os.makedirs(subdir, exist_ok=True)

        temp_board = board.copy()
        for step, m in enumerate(pv_line, 1):
            temp_board.push(m)
            file_path = os.path.join(subdir, f"step_{step}_{m.uci()}.png")
            render_board_with_move(temp_board, m, output_path=file_path)
