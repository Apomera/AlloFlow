"""
Edge TTS Server — OpenAI-compatible TTS endpoint using Microsoft Edge TTS.
Exposes POST /v1/audio/speech with { input, voice, speed } 
Returns WAV audio matching the OpenAI TTS API format.
"""
import asyncio
import hmac
import math
import os
import threading
import edge_tts
from urllib.parse import urlsplit
from flask import Flask, request, Response, jsonify

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 256 * 1024
MAX_TEXT_CHARS = 20000
MAX_AUDIO_BYTES = 32 * 1024 * 1024
SPEECH_TIMEOUT_SECONDS = 300
_speech_slots = threading.BoundedSemaphore(4)


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify({"error": "Request body exceeds 256 KiB."}), 413


def is_allowed_origin(origin):
    """Allow native clients, loopback apps and explicitly trusted web origins."""
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
                   os.environ.get("ALLOFLOW_TTS_ALLOWED_ORIGINS", "").split(","))
    return origin in trusted


def is_allowed_host(host_header):
    if not host_header or not isinstance(host_header, str):
        return False
    raw = host_header.strip()
    if not raw or len(raw) > 255 or any(ord(c) <= 32 or ord(c) == 127 for c in raw):
        return False
    try:
        parsed = urlsplit("http://" + raw)
        if parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment:
            return False
        port = parsed.port
        if port is not None and not (1 <= port <= 65535):
            return False
        hostname = (parsed.hostname or "").lower()
    except ValueError:
        return False
    if not hostname or hostname.endswith("."):
        return False
    allowed = {"localhost", "127.0.0.1", "::1", "edge-tts"}
    for raw_origin in os.environ.get("ALLOFLOW_TTS_ALLOWED_ORIGINS", "").split(","):
        val = raw_origin.strip()
        if not val:
            continue
        try:
            h = (urlsplit(val).hostname or "").lower()
            if h:
                allowed.add(h)
        except ValueError:
            pass
    return hostname in allowed


@app.before_request
def guard_browser_origin():
    if not is_allowed_host(request.host):
        return jsonify({"error": "Host header is not allowed."}), 403
    if not is_allowed_origin(request.headers.get("Origin")):
        return jsonify({"error": "Browser origin is not allowed; configure ALLOFLOW_TTS_ALLOWED_ORIGINS for your school app."}), 403
    if request.method != "OPTIONS" and request.path != "/health":
        if str(os.environ.get("ALLOFLOW_OFFLINE_ONLY", "")).strip().lower() in ("1", "true", "yes", "on") and os.environ.get("ALLOFLOW_ALLOW_CLOUD_EDGE_TTS", "").strip() != "1":
            return jsonify({"error": "Cloud Edge TTS is disabled in ALLOFLOW_OFFLINE_ONLY mode; use local Piper TTS or set ALLOFLOW_ALLOW_CLOUD_EDGE_TTS=1."}), 403
        expected_token = os.environ.get("ALLOFLOW_TTS_API_TOKEN", "").strip()
        extra_origins = [v.strip() for v in os.environ.get("ALLOFLOW_TTS_ALLOWED_ORIGINS", "").split(",") if v.strip()]
        if (expected_token and len(expected_token) < 32) or (extra_origins and len(expected_token) < 32):
            return jsonify({"error": "Server misconfigured: ALLOFLOW_TTS_API_TOKEN (>=32 chars) is required when configured or when extra origins are enabled."}), 503
        if expected_token:
            auth = request.headers.get("Authorization", "")
            prefix = "Bearer "
            if (len(auth) > 1024
                    or not auth.startswith(prefix)
                    or not hmac.compare_digest(auth[len(prefix):].strip().encode("utf-8"), expected_token.encode("utf-8"))):
                return jsonify({"error": "Valid bearer token required."}), 401


