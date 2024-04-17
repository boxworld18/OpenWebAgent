import os, requests, secrets, io, re, base64
from PIL import Image

ocr_image_base = "./tmp"
ocr_url = "http://0.0.0.0:28889/ocr/en"

def call_ocr(items: list, start_index: int = -1) -> list:
    result = []
    for item in items:
        fn = item['filename']
        x, y = item['rects']['left'], item['rects']['top']
        with open(fn, "rb") as f:
            r = requests.post(ocr_url, files={"file": f})
            print(r)
            res = r.json()
            
            for val in res:
                rects = {
                    "left": x + val["x_min"],
                    "top": y + val["y_min"],
                    "right": x + val["x_max"],
                    "bottom": y + val["y_max"],
                    "height": val["y_max"] - val["y_min"],
                    "width": val["x_max"] - val["x_min"],
                }
                new_item = {
                    "tag": "canvas-element",
                    "rects": rects,
                    "text": val["text"],
                    "id": start_index
                }
                start_index += 1
                result.append(new_item)
        os.remove(fn)
    return result, start_index

def get_canva_images(items: list, image_bytes, start_index: int = -1) -> list:
    os.makedirs(ocr_image_base, exist_ok=True)
    for file in os.listdir(ocr_image_base):
        os.remove(os.path.join(ocr_image_base, file))
    
    image_io = io.BytesIO(image_bytes)
    image = Image.open(image_io)

    new_items = []
    secure_rng = secrets.SystemRandom()
    for item in items:
        rects = item['rects']
        l, t, r, b = rects['left'], rects['top'], rects['right'], rects['bottom']
        if l >= r or t >= b:
            continue
        cropped_img = image.crop((l, t, r, b))
        index = secure_rng.randbelow(10**9)
        fn = os.path.join(ocr_image_base, f"ocr_{index}.png")
        item['filename'] = fn
        cropped_img.save(fn, 'png')
        new_items.append(item)
    
    return call_ocr(new_items, start_index)