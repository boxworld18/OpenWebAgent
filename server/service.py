"""
service.py
Backend server for the chrome extension.
"""

import asyncio, pathlib, shutil
import time, json, os
import tiktoken
from flask import Flask, request, jsonify, make_response, g
from html_tools import HtmlParser, basic_attrs, print_html_object
from config import *
from agent import agent_type, model_call

from utils import get_canva_images

app = Flask(__name__)

agent = ''
encoding = tiktoken.get_encoding("cl100k_base")

def rect_convert(rect):
    x, y, w, h = rect['x'], rect['y'], rect['width'], rect['height']
    return (x, y, w, h)

def window_convert(window):
    x, y, w, h = window['left'], window['top'], window['x'], window['y']
    return (x, y, w, h)

@app.route('/predict', methods=['post'])
async def predict():
    try:
        package = request.json
    except:
        return 'Error! query can not be empty', 400
    url = package.get('url', '')
    ctx = package.get('html', '')
    rect = package.get('elementPosNSize', {})
    window = package.get('window', WINDOW_SIZE)
    lang = 'en' #package.get('lang', 'en')
    target = package.get('target', '')
    
    ocr_items = package.get('ocrItems', [])
    screenshot = package.get('screenshot', None)
    
    last_op = package.get('result', None)
    last_op = None if not last_op or len(last_op) == 0 else last_op
        
    target = '' if target is None else target
    
    top, win_y = window.get('top', 0), window.get('y', 720)
    page_height = package.get('pageHeight', 0) / win_y
    position = top / win_y
    
    model = package.get('model', 'ourmodel')
    refresh = package.get('refresh', False)
    
    # model = 'ourmodel'
    
    # start_id = 0
    # if screenshot is not None:
    #     ocr_items, start_id = get_canva_images(ocr_items, screenshot, start_id)
    #     print(ocr_items)

    args = {
        'use_position': True,
        'window_size': window_convert(window),
        'rect_dict': {}, # temperary, you should update rect before parsing
        'label_attr': 'temp_clickable_label',
        'label_generator': 'order',
        'regenerate_label': False,
        'attr_list': basic_attrs,
        'prompt': 'xml',
    }
    
    time_status = {}
    # Page Process
    global encoding
    try:
        print("Parsing HTML...")
        t = time.time()
        hp = HtmlParser(ctx, args)
    
        rect_dict = {}
        for k, v in rect.items():
            bid = hp.id_xpath_converter(k)
            rect_dict[bid] = rect_convert(v)
        
        hp.update_rect_dict(rect_dict)
        res = hp.parse_tree()
        page_html = res.get('html', '')

        time_used = time.time() - t

        ori_enc = len(encoding.encode(ctx))
        new_enc = len(encoding.encode(page_html))
        
        time_status.update({
            'original_char_length': len(ctx),
            'original_html_token': ori_enc,
            'parsed_char_length': len(page_html),
            'parsed_html_token': new_enc,
            'parse_time': int(time_used * 1000),
        })
    except:
        print("failed to parse...")
        return jsonify({'action': 'Error', 'error': 'Cannot parse the page'})
    
    print(page_html)
    
    global agent
    if agent == '' or refresh:
        agent = agent_type['wot_id'](hp, model_call[model])

    label = ''
    
    action = {
        'action_type': 'error',
        'param': [],
        'label': '',
        'segment': '',
        'cot': 'N/A',
        'xpath': '',
        'label': '',
        'url': '',
        'text': '',
        'option': '',
        'direction': '',
        'action_str': '',
        'delta': 0,
        'tab': 0,
        'flag': False,
        'time_status': {},
    }
    
    if True:
    # try:
        print('agent predicting...')
        t = time.time()
        action = await agent.act(
            target, 
            url, 
            page_html, 
            'env/screenshot.png',
            position=position, 
            page_height=page_height, 
            lang=lang,
            pre_result=last_op,
        )
        time_used = time.time() - t
        print('[Time]', time_used)
        time_status.update({
            'predict_time': int(time_used * 1000)
        })
    # except:
    #     act_type, param = 'Error', ['Error']
    #     action['action_str'] = f"Agent failed to predict, please try again."
    #     action['action_type'] = 'error'
    
    action.update({
        'time_status': time_status
    })
    print(action)
    
    log = {
        'url': url,
        'page_html':page_html,
        'html': ctx,
        'rect': rect,
        'window': window,
        'lang': lang,
        'target': target,
        'last_op': last_op,
        'action': action.get('action_type'),
        'action_str': action.get('action_str'),
        'label': label,
        'result': '',
        'cot': action.get('cot', ''),
    }
    
    path = os.path.join('logs',f'{model}.jsonl')
    
    with open(path, 'a', encoding='utf-8') as f:
        f.write(json.dumps(log,ensure_ascii=False)+'\n')
    
    return jsonify(action)

if __name__ == '__main__':
    if not os.path.exists('logs'):
        os.makedirs('logs')
    if not os.path.exists('tmp'):
        os.makedirs('tmp')
    app.run(host = '0.0.0.0', port = 17171)
