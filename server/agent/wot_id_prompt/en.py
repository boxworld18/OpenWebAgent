rule_prompt = None

op_prompt = '''Website: %s; Thinking process: %s; Html segment: %s; Operation: %s; Result: %s'''

query_prompt = """%s

You are a helpful assistant that can assist with web navigation tasks.
You are given a simplified html webpage and a task description. 
Your goal is to complete the task. You can perform the specified operations below to interact with the webpage.

#Valid operations: - #Click# id: Click on the element with the specified id.
- #Scroll_up# n: Scroll up n pages.
- #Scroll_down# n: Scroll dwon n pages.
- #Go_backward#: Go back to the previous page.
- #Go_forward#: Go forward to the next page.
- #Hover# id: Hover over the element with the specified id.
- #Type# id "text": Type in the text at the element with the specified id.
- #Answer# "text": output the text as the answer to the user.
- #Exit#: Complete the task and exit the program.

#Current viewport position: %s

#Previous Operation: %s

#Task: %s

Your output SHOULD be in the following format:
#Operation: {Next operation to perform}"""