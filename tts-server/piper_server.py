"""
Piper TTS Server — OpenAI-compatible /v1/audio/speech endpoint
Runs on port 5500. Used by AlloFlow's AIProvider TTS fallback chain.
Supports multiple voices and auto-downloads voice models.
"""

import http.server
import json
import subprocess
import os
import sys
import urllib.request
import io

PORT = 5500
VOICES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "piper-voices")

# Voice mappings: OpenAI voice name → Piper model
VOICE_MAP = {
    "alloy":   "en_US-amy-medium",
    "echo":    "en_US-ryan-medium", 
    "fable":   "en_GB-jenny_dioco-medium",
    "onyx":    "en_US-ryan-low",
    "nova":    "en_US-amy-medium",
    "shimmer": "en_US-amy-low",
    "puck":    "en_US-ryan-medium",
    # Language-specific voices
    "es":      "es_ES-davefx-medium",
    "fr":      "fr_FR-upmc-medium",
    "de":      "de_DE-thorsten-medium",
    "pt":      "pt_BR-faber-medium",
    "it":      "it_IT-riccardo-x_low",
    "zh":      "zh_CN-huayan-medium",
    "ja":      "ja_JP-takumi-medium",
    "ko":      "ko_KR-kagamine_rin-medium",
}

MODEL_BASE_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main"

def ensure_voice(voice_name):
    """Download voice model if not already cached."""
    os.makedirs(VOICES_DIR, exist_ok=True)
    
    # Parse: en_US-amy-medium → en/en_US/amy/medium/en_US-amy-medium.onnx
    parts = voice_name.split("-")
    lang = parts[0]  # en_US
    lang_short = lang.split("_")[0]  # en
    speaker = parts[1]  # amy
    quality = parts[2] if len(parts) > 2 else "medium"  # medium
    
    model_path = os.path.join(VOICES_DIR, f"{voice_name}.onnx")
    config_path = os.path.join(VOICES_DIR, f"{voice_name}.onnx.json")
    
    if os.path.exists(model_path) and os.path.exists(config_path):
        return model_path
    
    # Download model + config
    base = f"{MODEL_BASE_URL}/{lang_short}/{lang}/{speaker}/{quality}"
    for ext in [".onnx", ".onnx.json"]:
        url = f"{base}/{voice_name}{ext}"
        local = os.path.join(VOICES_DIR, f"{voice_name}{ext}")
        if not os.path.exists(local):
            print(f"[Piper TTS] Downloading {voice_name}{ext}...")
            try:
                urllib.request.urlretrieve(url, local)
                print(f"[Piper TTS] ✅ Downloaded {voice_name}{ext}")
            except Exception as e:
                print(f"[Piper TTS] ❌ Failed to download {voice_name}{ext}: {e}")
                return None
    
    return model_path


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
            speed = body.get("speed", 1.0)
            
            if not text:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'{"error": "No input text"}')
                return
            
            # Map voice name
            piper_voice = VOICE_MAP.get(voice, VOICE_MAP.get("alloy"))
            model_path = ensure_voice(piper_voice)
            
            if not model_path:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(b'{"error": "Voice model not available"}')
                return
            
            # Generate audio with piper
            cmd = [
                sys.executable, "-m", "piper",
                "--model", model_path,
                "--output-raw"
            ]
            
            if speed != 1.0:
                cmd.extend(["--length-scale", str(1.0 / speed)])
            
            proc = subprocess.run(
                cmd,
                input=text.encode("utf-8"),
                capture_output=True,
                timeout=30
            )
            
            if proc.returncode != 0:
                print(f"[Piper TTS] Error: {proc.stderr.decode()[:200]}")
                self.send_response(500)
                self.end_headers()
                return
            
            raw_audio = proc.stdout
            
            # Convert raw PCM (16-bit, 22050 Hz, mono) to WAV
            wav_audio = pcm_to_wav(raw_audio, 22050, 1)
            
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(wav_audio)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(wav_audio)
            
            print(f"[Piper TTS] ✅ Generated {len(wav_audio)} bytes for voice={piper_voice}")
            
        except Exception as e:
            print(f"[Piper TTS] Error: {e}")
            self.send_response(500)
            self.end_headers()
    
    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
    
    def do_GET(self):
        """Health check."""
        if self.path == "/health" or self.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "engine": "piper-tts",
                "voices": list(VOICE_MAP.keys()),
            }).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        """Quiet logging."""
        pass


def pcm_to_wav(pcm_data, sample_rate=22050, channels=1, bits_per_sample=16):
    """Convert raw PCM to WAV format."""
    import struct
    data_size = len(pcm_data)
    header_size = 44
    file_size = header_size + data_size - 8
    byte_rate = sample_rate * channels * bits_per_sample // 8
    block_align = channels * bits_per_sample // 8
    
    header = struct.pack('<4sI4s4sIHHIIHH4sI',
        b'RIFF', file_size, b'WAVE',
        b'fmt ', 16,  # chunk size
        1,  # PCM format
        channels, sample_rate, byte_rate, block_align, bits_per_sample,
        b'data', data_size
    )
    return header + pcm_data


if __name__ == "__main__":
    # Pre-download default voice
    print(f"[Piper TTS] Starting on port {PORT}...")
    ensure_voice(VOICE_MAP["alloy"])
    
    server = http.server.HTTPServer(("0.0.0.0", PORT), TTSHandler)
    print(f"[Piper TTS] ✅ Server ready at http://localhost:{PORT}")
    print(f"[Piper TTS] Endpoint: POST /v1/audio/speech")
    print(f"[Piper TTS] Available voices: {', '.join(VOICE_MAP.keys())}")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Piper TTS] Shutting down...")
        server.shutdown()
