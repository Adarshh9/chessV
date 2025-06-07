import chess
import chess.engine

ENGINE_PATH = "stockfish/stockfish-ubuntu-x86-64-avx2"

def get_engine_eval_score(fen, move_uci, depth=15):
    board = chess.Board(fen)
    board.push(chess.Move.from_uci(move_uci))

    with chess.engine.SimpleEngine.popen_uci(ENGINE_PATH) as engine:
        info = engine.analyse(board, chess.engine.Limit(depth=depth))
        eval_score = info["score"].white().score(mate_score=10000)
    return eval_score

def get_pv_line_info(fen, depth=15):
    board = chess.Board(fen)

    with chess.engine.SimpleEngine.popen_uci(ENGINE_PATH) as engine:
        infos = engine.analyse(board, chess.engine.Limit(depth=depth), multipv=3)

    move_infos = []
    for info in infos:
        move = info["pv"][0]
        pv_line = info["pv"]
        move_infos.append({
            "move_uci": move.uci(),
            "pv_line": [m.uci() for m in pv_line],
            "pv_length": len(pv_line),
        })
    return move_infos

def evaluate_king_safety(fen, move_uci):
    board = chess.Board(fen)
    board.push(chess.Move.from_uci(move_uci))
    king_square = board.king(board.turn)
    return 0 if board.is_attacked_by(not board.turn, king_square) else 1

def evaluate_positional_score(fen, move_uci):
    board = chess.Board(fen)
    board.push(chess.Move.from_uci(move_uci))

    center_squares = [chess.D4, chess.D5, chess.E4, chess.E5]
    center_control = sum(1 for sq in center_squares if board.is_attacked_by(board.turn, sq))

    development_score = sum(
        1 for sq, piece in board.piece_map().items()
        if piece.color == board.turn and piece.piece_type in [chess.KNIGHT, chess.BISHOP, chess.QUEEN]
    )

    return center_control + development_score

def evaluate_tactical_complexity(pv_line):
    complexity = 0
    for move_uci in pv_line[:5]:  # Only first few moves matter
        move = chess.Move.from_uci(move_uci)
        if "x" in move_uci:
            complexity += 1
    return complexity

def analyze_move_from_fen(fen, move_uci, pv_line):
    return {
        "move": move_uci,
        "engine_eval": get_engine_eval_score(fen, move_uci),
        "pv_length": len(pv_line),
        "tactical_complexity": evaluate_tactical_complexity(pv_line),
        "king_safety": evaluate_king_safety(fen, move_uci),
        "positional_score": evaluate_positional_score(fen, move_uci)
    }

WEIGHTS = {
    "engine_eval": 0.4,
    "pv_length": 0.1,
    "tactical_complexity": 0.15,
    "king_safety": 0.15,
    "positional_score": 0.2
}

def normalize(value, min_val, max_val):
    if max_val == min_val:
        return 0.5  # Avoid division by zero
    return (value - min_val) / (max_val - min_val)

def rank_moves(move_metrics_list):
    # Extract metric values
    engine_scores = [m["engine_eval"] for m in move_metrics_list]
    pv_lengths = [m["pv_length"] for m in move_metrics_list]
    tactical = [m["tactical_complexity"] for m in move_metrics_list]
    safety = [m["king_safety"] for m in move_metrics_list]
    positional = [m["positional_score"] for m in move_metrics_list]

    # Normalize all
    for m in move_metrics_list:
        m["norm_engine_eval"] = normalize(m["engine_eval"], min(engine_scores), max(engine_scores))
        m["norm_pv_length"] = normalize(m["pv_length"], min(pv_lengths), max(pv_lengths))
        m["norm_tactical_complexity"] = normalize(m["tactical_complexity"], min(tactical), max(tactical))
        m["norm_king_safety"] = normalize(m["king_safety"], min(safety), max(safety))
        m["norm_positional_score"] = normalize(m["positional_score"], min(positional), max(positional))

        m["total_score"] = (
            m["norm_engine_eval"] * WEIGHTS["engine_eval"] +
            m["norm_pv_length"] * WEIGHTS["pv_length"] +
            m["norm_tactical_complexity"] * WEIGHTS["tactical_complexity"] +
            m["norm_king_safety"] * WEIGHTS["king_safety"] +
            m["norm_positional_score"] * WEIGHTS["positional_score"]
        )

    # Pick best move
    best_move = max(move_metrics_list, key=lambda x: x["total_score"])
    return best_move, move_metrics_list

def generate_reasoning(move):
    aspects = {
        "Engine Evaluation": move["norm_engine_eval"],
        "Positional Score": move["norm_positional_score"],
        "King Safety": move["norm_king_safety"],
        "Tactical Complexity": move["norm_tactical_complexity"],
        "Continuity (PV)": move["norm_pv_length"]
    }

    sorted_aspects = sorted(aspects.items(), key=lambda x: x[1], reverse=True)
    primary, secondary = sorted_aspects[:2]

    explanation = f"""
Move `{move['move']}` is considered best primarily because of its {primary[0]}, 
which significantly influences the position. Additionally, it offers strong {secondary[0]}, 
making it a well-rounded and strategic option in this position.
    """.strip()

    return explanation

def perform_advanced_analysis(fen, top_n=3):
    """
    Given a FEN string and number of top moves to analyze, returns:
        1. Best move data (dict)
        2. List of all top_n move data dicts
        3. Natural language explanation of the best move
    """
    # Step 1: Get top N moves with PV lines
    pv_infos = get_pv_line_info(fen, depth=15)[:top_n]

    # Step 2: Analyze each move in detail
    move_metrics = [
        analyze_move_from_fen(fen, info["move_uci"], info["pv_line"])
        for info in pv_infos
    ]

    # Step 3: Rank the moves
    best_move, all_moves = rank_moves(move_metrics)

    # Step 4: Generate explanation for best move
    reasoning = generate_reasoning(best_move)

    return best_move, all_moves, reasoning
