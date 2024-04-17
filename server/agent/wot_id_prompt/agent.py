from . import en

prompt_module = {
    'en': en,
}

import re

class WoTIDAgent:
    def __init__(self, parser, model_call):
        self.history = []
        self.operation = [
            r"#?(Click)#?\s*(\d+)",
            r"#?(Type)#?\s*(\d+)\s*(.+)",
            r"#?(Scroll_up)#?",
            r"#?(Scroll_down)#?",
            r"#?(Goto)#?\s*(https?:\/\/[-a-z0-9]+(?:\.[-a-z0-9]+)*\.(?:com|cn|edu|uk)(?:\/[-a-z0-9_:@&?=+,.!/~*'%$]*)?)",
            r"#?(Go_backward)#?",
            r"#?(Go_forward)#?",
            r"#?(Hover)#?\s*(\d+)",
            r"#?(Answer)#?\s*(.+)",
            r"#?(Login)#?",
            r"#?(Verify)#?",
            r"#?(Exit)#?"
        ]
        self.parser = parser
        self.model_call = model_call

    def clear_history(self):
        self.history = []

    def extract_action(self, answer):
        for regex in self.operation:
            matches = re.findall(regex, answer)

            if matches:
                m = matches[-1]
                if isinstance(m, tuple):
                    operation = m[0]
                    param = m[1:]
                else:
                    operation = m
                    param = None
                    
                return operation, param
            
        return None, None
    
    def extract_intention(self, answer, lang='en'):
        matches = re.findall(r"#Thinking Process: (.+)", answer)

        if matches:
            return matches[-1]
        else:
            return None

    @staticmethod
    def make_action(operation, param, xpath, label, segment, intention):
        action = {
            'action_type': operation,
            'param': param,
            'label': label,
            'segment': segment,
            'cot': intention,
            'xpath': xpath,
            'label': '',
            'url': '',
            'text': '',
            'option': '',
            'direction': '',
            'action_str': '',
            'delta': 0,
            'tab': 0,
            'flag': False,
        }
        
        if operation == 'Click':
            action['action_type'] = 'click'
            action['label'] = label
            action['action_str'] = f"#Click# {label}"
        elif operation == 'Hover':
            action['action_type'] = 'hover'
            action['label'] = label
            action['action_str'] = f"#Hover# {label}"
        elif operation == 'Scroll_up':
            action['action_type'] = f"scroll_up"
            action['delta'] = 0.8
            action['action_str'] = f"#Scroll_up# 0.8"
        elif operation == 'Scroll_down':
            action['action_type'] = f"scroll_down"
            action['delta'] = 0.8
            action['action_str'] = f"#Scroll_down# 0.8"
        elif operation == 'Type':
            action['action_type'] = f"type"
            action['label'] = label
            action['text'] = param[1]
            action['action_str'] = f"#Type# {label} {param[1]}"
        elif operation == 'select':
            action['action_type'] = f"select"
            action['label'] = label
            action['option'] = param[1]
            action['action_str'] = f"#Select# {label} {param[1]}"
        elif operation == 'Goto':
            action['action_type'] = f"jump_to"
            action['url'] = param[0]
            action['action_str'] = f"#Goto# {param[0]})"
        elif operation == 'Go_backward':
            action['action_type'] = f"go_backward"
            action['action_str'] = f"#Go_backward#"
        elif operation == 'Go_forward':
            action['action_type'] = f"go_forward"
            action['action_str'] = f"#Go_forward#"
        elif operation == 'Answer':
            action['action_type'] = f"finish"
            action['text'] = param[0]
            action['action_str'] = f"#Answer# {param[0]}"
        elif operation == 'Exit':
            action['action_type'] = f"finish"
            action['action_str'] = f"#Exit#"
        else:
            action['action_str'] = f"Invalid action type: #{action['action_type']}#"
            action['action_type'] = 'error'
        return action
    
    async def act(self, target, url, page_html, screenshot_path, lang='en', rule=True, position=None, page_height=None, pre_result=None):
        prompt = prompt_module[lang]

        if pre_result and self.history:
            self.history[-1]['result'] = pre_result

        if rule:
            system = prompt.rule_prompt
        else:
            system = None

        left_bar = '-' * int(position)
        right_bar = '-' * int(page_height - position)
        position_bar = f'[0{left_bar}|{round(position, 1)}{right_bar}{round(page_height, 1)}]'

        if self.history:
            pre_intnts = '\n'.join(
                [f'{i+1}. {prompt.op_prompt % (rec["url"], rec["intention"], rec["segment"], rec["instruction"], rec["result"])}' for i, rec in enumerate(self.history)]
            )
        else:
            pre_intnts = 'None' if lang == 'en' else '无'
        
        input_prompt = prompt.query_prompt % (page_html, position_bar, pre_intnts, target)

        for t in range(1):
            answer = await self.model_call(input_prompt, [], system)
            # answer = input('Input command > ')
        
            operation, param = self.extract_action(answer)
            intention = self.extract_intention(answer, lang)

            if operation:
                xpath, segment, label = '', 'None', ''
                if operation in ['Click', 'Hover', 'Type', 'Select']:
                    param = list(param)
                    label = tag = param[0]
                    bid = self.parser.id_label_converter(tag)
                    segment = self.parser.get_segment(bid)
                    xpath = self.parser.id_xpath_converter(bid)
                    
                    if xpath is not None:
                        param[0] = xpath.replace('xpath=', '')
                
                action = self.make_action(operation, param, xpath, label, segment, intention)
                    
                self.history.append({
                    'url': url[:50],
                    'intention': intention,
                    'segment': segment,
                    'instruction': action.get('action_str', 'N/A'),
                    'result': None,
                })
                
                print(action)
                return action
        
        action = self.make_action('error', [], '', '', '', '')
        action['action_str'] = f"No Valid Operation! Model Output is: {answer}"
        return action
        
    async def model_call(self, prompt, history=None, system=None):
        if self.model_call:
            return await self.model_call(prompt, history, system)
        else:
            raise NotImplementedError
        
