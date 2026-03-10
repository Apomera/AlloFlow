"""
Edge TTS Server — OpenAI-compatible /v1/audio/speech endpoint
Uses Microsoft Edge's free TTS service (300+ voices, 100+ languages).
Runs on port 5500. No API key needed. No Docker needed.
"""

import asyncio
import http.server
import json
import io
import threading

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

def generate_speech_sync(text, voice, speed):
    """Generate speech using edge-tts (runs async internally)."""
    import edge_tts
    
    async def _generate():
        edge_voice = VOICE_MAP.get(voice, VOICE_MAP.get("alloy"))
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
    def do_POST(self):
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
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(b'{"error": "No input text"}')
                return
            
            audio_data = generate_speech_sync(text, voice, speed)
            
            if not audio_data:
                self.send_response(500)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(b'{"error": "TTS generation failed"}')
                return
            
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Length", str(len(audio_data)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(audio_data)
            
        except Exception as e:
            print(f"[EdgeTTS] Error: {e}")
            self.send_response(500)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
    
    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
    
    def do_GET(self):
        if self.path == "/health" or self.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
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
    
    server = http.server.HTTPServer(("0.0.0.0", PORT), TTSHandler)
    print(f"[EdgeTTS] ✅ Ready at http://localhost:{PORT}")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[EdgeTTS] Shutting down...")
        server.shutdown()
