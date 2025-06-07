import chess
import chess.engine
import chess.svg
import cairosvg
from IPython.display import display, Image

def get_top_moves_with_analysis(fen, engine_path="stockfish", depth=20, top_n=3):
    board = chess.Board(fen)
    engine = chess.engine.SimpleEngine.popen_uci(engine_path)

    # Get top N best moves
    infos = engine.analyse(board, chess.engine.Limit(depth=depth), multipv=top_n)

    suggestions = []
    for info in infos:
        best_move = info['pv'][0]
        pv_line = info['pv']
        score = info['score'].relative
        suggestions.append((best_move, pv_line, score))

    engine.quit()
    return suggestions, board

def render_board_with_move(board, move, output_path="artifacts/board.png"):
    svg_board = chess.svg.board(board, arrows=[(move.from_square, move.to_square)], lastmove=move)
    cairosvg.svg2png(bytestring=svg_board.encode('utf-8'), write_to=output_path)

    try:
        display(Image(filename=output_path))
    except:
        print(f"Board image saved to {output_path}")
