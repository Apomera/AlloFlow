"""
Edge TTS Server — OpenAI-compatible /v1/audio/speech endpoint
Uses Microsoft Edge's free TTS service (300+ voices, 100+ languages).
Runs on port 5500. No API key needed. No Docker needed.
Loopback only by default. EDGE_TTS_HOST can explicitly enable another bind.
ALLOFLOW_TTS_ALLOWED_ORIGINS adds comma-separated exact browser origins.
"""

import asyncio
import hmac
import http.server
import json
import io
import math
import re
import threading
import os
from urllib.parse import urlsplit

LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "::1"}


def _offline_only_enabled():
    return str(os.environ.get("ALLOFLOW_OFFLINE_ONLY", "")).strip().lower() in ("1", "true", "yes", "on")


def is_allowed_host(host_header):
    """Allow only loopback Host headers (or explicit non-wildcard bind/origin hosts) to defeat DNS rebinding."""
    if not isinstance(host_header, str):
        return False
    raw = host_header.strip().lower()
    if not raw or any(ord(c) <= 32 or ord(c) == 127 for c in raw):
        return False
    if raw.startswith("["):
        end = raw.find("]")
        if end < 0:
            return False
        host = raw[1:end]
        rest = raw[end + 1:]
        if rest and not re.fullmatch(r":\d{1,5}", rest):
            return False
    else:
        if ":" in raw:
            host, port = raw.rsplit(":", 1)
            if not re.fullmatch(r"\d{1,5}", port):
                return False
        else:
            host = raw
    allowed = set(LOOPBACK_HOSTS)
    bind_host = (HOST or "").strip().lower()
    if bind_host and bind_host not in ("0.0.0.0", "::", "*"):
        allowed.add(bind_host)
    for entry in os.environ.get("ALLOFLOW_TTS_ALLOWED_ORIGINS", "").split(","):
        entry = entry.strip()
        if not entry:
            continue
        try:
            parsed = urlsplit(entry)
            if parsed.hostname:
                allowed.add(parsed.hostname.lower())
        except ValueError:
            continue
    return host in allowed


def is_allowed_origin(origin):
    """Allow native clients, loopback apps and explicitly trusted web origins."""
    if origin is None:
        return True
    if not isinstance(origin, str) or not origin or origin != origin.strip():
        return False
    # urlsplit removes CR/LF/TAB; reject them before validating or echoing headers.
    if any(ord(char) <= 32 or ord(char) == 127 for char in origin):
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

