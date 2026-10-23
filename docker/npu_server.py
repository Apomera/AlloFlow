"""
AlloFlow NPU Inference Server
Runs AI models locally on Snapdragon X NPU via ONNX Runtime + DirectML.
Serves an OpenAI-compatible API on http://localhost:11435

Usage:
  pip install onnxruntime-directml flask huggingface_hub transformers
  python npu_server.py [--model deepseek-r1-1.5b|phi-3.5-mini|qwen-2.5-1.5b] [--port 11435]

Models auto-download from HuggingFace on first run (~0.5-2.5 GB each).
"""

import argparse, math, os, time, uuid, traceback
import threading
from urllib.parse import urlsplit
from flask import Flask, request, jsonify

MODELS = {
    "deepseek-r1-1.5b": {
        "repo": "onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX",
        "desc": "Best for math reasoning (1.5B, ~40 tok/s on NPU)",
        "ctx": 4096,
    },
    "phi-3.5-mini": {
        "repo": "microsoft/Phi-3.5-mini-instruct-onnx",
        "desc": "Best for general content (3.8B, ~15 tok/s on NPU)",
        "ctx": 4096,
    },
    "qwen-2.5-1.5b": {
        "repo": "onnx-community/Qwen2.5-1.5B-Instruct",
        "desc": "Lightweight balanced model (1.5B params)",
        "ctx": 4096,
    },
}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 256 * 1024
MAX_MESSAGE_CHARS = 64000
MAX_MESSAGES = 128
MAX_TOKENS = 4096
_generation_lock = threading.Lock()
_session = None
_tokenizer = None
_active_id = None


class ContextLimitError(ValueError):
    """The submitted prompt and output budget do not fit the selected model."""


class RequestValidationError(ValueError):
    def __init__(self, public_message):
        super().__init__(public_message)
        self.public_message = public_message


def is_allowed_origin(origin):
    if origin is None:
        return True
    if (not isinstance(origin, str) or not origin
            or any(ord(char) <= 32 or ord(char) == 127 for char in origin)):
        return False
    try:
        parsed = urlsplit(origin)
        if (parsed.scheme not in ("http", "https") or not parsed.hostname
                or parsed.username or parsed.password or parsed.path
                or parsed.query or parsed.fragment
                or (parsed.port is not None and not 0 < parsed.port <= 65535)):
            return False
    except ValueError:
        return False
    if parsed.hostname in ("localhost", "127.0.0.1", "::1"):
        return True
    trusted = {"https://alloflow-cdn.pages.dev"}
    trusted.update(value.strip() for value in
                   os.environ.get("ALLOFLOW_NPU_ALLOWED_ORIGINS", "").split(","))
    return origin in trusted


def api_error(message, status=400):
    return jsonify({"error": {"message": message,
                             "type": "server_error" if status >= 500 else "invalid_request_error"}}), status


@app.errorhandler(413)
def request_too_large(_error):
    return api_error("Request body exceeds 256 KiB.", 413)


@app.before_request
def guard_browser_origin():
    if not is_allowed_origin(request.headers.get("Origin")):
        return api_error("Browser origin is not allowed; configure ALLOFLOW_NPU_ALLOWED_ORIGINS for your school app.", 403)


