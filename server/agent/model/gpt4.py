import openai
openai.api_base = "<your-api-base>"
openai.api_key = "<your-api-key>"

async def model_call(prompt, history=None, system=None):
    message = []
    if system:
        message.append({
            "role": "system",
            "content": system
        })
    
    if history:
        for chat in history:
            message.append({
                "role": "user",
                "content": chat[0]
            })
            message.append({
                "role": "assistant",
                "content": chat[1]
            })
    
    message.append({
        "role": "user",
        "content": prompt
    })
    
    resp = openai.ChatCompletion.create(
        model="gpt-4-1106-preview",
        messages=message,
        timeout=1000
    )

    output = resp["choices"][0]["message"]["content"]

    print(prompt)
    print(output)

    return output