@app.after_request
def add_cors_headers(response):
    response.vary.add("Origin")
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Cache-Control", "no-store")
    origin = request.headers.get("Origin")
    if origin and is_allowed_origin(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

# Map OpenAI-style voice IDs to actual Edge TTS voice names
VOICE_MAP = {
    # English US
    "alloy":   "en-US-AvaNeural",
    "echo":    "en-US-AndrewNeural",
    "nova":    "en-US-JennyNeural",
    "shimmer": "en-US-AriaNeural",
    "puck":    "en-US-BrianNeural",
    "onyx":    "en-US-GuyNeural",
    # English UK
    "fable":   "en-GB-SoniaNeural",
    # Multilingual
    "es":      "es-ES-ElviraNeural",
    "fr":      "fr-FR-DeniseNeural",
    "de":      "de-DE-KatjaNeural",
    "pt":      "pt-BR-FranciscaNeural",
    "it":      "it-IT-ElsaNeural",
    "zh":      "zh-CN-XiaoxiaoNeural",
    "ja":      "ja-JP-NanamiNeural",
    "ko":      "ko-KR-SunHiNeural",
    "ar":      "ar-SA-ZariyahNeural",
    "hi":      "hi-IN-SwaraNeural",
    "ru":      "ru-RU-SvetlanaNeural",
    "tr":      "tr-TR-EmelNeural",
    "vi":      "vi-VN-HoaiMyNeural",
    "th":      "th-TH-PremwadeeNeural",
    "pl":      "pl-PL-AgnieszkaNeural",
    "nl":      "nl-NL-ColetteNeural",
    "sv":      "sv-SE-SofieNeural",
    "uk":      "uk-UA-PolinaNeural",
    "id":      "id-ID-GadisNeural",
    "ms":      "ms-MY-YasminNeural",
}


def _run_edge_tts(text: str, voice: str, rate: str) -> bytes:
    """Run edge-tts in a sync context, return MP3 bytes."""
    async def _generate():
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        audio_data = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                if len(audio_data) + len(chunk["data"]) > MAX_AUDIO_BYTES:
                    raise RuntimeError("Speech output exceeded the audio size limit")
                audio_data.extend(chunk["data"])
        return bytes(audio_data)

    async def _bounded_generate():
        return await asyncio.wait_for(_generate(), SPEECH_TIMEOUT_SECONDS)

    # asyncio.run also closes streaming generators when a size/timeout limit trips.
    return asyncio.run(_bounded_generate())


@app.route("/v1/audio/speech", methods=["POST"])
def speech():
    """OpenAI-compatible TTS endpoint."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Request must be a JSON object."}), 400
    text = data.get("input", "")
    if not isinstance(text, str):
        return jsonify({"error": "Input must be text."}), 400
    if not text.strip():
        return jsonify({"error": "No input text provided"}), 400
    if len(text) > MAX_TEXT_CHARS:
        return jsonify({"error": "Input exceeds 20000 characters; split it into shorter passages."}), 400
    voice_id = data.get("voice", "alloy")
    if not isinstance(voice_id, str) or not voice_id or len(voice_id) > 128:
        return jsonify({"error": "Voice must be a nonempty string of at most 128 characters."}), 400
    voice_id = voice_id.lower()
    raw_speed = data.get("speed", 1.0)
    try:
        if isinstance(raw_speed, bool) or not isinstance(raw_speed, (int, float, str)):
            raise ValueError
        speed = float(raw_speed)
        if not math.isfinite(speed) or not 0.25 <= speed <= 4.0:
            raise ValueError
    except (ValueError, OverflowError):
        return jsonify({"error": "Speed must be a finite number between 0.25 and 4."}), 400

    # Resolve voice
    edge_voice = VOICE_MAP.get(voice_id, "en-US-AvaNeural")

    # Convert speed to Edge TTS rate string (e.g., "+20%", "-10%")
    rate_pct = int((speed - 1.0) * 100)
    rate_str = f"+{rate_pct}%" if rate_pct >= 0 else f"{rate_pct}%"

    if not _speech_slots.acquire(blocking=False):
        return jsonify({"error": "Speech service is busy; retry shortly."}), 429, {"Retry-After": "1"}
    try:
        audio_bytes = _run_edge_tts(text, edge_voice, rate_str)
        if not audio_bytes:
            return jsonify({"error": "No audio generated"}), 500
        return Response(audio_bytes, mimetype="audio/mpeg")
    except Exception:
        app.logger.exception("Speech generation failed")
        return jsonify({"error": "Speech generation failed; check the server log."}), 500
    finally:
        _speech_slots.release()


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "edge-tts", "voices": len(VOICE_MAP)})


@app.route("/v1/voices", methods=["GET"])
def list_voices():
    """List available voice mappings."""
    voices = [{"id": k, "name": v} for k, v in VOICE_MAP.items()]
    return jsonify({"voices": voices})


if __name__ == "__main__":
    print(f"🎤 Edge TTS Server starting on port 5001 ({len(VOICE_MAP)} voices)")
    app.run(host="0.0.0.0", port=5001, debug=False)