@app.after_request
def add_cors_headers(response):
    response.vary.add("Origin")
    origin = request.headers.get("Origin")
    if origin and is_allowed_origin(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


def validate_chat_request(data):
    if not isinstance(data, dict):
        raise RequestValidationError("Request must be a JSON object.")
    messages = data.get("messages")
    if not isinstance(messages, list) or not 1 <= len(messages) <= MAX_MESSAGES:
        raise RequestValidationError("Messages must contain between 1 and 128 text messages.")
    for message in messages:
        if (not isinstance(message, dict)
                or not isinstance(message.get("role", "user"), str)
                or not 1 <= len(message.get("role", "user")) <= 32
                or not isinstance(message.get("content"), str)):
            raise RequestValidationError("Each message must have a short role string and text content.")
    if sum(len(message["content"]) for message in messages) > MAX_MESSAGE_CHARS:
        raise RequestValidationError("Message text exceeds 64000 characters; shorten the conversation.")
    max_tokens = data.get("max_tokens", 512)
    if type(max_tokens) is not int or not 1 <= max_tokens <= MAX_TOKENS:
        raise RequestValidationError("max_tokens must be an integer between 1 and 4096.")
    temperature = data.get("temperature", 0.7)
    if (type(temperature) not in (int, float) or not 0 <= temperature <= 2
            or not math.isfinite(temperature)):
        raise RequestValidationError("Temperature must be a finite number between 0 and 2.")
    model = data.get("model", "")
    if not isinstance(model, str) or len(model) > 200:
        raise RequestValidationError("Model must be a string of at most 200 characters.")
    return messages, max_tokens, temperature, model


def load_model(model_id):
    global _session, _tokenizer, _active_id
    if model_id == _active_id and _session:
        return
    info = MODELS.get(model_id)
    if not info:
        raise ValueError(f"Unknown model: {model_id}")
    print(f"\n{'='*50}\n  Loading {model_id}\n  {info['desc']}\n{'='*50}")

    import onnxruntime as ort
    from huggingface_hub import snapshot_download
    from transformers import AutoTokenizer

    cache = os.path.join(os.path.expanduser("~"), ".cache", "alloflow-npu", model_id)
    print(f"  Downloading to: {cache}")
    model_path = snapshot_download(
        info["repo"],
        local_dir=cache,
        allow_patterns=["*.onnx", "*.onnx_data", "*.json", "*.txt", "*.model", "tokenizer*", "config*", "special*"],
    )
    print(f"  Downloaded: {model_path}")

    # Find ONNX model file (prefer int4/quantized > fp16 > default)
    onnx_path = None
    all_onnx = []
    for root, _, files in os.walk(model_path):
        for f in files:
            if f.endswith(".onnx"):
                full = os.path.join(root, f)
                all_onnx.append(full)
                # Prefer quantized models (smaller, faster on NPU)
                if "int4" in f.lower() or "quantized" in f.lower() or "q4" in f.lower():
                    onnx_path = full

    if not onnx_path and all_onnx:
        # Pick the smallest ONNX file (likely the quantized one)
        onnx_path = min(all_onnx, key=os.path.getsize)

    if not onnx_path:
        print(f"  Available files: {os.listdir(model_path)}")
        raise FileNotFoundError(f"No .onnx file found in {model_path}")

    print(f"  ONNX model: {os.path.basename(onnx_path)} ({os.path.getsize(onnx_path) / 1e6:.0f} MB)")

    # DirectML = NPU/GPU accel; CPU = fallback
    opts = ort.SessionOptions()
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    session = ort.InferenceSession(
        onnx_path, opts, providers=["DmlExecutionProvider", "CPUExecutionProvider"]
    )

    # Load tokenizer from same directory (or parent)
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
    except Exception:
        # Some repos have tokenizer in parent
        parent = os.path.dirname(onnx_path)
        tokenizer = AutoTokenizer.from_pretrained(parent, trust_remote_code=True)

    # Publish the replacement only after both parts loaded successfully.
    _session, _tokenizer = session, tokenizer
    _active_id = model_id
    prov = _session.get_providers()[0]
    accel = "NPU/GPU (DirectML)" if "Dml" in prov else "CPU (fallback)"
    print(f"  Accelerator: {accel}")
    print(f"  Inputs: {[i.name for i in _session.get_inputs()]}")
    print(f"  Ready!\n")


def generate(messages, max_tokens=512, temperature=0.7):
    """Generate a chat completion using the loaded ONNX model."""
    import numpy as np
    if not _session or not _tokenizer:
        raise RuntimeError("No model loaded")

    # Build prompt
    try:
        text = _tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    except Exception:
        # Fallback: manual prompt formatting
        parts = []
        for m in messages:
            r, c = m.get("role", "user"), m.get("content", "")
            parts.append(f"<|{r}|>\n{c}<|end|>")
        parts.append("<|assistant|>\n")
        text = "\n".join(parts)

    input_ids = _tokenizer.encode(text, return_tensors="np").astype("int64")
    context_limit = MODELS[_active_id]["ctx"]
    if input_ids.shape[1] + max_tokens > context_limit:
        raise ContextLimitError("Messages and max_tokens exceed the model context; shorten either one.")

    # Get model input names
    input_names = {i.name for i in _session.get_inputs()}
    generated = []

    for step in range(max_tokens):
        feeds = {"input_ids": input_ids}
        if "attention_mask" in input_names:
            feeds["attention_mask"] = np.ones_like(input_ids, dtype="int64")
        if "position_ids" in input_names:
            feeds["position_ids"] = np.arange(input_ids.shape[1], dtype="int64").reshape(1, -1)

        outputs = _session.run(None, feeds)
        logits = outputs[0][:, -1, :]

        if temperature > 0.01:
            logits = logits / temperature
            probs = np.exp(logits - np.max(logits, axis=-1, keepdims=True))
            probs = probs / probs.sum(axis=-1, keepdims=True)
            next_id = int(np.random.choice(probs.shape[-1], p=probs[0]))
        else:
            next_id = int(np.argmax(logits[0]))

        if next_id == _tokenizer.eos_token_id:
            break
        generated.append(next_id)
        input_ids = np.concatenate([input_ids, np.array([[next_id]], dtype="int64")], axis=1)

        # Print progress every 10 tokens
        if step > 0 and step % 10 == 0:
            print(f"  [{step} tokens]", end="", flush=True)

    if generated:
        print()  # newline after progress
    return _tokenizer.decode(generated, skip_special_tokens=True)


# ── OpenAI-compatible endpoints ─────────────────────────────────────

@app.route("/v1/chat/completions", methods=["POST"])
def chat_completions():
    try:
        msgs, max_tok, temp, req_model = validate_chat_request(request.get_json(silent=True))
    except RequestValidationError as error:
        return api_error(error.public_message)

    # The model and tokenizer are shared; prevent overlapping swaps/inference.
    if not _generation_lock.acquire(blocking=False):
        response, status = api_error("AI service is busy; retry shortly.", 429)
        response.headers["Retry-After"] = "1"
        return response, status
    t0 = time.time()
    try:
        # Unknown client aliases keep using the active model, as before.
        if req_model and req_model in MODELS and req_model != _active_id:
            load_model(req_model)
        reply = generate(msgs, max_tok, temp)
        response_model = _active_id
    except ContextLimitError:
        return api_error("Messages and max_tokens exceed the model context; shorten either one.")
    except Exception:
        app.logger.exception("AI generation failed")
        return api_error("AI generation failed; check the server log.", 500)
    finally:
        _generation_lock.release()

    elapsed = time.time() - t0
    tok_count = len(reply.split())
    return jsonify({
        "id": f"chatcmpl-{uuid.uuid4().hex[:12]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": response_model,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": reply}, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": 0, "completion_tokens": tok_count, "total_tokens": tok_count},
        "_alloflow": {"elapsed_s": round(elapsed, 2), "tok_per_s": round(tok_count / elapsed, 1) if elapsed > 0 else 0},
    })


