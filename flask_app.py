import os
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from modules.image_to_fen import get_fen_from_image
from modules.chess_engine import get_top_moves_with_analysis, render_board_with_move
from modules.groq_explainer import build_prompt, get_explanation_from_groq
from modules.simulate_and_save_sequences import simulate_and_save_sequences
from modules.eval_strategy import perform_advanced_analysis
import chess
import chess.engine

app = Flask(__name__)
CORS(app)

app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['ARTIFACTS_FOLDER'] = 'static/artifacts'

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['ARTIFACTS_FOLDER'], exist_ok=True)

def parse_explanation(explanation_text):
    """Parse the explanation text into structured sections"""
    parsed_explanation = {
        "best_move_explanation": "",
        "strategic_idea": "",
        "tactical_motif": ""
    }
    
    try:
        text = explanation_text.replace("Here are the explanations:", "").strip()
        sections = re.split(r'\d+\.\s*', text)
        sections = [section.strip() for section in sections if section.strip()]
        
        for section in sections:
            if "**Best Move Explanation**" in section or "Best Move Explanation" in section:
                content = re.sub(r'\*\*Best Move Explanation\*\*:?\s*', '', section, flags=re.IGNORECASE)
                content = re.split(r'\d+\.\s*\*\*', content)[0].strip()
                parsed_explanation["best_move_explanation"] = content
            
            elif "**Strategic Idea**" in section or "Strategic Idea" in section:
                content = re.sub(r'\*\*Strategic Idea\*\*:?\s*', '', section, flags=re.IGNORECASE)
                content = re.split(r'\d+\.\s*\*\*', content)[0].strip()
                parsed_explanation["strategic_idea"] = content
            
            elif "**Tactical Motif**" in section or "Tactical Motif" in section:
                content = re.sub(r'\*\*Tactical Motif\*\*:?\s*', '', section, flags=re.IGNORECASE)
                content = re.split(r'\d+\.\s*\*\*', content)[0].strip()
                parsed_explanation["tactical_motif"] = content
        
        if not any(parsed_explanation.values()):
            best_move_match = re.search(r'\*\*Best Move Explanation\*\*:?\s*(.*?)(?=\*\*Strategic Idea\*\*|\*\*Tactical Motif\*\*|$)', text, re.DOTALL | re.IGNORECASE)
            strategic_match = re.search(r'\*\*Strategic Idea\*\*:?\s*(.*?)(?=\*\*Tactical Motif\*\*|\*\*Best Move Explanation\*\*|$)', text, re.DOTALL | re.IGNORECASE)
            tactical_match = re.search(r'\*\*Tactical Motif\*\*:?\s*(.*?)(?=\*\*Best Move Explanation\*\*|\*\*Strategic Idea\*\*|$)', text, re.DOTALL | re.IGNORECASE)
            
            if best_move_match:
                parsed_explanation["best_move_explanation"] = best_move_match.group(1).strip()
            if strategic_match:
                parsed_explanation["strategic_idea"] = strategic_match.group(1).strip()
            if tactical_match:
                parsed_explanation["tactical_motif"] = tactical_match.group(1).strip()
        
        if not any(parsed_explanation.values()):
            parsed_explanation["best_move_explanation"] = explanation_text
            
    except Exception as e:
        print(f"Error parsing explanation: {e}")
        parsed_explanation["best_move_explanation"] = explanation_text
    
    return parsed_explanation

def convert_moves_to_string(pv_line):
    """Convert move objects to string notation"""
    if isinstance(pv_line, str):
        return pv_line
    
    if isinstance(pv_line, list):
        move_strings = []
        for move in pv_line:
            if hasattr(move, 'uci'):
                move_strings.append(move.uci())
            elif isinstance(move, dict):
                if 'from_square' in move and 'to_square' in move:
                    from_sq = move['from_square']
                    to_sq = move['to_square']
                    move_strings.append(f"{from_sq}{to_sq}")
                else:
                    move_strings.append(str(move))
            else:
                move_strings.append(str(move))
        return ' '.join(move_strings)
    
    return str(pv_line)

def format_score(score):
    """Format score to be JSON serializable"""
    if isinstance(score, chess.engine.Mate):
        return f"Mate{score.mate()}"
    elif isinstance(score, chess.engine.Score):
        return score.score()
    else:
        return str(score)