# Voice mappings: OpenAI voice name → Edge TTS voice
VOICE_MAP = {
    # English
    "alloy":   "en-US-AvaMultilingualNeural",
    "echo":    "en-US-AndrewMultilingualNeural",
    "fable":   "en-GB-SoniaNeural",
    "onyx":    "en-US-GuyNeural",
    "nova":    "en-US-JennyNeural",
    "shimmer": "en-US-AriaNeural",
    "puck":    "en-US-BrianMultilingualNeural",
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

PORT = 5500
HOST = os.environ.get("EDGE_TTS_HOST") or "127.0.0.1"
MAX_REQUEST_BYTES = 65536
MAX_TEXT_CHARS = 10000
MAX_AUDIO_BYTES = 15 * 1024 * 1024
GENERATION_TIMEOUT_SEC = 30.0

LANGUAGE_ALIASES = {
    "english": "en", "spanish": "es", "french": "fr", "german": "de",
    "portuguese": "pt", "italian": "it", "chinese": "zh", "japanese": "ja",
    "korean": "ko", "arabic": "ar", "hindi": "hi", "russian": "ru",
    "turkish": "tr", "vietnamese": "vi", "thai": "th", "polish": "pl",
    "dutch": "nl", "swedish": "sv", "ukrainian": "uk", "indonesian": "id", "malay": "ms",
}

def resolve_edge_voice(voice, language=None):
    """Preserve explicit Edge choices, otherwise use the content language."""
    requested = str(voice or "alloy").strip().lower()
    native_voices = {value.lower(): value for value in VOICE_MAP.values()}
    if requested in native_voices:
        return native_voices[requested]
    if requested in VOICE_MAP and len(requested) == 2:
        return VOICE_MAP[requested]
    hint = str(language or "").strip().lower().replace("_", "-")
    code = LANGUAGE_ALIASES.get(hint, hint.split("-")[0])
    if code != "en" and code in VOICE_MAP:
        return VOICE_MAP[code]
    return VOICE_MAP.get(requested, VOICE_MAP["alloy"])


MAX_CONCURRENT_REQUESTS = 4
_speech_slots = threading.BoundedSemaphore(MAX_CONCURRENT_REQUESTS)


def generate_speech_sync(text, voice, speed, language=None):
    """Generate speech using edge-tts (runs async internally)."""
    import edge_tts

    async def _generate():
        edge_voice = resolve_edge_voice(voice, language)
        rate = f"+{int((speed - 1) * 100)}%" if speed > 1 else f"{int((speed - 1) * 100)}%" if speed < 1 else "+0%"

        communicate = edge_tts.Communicate(text, edge_voice, rate=rate)
        audio_data = bytearray()
        stream = communicate.stream()
        try:
            async for chunk in stream:
                if chunk["type"] == "audio":
                    piece = chunk["data"]
                    if len(audio_data) + len(piece) > MAX_AUDIO_BYTES:
                        raise ValueError("Generated audio exceeded maximum allowed size")
                    audio_data.extend(piece)
        finally:
            await stream.aclose()
        return bytes(audio_data)

    return asyncio.run(asyncio.wait_for(_generate(), timeout=GENERATION_TIMEOUT_SEC))


class _DaemonThreadingHTTPServer(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


class TTSHandler(http.server.BaseHTTPRequestHandler):
    def setup(self):
        if hasattr(self.request, "settimeout"):
            self.request.settimeout(15)
        super().setup()

    def _add_security_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")

    def _add_cors_headers(self):
        self._add_security_headers()
        self.send_header("Vary", "Origin")
        origin = self.headers.get("Origin")
        if origin and is_allowed_origin(origin):
            self.send_header("Access-Control-Allow-Origin", origin)

    def _check_auth(self):
        configured_token = (os.environ.get("ALLOFLOW_TTS_API_TOKEN") or "").strip()
        non_loopback = (HOST or "").strip().lower() not in LOOPBACK_HOSTS
        if not configured_token and not non_loopback:
            return True
        if not configured_token and non_loopback:
            self.send_response(403)
            self.send_header("Content-Type", "application/json")
            self._add_cors_headers()
            self.end_headers()
            self.wfile.write(b'{"error":"ALLOFLOW_TTS_API_TOKEN is required when binding beyond loopback."}')
            return False
        auth_header = self.headers.get("Authorization") or ""
        provided = auth_header[7:].strip() if auth_header.startswith("Bearer ") else ""
        if not provided or not hmac.compare_digest(provided, configured_token):
            self.send_response(401)
            self.send_header("Content-Type", "application/json")
            self._add_cors_headers()
            self.end_headers()
            self.wfile.write(b'{"error":"Unauthorized TTS request."}')
            return False
        return True

    def _reject_untrusted_origin(self):
        if not is_allowed_host(self.headers.get("Host")):
            self.send_response(403)
            self.send_header("Content-Type", "application/json")
            self._add_cors_headers()
            self.end_headers()
            self.wfile.write(b'{"error":"Untrusted Host header."}')
            return True
        if is_allowed_origin(self.headers.get("Origin")):
            return False
        self.send_response(403)
        self.send_header("Content-Type", "application/json")
        self._add_cors_headers()
        self.end_headers()
        self.wfile.write(b'{"error":"Browser origin is not allowed; configure ALLOFLOW_TTS_ALLOWED_ORIGINS for your school app."}')
        return True

    def do_POST(self):
        if self._reject_untrusted_origin():
            return
        if self.path != "/v1/audio/speech":
            self.send_response(404)
            self._add_security_headers()
            self.end_headers()
            return
        if not self._check_auth():
            return
        if _offline_only_enabled():
            self.send_response(503)
            self.send_header("Content-Type", "application/json")
            self._add_cors_headers()
            self.end_headers()
            self.wfile.write(b'{"error":"Edge TTS is disabled in ALLOFLOW_OFFLINE_ONLY mode."}')
            return

        acquired = False
        try:
            length = int(self.headers.get("Content-Length", 0))
            if length < 0 or length > MAX_REQUEST_BYTES:
                self.send_response(413 if length > MAX_REQUEST_BYTES else 400)
                self.send_header("Content-Type", "application/json")
                self._add_cors_headers()
                self.end_headers()
                self.wfile.write(b'{"error": "Request body exceeds maximum size"}')
                return
            body = json.loads(self.rfile.read(length)) if length else {}
            if not isinstance(body, dict):
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self._add_cors_headers()
                self.end_headers()
                self.wfile.write(b'{"error": "Expected a JSON object"}')
                return

            text = body.get("input", "")
            raw_voice = body.get("voice", "alloy")
            if raw_voice is None:
                raw_voice = "alloy"
            if not isinstance(raw_voice, str) or len(raw_voice) > 128:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self._add_cors_headers()
                self.end_headers()
                self.wfile.write(b'{"error": "Invalid voice parameter"}')
                return
            voice = raw_voice.lower()
            raw_speed = body.get("speed", 1.0)
            if isinstance(raw_speed, bool):
                raise TypeError("Speed must be a number")
            speed = float(raw_speed)
            if not math.isfinite(speed) or speed <= 0:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self._add_cors_headers()
                self.end_headers()
                self.wfile.write(b'{"error": "Speed must be a finite positive number"}')
                return
            speed = max(0.5, min(2.5, speed))

            if not isinstance(text, str) or not text.strip():
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self._add_cors_headers()
                self.end_headers()
                self.wfile.write(b'{"error": "No input text"}')
                return
            if len(text) > MAX_TEXT_CHARS:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self._add_cors_headers()
                self.end_headers()
                self.wfile.write(b'{"error": "Invalid or oversized input text"}')
                return

            raw_lang = body.get("language")
            if raw_lang is not None and (not isinstance(raw_lang, str) or len(raw_lang) > 64):
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self._add_cors_headers()
                self.end_headers()
                self.wfile.write(b'{"error": "Invalid language parameter"}')
                return

            acquired = _speech_slots.acquire(blocking=False)
            if not acquired:
                self.send_response(429)
                self.send_header("Content-Type", "application/json")
                self.send_header("Retry-After", "1")
                self._add_cors_headers()
                self.end_headers()
                self.wfile.write(b'{"error": "TTS server busy; retry shortly"}')
                return

            audio_data = generate_speech_sync(text, voice, speed, raw_lang)

            if not audio_data:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self._add_cors_headers()
                self.end_headers()
                self.wfile.write(b'{"error": "TTS generation failed"}')
                return

            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Length", str(len(audio_data)))
            self._add_cors_headers()
            self.end_headers()
            self.wfile.write(audio_data)

        except (ValueError, TypeError, OverflowError):
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self._add_cors_headers()
            self.end_headers()
            self.wfile.write(b'{"error": "Invalid speech request"}')
        except Exception as e:
            print(f"[EdgeTTS] Error: {e}")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self._add_cors_headers()
            self.end_headers()
            self.wfile.write(b'{"error": "Speech generation failed"}')
        finally:
            if acquired:
                _speech_slots.release()

    def do_OPTIONS(self):
        """Handle CORS preflight."""
        if self._reject_untrusted_origin():
            return
        self.send_response(200)
        self._add_cors_headers()
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        if self._reject_untrusted_origin():
            return
        if self.path == "/health" or self.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._add_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "engine": "edge-tts",
                "voices": list(VOICE_MAP.keys()),
                "total_voices": len(VOICE_MAP),
            }).encode())
        else:
            self.send_response(404)
            self._add_security_headers()
            self.end_headers()

    def log_message(self, format, *args):
        # Log to console
        print(f"[EdgeTTS] {args[0]}" if args else "")


if __name__ == "__main__":
    print(f"[EdgeTTS] 🎤 Starting TTS server on port {PORT}...")
    print(f"[EdgeTTS] Endpoint: POST /v1/audio/speech")
    print(f"[EdgeTTS] {len(VOICE_MAP)} voices across {len(set(v.split('-')[0]+'-'+v.split('-')[1] for v in VOICE_MAP.values()))}+ languages")
    print(f"[EdgeTTS] Powered by Microsoft Edge Neural TTS (free, no API key)")

    server = _DaemonThreadingHTTPServer((HOST, PORT), TTSHandler)
    print(f"[EdgeTTS] ✅ Ready at http://localhost:{PORT}")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[EdgeTTS] Shutting down...")
        server.shutdown()