@app.route("/v1/models", methods=["GET"])
def list_models():
    return jsonify({
        "object": "list",
        "data": [{"id": mid, "object": "model", "owned_by": "alloflow-npu", "active": mid == _active_id, "description": info["desc"]} for mid, info in MODELS.items()],
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": _active_id, "accelerator": _session.get_providers()[0] if _session else "none"})


def main(argv=None):
    parser = argparse.ArgumentParser(description="AlloFlow NPU Server")
    parser.add_argument("--model", default="deepseek-r1-1.5b", choices=list(MODELS.keys()))
    parser.add_argument("--port", type=int, default=11435)
    parser.add_argument("--host", default="127.0.0.1",
                        help="Bind address (default: this computer only; use a LAN address to share)")
    args = parser.parse_args(argv)

    print("""
    ╔══════════════════════════════════════════╗
    ║  AlloFlow NPU Inference Server           ║
    ║  ONNX Runtime + DirectML                 ║
    ╚══════════════════════════════════════════╝
    """)
    for mid, info in MODELS.items():
        marker = " ← starting" if mid == args.model else ""
        print(f"    • {mid}: {info['desc']}{marker}")
    print()

    try:
        load_model(args.model)
        print(f"  🌐 Serving on http://{args.host}:{args.port}")
        print(f"  📡 API: POST /v1/chat/completions")
        print(f"  🔄 Switch models: {{\"model\": \"phi-3.5-mini\"}}\n")
        app.run(host=args.host, port=args.port, debug=False)
    except Exception as e:
        traceback.print_exc()
        print(f"\n  ❌ {e}")
        print("  Install: pip install onnxruntime-directml flask huggingface_hub transformers\n")


if __name__ == "__main__":
    main()
