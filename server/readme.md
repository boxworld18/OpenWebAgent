# OpenWebAgent Server

1. First, install the necessary packages by running `pip install -r requirements.txt`.
2. To incorporate your own model, place your script in the `agent/model` directory and update the `__init__.py` file accordingly.
3. To test OpenWebAgent, enter your API key and the base URL in `agent/model/gpt4.py`.
4. After completing these steps, you can launch the service by executing `python server.py`.