@app.route('/api/analyze', methods=['POST'])
def analyze():
    try:
        print("=== FLASK: Received analysis request ===")
        
        if 'file' not in request.files:
            print("ERROR: No file provided")
            return jsonify({'error': 'No file provided'}), 400
            
        file = request.files['file']
        turn = request.form.get('turn', 'White')
        
        if file.filename == '':
            print("ERROR: No file selected")
            return jsonify({'error': 'No file selected'}), 400
        
        print(f"Processing file: {file.filename}, turn: {turn}")
        
        # Process the image
        turn_code = 'w' if turn == 'White' else 'b'
        
        filename = secure_filename(file.filename)
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(image_path)
        print(f"File saved to: {image_path}")

        # Get FEN from image
        print("Getting FEN from image...")
        fen = get_fen_from_image(image_path, turn_code)
        print(f"Generated FEN: {fen}")
        
        # Analyze with chess engine (original analysis)
        print("Analyzing with chess engine...")
        engine_path = 'stockfish/stockfish-ubuntu-x86-64-avx2'
        suggestions, board = get_top_moves_with_analysis(fen, engine_path, top_n=3)
        print(f"Got {len(suggestions)} suggestions")

        explanations = []
        rendered_images = []

        # Process each suggestion
        for idx, (move, pv_line, score) in enumerate(suggestions, 1):
            print(f"Processing suggestion {idx}: move={move}, score={score}")
            
            image_file = f'board_{idx}.png'
            image_out_path = os.path.join(app.config['ARTIFACTS_FOLDER'], image_file)
            render_board_with_move(board.copy(), move, output_path=image_out_path)
            
            prompt = build_prompt(fen, move, pv_line, score)
            raw_explanation = get_explanation_from_groq(prompt)
            
            # Parse the explanation into structured sections
            parsed_explanation = parse_explanation(raw_explanation)
            
            explanations.append([move.uci(), parsed_explanation])
            rendered_images.append(image_file)

        # Save sequences
        print("Saving sequences...")
        simulate_and_save_sequences(board, suggestions)
        
        # Perform advanced analysis
        print("Performing advanced analysis...")
        best_move_data, all_moves_data, reasoning = perform_advanced_analysis(fen, top_n=3)
        
        # Prepare JSON response
        response_data = {
            'fen': fen,
            'rendered_images': rendered_images,
            'explanations': explanations,
            'suggestions': [],
            'advanced_analysis': {
                'best_move': best_move_data,
                'all_moves': all_moves_data,
                'reasoning': reasoning
            } if best_move_data else None
        }
        
        # Handle score and pv_line conversion properly
        for move, pv_line, score in suggestions:
            move_uci = move.uci() if hasattr(move, 'uci') else str(move)
            pv_line_str = convert_moves_to_string(pv_line)
            score_value = format_score(score)
            
            response_data['suggestions'].append([move_uci, pv_line_str, score_value])
        
        print("=== FLASK: Analysis completed successfully ===")
        print(f"Response data keys: {list(response_data.keys())}")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"=== FLASK ERROR: {str(e)} ===")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@app.route('/api/sequence/<int:move_id>', methods=['GET'])
def get_sequence_images(move_id):
    try:
        print(f"Getting sequence for move {move_id}")
        
        # Path to sequences folder
        sequences_folder = os.path.join(app.config['ARTIFACTS_FOLDER'], 'sequences')
        
        if not os.path.exists(sequences_folder):
            print(f"Sequences folder not found: {sequences_folder}")
            return jsonify({'error': 'Sequences folder not found'}), 404
        
        # Look for the move folder that matches the move_id
        move_folder_pattern = f'move_{move_id}_'
        move_folder = None
        move_uci = None
        
        for folder_name in os.listdir(sequences_folder):
            if folder_name.startswith(move_folder_pattern):
                move_folder = folder_name
                # Extract move UCI from folder name (e.g., "move_1_b7a8" -> "b7a8")
                move_uci = folder_name.split('_', 2)[2]  # Split by '_' and take the third part
                break
        
        if not move_folder:
            print(f"Move folder for move {move_id} not found in {sequences_folder}")
            # List available folders for debugging
            available_folders = [f for f in os.listdir(sequences_folder) if f.startswith('move_')]
            print(f"Available move folders: {available_folders}")
            return jsonify({'error': f'Move {move_id} not found'}), 404
        
        # Full path to the specific move folder
        sequence_folder = os.path.join(sequences_folder, move_folder)
        print(f"Found sequence folder: {sequence_folder}")
        
        # Get all PNG files in the folder
        sequence_images = [f for f in os.listdir(sequence_folder) if f.endswith('.png')]
        sequence_images.sort()  # Sort by name to ensure correct order
        
        print(f"Found {len(sequence_images)} sequence images: {sequence_images}")
        
        return jsonify({
            'move_id': move_id,
            'move_uci': move_uci,
            'sequence_images': sequence_images,
            'folder_name': move_folder
        })
        
    except Exception as e:
        print(f"Error getting sequence images: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to get sequence: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Chess Vision API is running'})

@app.route('/static/<path:filename>')
def serve_static(filename):
    return app.send_static_file(filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)