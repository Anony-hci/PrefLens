import os
import json
from typing import Dict, List

from handyllm import OpenAIClient as _OpenAIClient
from handyllm import stream_chat
import logging
import base64

logger = logging.getLogger()

DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-large"
DEFAULT_VISION_MODEL = "gpt-4o"  # 假设存在视觉模型


def construct_text(role, text):
    return {"role": role, "content": text}


def construct_system(text):
    return construct_text("system", text)


def construct_user(text):
    return construct_text("user", text)


def construct_assistant(text):
    return construct_text("assistant", text)

def construct_image(base64_image):
    return {"type": "image_url", 
            "image_url": {
                "url": f"data:image/jpeg;base64,{base64_image}"
            }}

class OpenAIClient:
    client: _OpenAIClient
    embedding_model: str = DEFAULT_OPENAI_EMBEDDING_MODEL

    def __init__(self):
        self.client = _OpenAIClient()

        embedding_model = os.getenv("OPENAI_EMBEDDING_MODEL")
        if embedding_model is not None:
            self.embedding_model = embedding_model

    def embeddings(self, text: str):
        response = self.client.embeddings(
            engine=self.embedding_model,
            input=text,
        ).call()
        # TODO: should handle errors here
        assert isinstance(response, Dict)
        return response["data"][0]["embedding"]

    def sync_call_gpt(
        self, system_prompt, history, model="gpt-4-1106-preview",  return_json=False, temp=0.
    ):
        prompt = [construct_system(system_prompt), *history]
        logger.debug(f"Calling GPT with messages: {prompt}")
        response = self.client.chat(
            model=model,
            messages=prompt,
            temperature=temp,
            max_tokens=4096,
            top_p=0.1,
            frequency_penalty=0.0,
            presence_penalty=0.0,
            timeout=120,
            stream=False,
            response_format={"type": "json_object"} if return_json else None,
        ).call()

        # response_content = ""
        # for text in stream_chat(response):
        #     print(text, end='')
        #     response_content += text

        assert isinstance(response, Dict)

        response_content = response["choices"][0]["message"]["content"]

        logging.debug(response_content)

        if return_json:
            try:
                print(response_content)
                return json.loads(response_content)
            except Exception as e:
                print("Error: json load failed. ", e)
            return None
        else:
            return response_content
        
    # 图片转base64
    def encode_image(image_path):
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode("utf-8")
        
    def sync_call_gpt_vision(
        self, image, history, model="gpt-4o", return_json=False, temp=0.
    ):
        prompt = [ *history, construct_image(image)]
        logger.debug(f"Calling GPT with messages: {prompt}")
        response = self.client.chat(
            model = model,
            messages = prompt,
            max_tokens=2000,
        ).call()

        print(response)

        assert isinstance(response, Dict)

        response_content = response["choices"][0]["message"]["content"]

        logging.debug(response_content)

        if return_json:
            try:
                return json.loads(response_content)
            except Exception as e:
                print("Error: json load failed. ", e)
            return None
        else:
            return response_content


openai_client = OpenAIClient()
