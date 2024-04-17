import copy
from . import en

prompt_module = {
    'en': en,
}

import re

class NewASPAgent:
    def __init__(self, parser, model_call):
        self.history = []
        self.operation = [
            r"(click)\(\s*[\'\"](\d{1,3})[\'\"]\s*\)",
            r"(type_string)\(\s*[\'\"](\d{1,3})[\'\"]\s*,\s*[\'\"]([\s\S]+)[\'\"]\s*,\s*(True|False)\s*\)",
            r"(select)\(\s*[\'\"](\d{1,3})[\'\"]\s*,\s*[\'\"]([\s\S]+)[\'\"]\s*\)",
            r"(scroll_page)\(\s*[\'\"]up[\'\"]\s*\)",
            r"(scroll_page)\(\s*[\'\"]down[\'\"]\s*\)",
            r"(jump_to)\(\s*[\'\"](.+)[\'\"]\s*,\s*(True|False)\s*\)",
            r"(go)\(\s*[\'\"](backward)[\'\"]\s*\)",
            r"(go)\(\s*[\'\"](forward)[\'\"]\s*\)",
            r"(hover)\(\s*[\'\"](\d{1,3})[\'\"]\s*\)",
            r"(finish)\(\s*\)",
            r"(finish)\(\s*(.+)\s*\)",
            r"(switch_tab)\(\d+\)"
        ]
        self.model_call = model_call
        self.parser = parser 

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
    
    @staticmethod
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
        
        if operation == 'click':
            action['label'] = label
            action['action_str'] = f"click('{label}')"
        elif operation == 'hover':
            action['label'] = label
            action['action_str'] = f"hover('{label}')"
        elif operation == 'scroll_page':
            action['action_type'] = f"scroll_{param[0]}"
            action['delta'] = 0.75
            action['direction'] = param[0]
            action['action_str'] = f"scroll_page('{param[0]}')"
        elif operation == 'type_string':
            action['action_type'] = f"type"
            action['label'] = label
            action['text'] = param[1]
            action['flag'] = eval(param[2])
            action['action_str'] = f"type_string('{label}', '{param[1]}', {param[2]})"
        elif operation == 'select':
            action['label'] = label
            action['option'] = param[1]
            action['action_str'] = f"select('{label}', '{param[1]}')"
        elif operation == 'jump_to':
            action['url'] = param[0]
            action['action_str'] = f"jump_to('{param[0]}')"
        elif operation == 'go':
            action['action_type'] = f"go_{param[0]}"
            action['direction'] = param[0]
            action['action_str'] = f"go('{param[0]}')"
        elif operation == 'finish':
            if len(param) > 0:
                action['text'] = param[0]
                action['action_str'] = f"finish('{param[0]}')"
            else:
                action['action_str'] = f"finish()"
        elif operation == 'switch_tab':
            action['tab'] = eval(param[0])
            action['action_str'] = f"switch_tab({action['tab']})"
        else:
            action['action_str'] = f"Invalid action type: {action['action_type']}"
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

        position_bar = f"{round(position, 1)} / {round(page_height, 1)}"

        pre_intnts = 'None'
        if self.history:
            pre_intnts = '\n'.join(
                [f'{prompt.op_prompt % (rec["instruction"], rec["segment"])}' for i, rec in enumerate(self.history)]
            )
            
        input_prompt = prompt.query_prompt % (page_html, pre_intnts, position_bar, target)

        for t in range(1):
            answer = await self.model_call(input_prompt, [], system)
            # answer = input()
            
            operation, param = self.extract_action(answer)
            intention = self.extract_intention(answer, lang)
            
            if operation:
                segment, label = 'None', ''
                if operation in ['click', 'hover', 'type_string', 'select']:
                    param = list(param)
                    label = tag = param[0]
                    bid = self.parser.id_label_converter(tag)
                    segment = self.parser.get_segment(bid)
                    xpath = self.parser.id_xpath_converter(bid)
                    
                    if xpath is not None:
                        param[0] = xpath.replace('xpath=', '')

                action = self.make_action(operation, param, xpath, label, segment, intention)
                    
                self.history.append({
                    'intention': intention,
                    'segment': segment,
                    'instruction': action.get('action_str', 'N/A')
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
        
