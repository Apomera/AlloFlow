"""
Edge TTS Server — OpenAI-compatible /v1/audio/speech endpoint
Uses Microsoft Edge's free TTS service (300+ voices, 100+ languages).
Runs on port 5500. No API key needed. No Docker needed.
Loopback only by default. EDGE_TTS_HOST can explicitly enable another bind.
ALLOFLOW_TTS_ALLOWED_ORIGINS adds comma-separated exact browser origins.
"""

import asyncio
import http.server
import json
import io
import threading
import os
from urllib.parse import urlsplit


def is_allowed_origin(origin):
    """Allow native clients, loopback apps and explicitly trusted web origins."""
    if origin is None:
        return True
    if not isinstance(origin, str) or not origin or origin != origin.strip():
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


def generate_speech_sync(text, voice, speed, language=None):
    """Generate speech using edge-tts (runs async internally)."""
    import edge_tts
    
    async def _generate():
        edge_voice = resolve_edge_voice(voice, language)
        rate = f"+{int((speed - 1) * 100)}%" if speed > 1 else f"{int((speed - 1) * 100)}%" if speed < 1 else "+0%"
        
        communicate = edge_tts.Communicate(text, edge_voice, rate=rate)
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
        return audio_data
    
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_generate())
    finally:
        loop.close()


class TTSHandler(http.server.BaseHTTPRequestHandler):
    def _add_cors_headers(self):
        self.send_header("Vary", "Origin")
        origin = self.headers.get("Origin")
        if origin and is_allowed_origin(origin):
            self.send_header("Access-Control-Allow-Origin", origin)

    def _reject_untrusted_origin(self):
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
            self.end_headers()
            return
        
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}
            
            text = body.get("input", "")
            voice = body.get("voice", "alloy").lower()
            speed = float(body.get("speed", 1.0))
            
            if not text:
                self.send_response(400)
                self._add_cors_headers()
                self.end_headers()
                self.wfile.write(b'{"error": "No input text"}')
                return
            
            audio_data = generate_speech_sync(text, voice, speed, body.get("language"))
            
            if not audio_data:
                self.send_response(500)
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
            
        except Exception as e:
            print(f"[EdgeTTS] Error: {e}")
            self.send_response(500)
            self._add_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
    
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
            self.end_headers()
    
    def log_message(self, format, *args):
        # Log to console
        print(f"[EdgeTTS] {args[0]}" if args else "")


if __name__ == "__main__":
    print(f"[EdgeTTS] 🎤 Starting TTS server on port {PORT}...")
    print(f"[EdgeTTS] Endpoint: POST /v1/audio/speech")
    print(f"[EdgeTTS] {len(VOICE_MAP)} voices across {len(set(v.split('-')[0]+'-'+v.split('-')[1] for v in VOICE_MAP.values()))}+ languages")
    print(f"[EdgeTTS] Powered by Microsoft Edge Neural TTS (free, no API key)")
    
    server = http.server.HTTPServer((HOST, PORT), TTSHandler)
    print(f"[EdgeTTS] ✅ Ready at http://localhost:{PORT}")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[EdgeTTS] Shutting down...")
        server.shutdown()
