"""
AlloFlow NPU Inference Server
Runs AI models locally on Snapdragon X NPU via ONNX Runtime + DirectML.
Serves an OpenAI-compatible API on http://localhost:11435

Usage:
  pip install onnxruntime-directml flask huggingface_hub transformers
  python npu_server.py [--model deepseek-r1-1.5b|phi-3.5-mini|qwen-2.5-1.5b] [--port 11435]

Models auto-download from HuggingFace on first run (~0.5-2.5 GB each).
"""

import argparse, json, os, time, uuid, traceback
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
_session = None
_tokenizer = None
_active_id = None


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
    _session = ort.InferenceSession(
        onnx_path, opts, providers=["DmlExecutionProvider", "CPUExecutionProvider"]
    )

    # Load tokenizer from same directory (or parent)
    try:
        _tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
    except Exception:
        # Some repos have tokenizer in parent
        parent = os.path.dirname(onnx_path)
        _tokenizer = AutoTokenizer.from_pretrained(parent, trust_remote_code=True)

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
    data = request.json or {}
    msgs = data.get("messages", [])
    max_tok = data.get("max_tokens", 512)
    temp = data.get("temperature", 0.7)

    # Input length validation: prevent token exhaustion
    MAX_TOTAL_TOKENS = 8192
    total_chars = sum(len(m.get("content", "")) for m in msgs)
    if total_chars > MAX_TOTAL_TOKENS:
        return jsonify({"error": f"Input exceeds {MAX_TOTAL_TOKENS} token limit"}), 400
    if max_tok > 4096:
        max_tok = 4096

    # Hot-swap model if requested
    req_model = data.get("model", "")
    if req_model and req_model in MODELS and req_model != _active_id:
        try:
            load_model(req_model)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    t0 = time.time()
    try:
        reply = generate(msgs, max_tok, temp)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": {"message": str(e), "type": "server_error"}}), 500

    elapsed = time.time() - t0
    tok_count = len(reply.split())
    return jsonify({
        "id": f"chatcmpl-{uuid.uuid4().hex[:12]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": _active_id,
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


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AlloFlow NPU Server")
    parser.add_argument("--model", default="deepseek-r1-1.5b", choices=list(MODELS.keys()))
    parser.add_argument("--port", type=int, default=11435)
    args = parser.parse_args()

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
        print(f"  🌐 Serving on http://localhost:{args.port}")
        print(f"  📡 API: POST /v1/chat/completions")
        print(f"  🔄 Switch models: {{\"model\": \"phi-3.5-mini\"}}\n")
        app.run(host="0.0.0.0", port=args.port, debug=False)
    except Exception as e:
        traceback.print_exc()
        print(f"\n  ❌ {e}")
        print("  Install: pip install onnxruntime-directml flask huggingface_hub transformers\n")
