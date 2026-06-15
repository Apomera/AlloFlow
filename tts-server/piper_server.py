"""
Piper TTS Server — OpenAI-compatible /v1/audio/speech endpoint
Runs on port 5500. Used by AlloFlow's AIProvider TTS fallback chain.

Engine: the maintained `piper-tts` Python package (OHF-Voice/piper1-gpl),
invoked as `<python> -m piper`. This package bundles its own native runtime
and onnx libraries, so there is no dependency on a separately-downloaded
piper binary (the standalone macOS binary release ships without its dylibs
and cannot run). Voices are fetched on demand via `piper.download_voices`.

Environment:
  PIPER_PYTHON       Python interpreter that has `piper-tts` installed
                     (default: the interpreter running this script)
  PIPER_VOICES_DIR   Writable directory for downloaded voice models
                     (default: ./piper-voices next to this script)
  PIPER_PORT         Port to listen on (default: 5500)
"""

import http.server
import json
import subprocess
import os
import sys
import struct

PORT = int(os.environ.get("PIPER_PORT", "5500"))

# Interpreter that has the piper-tts package installed. nativeProcessManager
# points this at the venv it creates; fall back to the current interpreter.
PIPER_PYTHON = os.environ.get("PIPER_PYTHON") or sys.executable

# Writable voices directory. The app bundle is read-only on macOS, so the
# admin app passes a path under ~/.alloflow. Fall back to a sibling dir.
VOICES_DIR = os.environ.get("PIPER_VOICES_DIR") or os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "piper-voices"
)

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

DEFAULT_VOICE = "en_US-amy-medium"

# Cache of voice models we've already confirmed/downloaded this session
_ready_voices = set()


def ensure_voice(voice_name):
    """Ensure a voice model is present in VOICES_DIR, downloading if needed.

    Returns True on success, False on failure.
    """
    os.makedirs(VOICES_DIR, exist_ok=True)

    model_path = os.path.join(VOICES_DIR, f"{voice_name}.onnx")
    config_path = os.path.join(VOICES_DIR, f"{voice_name}.onnx.json")
    if voice_name in _ready_voices or (
        os.path.exists(model_path) and os.path.exists(config_path)
    ):
        _ready_voices.add(voice_name)
        return True

    print(f"[Piper TTS] Downloading voice {voice_name}...", flush=True)
    try:
        proc = subprocess.run(
            [PIPER_PYTHON, "-m", "piper.download_voices", voice_name,
             "--data-dir", VOICES_DIR],
            capture_output=True,
            timeout=300,
        )
        if proc.returncode != 0:
            print(f"[Piper TTS] Voice download failed: "
                  f"{proc.stderr.decode(errors='replace')[:300]}", flush=True)
            return False
        _ready_voices.add(voice_name)
        print(f"[Piper TTS] Voice {voice_name} ready", flush=True)
        return True
    except Exception as e:
        print(f"[Piper TTS] Voice download error: {e}", flush=True)
        return False


def synthesize(text, voice_name, speed):
    """Run piper and return raw PCM bytes (16-bit mono 22050 Hz), or None."""
    cmd = [
        PIPER_PYTHON, "-m", "piper",
        "--model", voice_name,
        "--data-dir", VOICES_DIR,
        "--output-raw",
    ]
    if speed and speed != 1.0:
        cmd.extend(["--length-scale", str(1.0 / speed)])

    proc = subprocess.run(
        cmd, input=text.encode("utf-8"), capture_output=True, timeout=60
    )
    if proc.returncode != 0:
        print(f"[Piper TTS] Synthesis error: "
              f"{proc.stderr.decode(errors='replace')[:300]}", flush=True)
        return None
    return proc.stdout


class TTSHandler(http.server.BaseHTTPRequestHandler):
    def _send_json(self, status, obj):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/v1/audio/speech":
            self.send_response(404)
            self.end_headers()
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}

            text = body.get("input", "")
            voice = str(body.get("voice", "alloy")).lower()
            speed = body.get("speed", 1.0)

            if not text:
                return self._send_json(400, {"error": "No input text"})

            # Accept either an OpenAI alias (nova/alloy/…) or a raw Piper model
            # name (en_US-amy-medium). Unknown → default voice.
            if voice in VOICE_MAP:
                piper_voice = VOICE_MAP[voice]
            elif "-" in voice and "_" in voice:
                piper_voice = voice  # looks like a Piper model id
            else:
                piper_voice = DEFAULT_VOICE

            if not ensure_voice(piper_voice):
                # Fall back to the default voice if a specific one can't be fetched
                if piper_voice != DEFAULT_VOICE and ensure_voice(DEFAULT_VOICE):
                    piper_voice = DEFAULT_VOICE
                else:
                    return self._send_json(500, {"error": "Voice model not available"})

            raw_audio = synthesize(text, piper_voice, speed)
            if raw_audio is None:
                return self._send_json(500, {"error": "Synthesis failed"})

            wav_audio = pcm_to_wav(raw_audio, 22050, 1)
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(wav_audio)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(wav_audio)
            print(f"[Piper TTS] Generated {len(wav_audio)} bytes "
                  f"for voice={piper_voice}", flush=True)

        except Exception as e:
            print(f"[Piper TTS] Error: {e}", flush=True)
            try:
                self._send_json(500, {"error": str(e)})
            except Exception:
                pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        if self.path in ("/health", "/"):
            return self._send_json(200, {
                "status": "ok",
                "engine": "piper-tts",
                "python": PIPER_PYTHON,
                "voices_dir": VOICES_DIR,
                "voices": list(VOICE_MAP.keys()),
            })
        self.send_response(404)
        self.end_headers()

    def log_message(self, fmt, *args):
        pass


def pcm_to_wav(pcm_data, sample_rate=22050, channels=1, bits_per_sample=16):
    """Convert raw PCM to WAV format."""
    data_size = len(pcm_data)
    file_size = 44 + data_size - 8
    byte_rate = sample_rate * channels * bits_per_sample // 8
    block_align = channels * bits_per_sample // 8
    header = struct.pack(
        '<4sI4s4sIHHIIHH4sI',
        b'RIFF', file_size, b'WAVE',
        b'fmt ', 16, 1,
        channels, sample_rate, byte_rate, block_align, bits_per_sample,
        b'data', data_size,
    )
    return header + pcm_data


def _preflight():
    """Verify the piper module is importable; print a clear message if not."""
    try:
        proc = subprocess.run(
            [PIPER_PYTHON, "-c", "import piper"],
            capture_output=True, timeout=30,
        )
        if proc.returncode != 0:
            print(f"[Piper TTS] ⚠ piper module not available in {PIPER_PYTHON}: "
                  f"{proc.stderr.decode(errors='replace')[:200]}", flush=True)
            return False
        return True
    except Exception as e:
        print(f"[Piper TTS] ⚠ preflight failed: {e}", flush=True)
        return False


if __name__ == "__main__":
    print(f"[Piper TTS] Starting on port {PORT} "
          f"(python={PIPER_PYTHON}, voices={VOICES_DIR})", flush=True)
    if _preflight():
        # Pre-download the default voice so the first request is fast
        ensure_voice(DEFAULT_VOICE)
    server = http.server.HTTPServer(("127.0.0.1", PORT), TTSHandler)
    print(f"[Piper TTS] ✅ Listening on http://127.0.0.1:{PORT}", flush=True)
    server.serve_forever()
