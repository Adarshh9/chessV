import cv2
import numpy as np
from ultralytics import YOLO

def get_fen_from_image(img_path, turn):
    model = YOLO("weights/best.pt")  # path to your model
    img = cv2.imread(img_path)
    h, w, _ = img.shape

    results = model(img)[0]
    class_names = ['B', 'K', 'N', 'P', 'Q', 'R', 'b', 'board', 'k', 'n', 'p', 'q', 'r']

    pieces = []
    for box in results.boxes:
        class_id = int(box.cls[0])
        label = class_names[class_id]
        if label == 'board':
            continue
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2
        pieces.append({'label': label, 'cx': cx, 'cy': cy})

    square_h = h / 8
    square_w = w / 8
    grid = [['' for _ in range(8)] for _ in range(8)]

    for piece in pieces:
        col = int(piece['cx'] // square_w)
        row = int(piece['cy'] // square_h)
        col = min(col, 7)
        row = min(row, 7)
        grid[row][col] = piece['label']

    # Convert grid to FEN
    fen_rows = []
    for row in grid:
        fen_row = ''
        empty = 0
        for cell in row:
            if cell == '':
                empty += 1
            else:
                if empty:
                    fen_row += str(empty)
                    empty = 0
                fen_row += cell
        if empty:
            fen_row += str(empty)
        fen_rows.append(fen_row)

    piece_placement = '/'.join(fen_rows)
    fen = f"{piece_placement} {turn} - - 0 1"
    return fen
