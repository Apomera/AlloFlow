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
  ALLOFLOW_TTS_ALLOWED_ORIGINS  Additional comma-separated exact browser origins
"""

import http.server
import json
import subprocess
import os
import sys
import struct
import math
import re
import threading
import time
from urllib.parse import urlsplit


def is_allowed_host(host_header):
    """Allow only loopback Host headers to defeat DNS rebinding."""
    if not isinstance(host_header, str):
        return False
    raw = host_header.strip().lower()
    if not raw or len(raw) > 255 or any(ord(c) <= 32 or ord(c) == 127 for c in raw):
        return False
    if raw.startswith("["):
        end = raw.find("]")
        if end < 0:
            return False
        host = raw[1:end]
        rest = raw[end + 1:]
        if rest:
            if not re.fullmatch(r":\d{1,5}", rest):
                return False
            if not (1 <= int(rest[1:]) <= 65535):
                return False
    else:
        if ":" in raw:
            host, port = raw.rsplit(":", 1)
            if not re.fullmatch(r"\d{1,5}", port):
                return False
            if not (1 <= int(port) <= 65535):
                return False
        else:
            host = raw
    return host in ("127.0.0.1", "localhost", "::1")


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
ALLOWED_DOWNLOAD_VOICES = frozenset(VOICE_MAP.values()) | {DEFAULT_VOICE}
MAX_REQUEST_BYTES = 65536
MAX_TEXT_CHARS = 10000
MAX_PCM_BYTES = 32 * 1024 * 1024
MAX_CONCURRENT_REQUESTS = 4
SYNTHESIS_TIMEOUT_SEC = 60.0
_speech_slots = threading.BoundedSemaphore(MAX_CONCURRENT_REQUESTS)


class AudioTooLargeError(RuntimeError):
    """Generated PCM stream exceeded MAX_PCM_BYTES."""

# Cache of voice models we've already confirmed/downloaded this session
_ready_voices = set()
_voice_locks_guard = threading.Lock()
_voice_locks = {}


def _get_voice_lock(voice_name):
    with _voice_locks_guard:
        lock = _voice_locks.get(voice_name)
        if lock is None:
            lock = threading.Lock()
            _voice_locks[voice_name] = lock
        return lock

MODEL_ID = re.compile(r"[a-z]{2,3}_[a-z]{2}-[a-z0-9_]{1,80}-(?:x_low|low|medium|high)", re.IGNORECASE | re.ASCII)


def validated_model_id(value):
    """A catalog ID, never a path or an extra command-line option."""
    if not isinstance(value, str) or not MODEL_ID.fullmatch(value):
        raise ValueError("Invalid Piper voice model ID")
    locale, speaker, quality = value.split("-")
    language, region = locale.split("_")
    return f"{language.lower()}_{region.upper()}-{speaker.lower()}-{quality.lower()}"


def resolve_voice(value):
    if not isinstance(value, str):
        raise ValueError("Voice must be a string")
    alias = value.lower()
    if alias in VOICE_MAP:
        return VOICE_MAP[alias]
    # Preserve the existing fallback for unknown friendly voice names.
    if re.fullmatch(r"[a-zA-Z0-9_]{0,80}", value):
        return DEFAULT_VOICE
    return validated_model_id(value)


def ensure_voice(voice_name):
    """Ensure a voice model is present in VOICES_DIR, downloading if needed.

    Returns True on success, False on failure.
    """
    voice_name = validated_model_id(voice_name)
    model_path = os.path.join(VOICES_DIR, f"{voice_name}.onnx")
    config_path = os.path.join(VOICES_DIR, f"{voice_name}.onnx.json")
    if voice_name in _ready_voices or (
        os.path.exists(model_path) and os.path.exists(config_path)
    ):
        _ready_voices.add(voice_name)
        return True
    if voice_name not in ALLOWED_DOWNLOAD_VOICES:
        return False

    os.makedirs(VOICES_DIR, exist_ok=True)
    with _get_voice_lock(voice_name):
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


def voice_sample_rate(voice_name):
    """Read the voice's native PCM sample rate from its .onnx.json metadata (default 22050)."""
    try:
        voice_name = validated_model_id(voice_name)
        config_path = os.path.join(VOICES_DIR, f"{voice_name}.onnx.json")
        if os.path.isfile(config_path):
            with open(config_path, "r", encoding="utf-8") as fh:
                meta = json.load(fh)
            rate = (meta.get("audio") or {}).get("sample_rate")
            if isinstance(rate, int) and 8000 <= rate <= 96000:
                return rate
    except Exception:
        pass
    return 22050


def synthesize(text, voice_name, speed):
    """Run piper and return bounded raw PCM bytes (16-bit mono), or None."""
    voice_name = validated_model_id(voice_name)
    cmd = [
        PIPER_PYTHON, "-m", "piper",
        "--model", voice_name,
        "--data-dir", VOICES_DIR,
        "--output-raw",
    ]
    if speed and speed != 1.0:
        cmd.extend(["--length-scale", str(1.0 / speed)])

    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    timed_out = threading.Event()
    timer = threading.Timer(SYNTHESIS_TIMEOUT_SEC, lambda: (timed_out.set(), proc.kill()))
    timer.daemon = True
    timer.start()

    stderr_chunks = bytearray()
    def _drain_stderr():
        try:
            while True:
                chunk = proc.stderr.read(4096)
                if not chunk:
                    break
                if len(stderr_chunks) < 4096:
                    stderr_chunks.extend(chunk[:4096 - len(stderr_chunks)])
        except Exception:
            pass

    def _feed_stdin():
        try:
            proc.stdin.write(text.encode("utf-8"))
        except Exception:
            pass
        finally:
            try:
                proc.stdin.close()
            except Exception:
                pass

    err_thread = threading.Thread(target=_drain_stderr, daemon=True)
    in_thread = threading.Thread(target=_feed_stdin, daemon=True)
    err_thread.start()
    in_thread.start()

    audio = bytearray()
    oversized = False
    try:
        while True:
            chunk = proc.stdout.read(65536)
            if not chunk:
                break
            if len(audio) + len(chunk) > MAX_PCM_BYTES:
                oversized = True
                proc.kill()
                break
            audio.extend(chunk)
    finally:
        timer.cancel()
        try:
            proc.stdout.close()
        except Exception:
            pass
        try:
            proc.wait(timeout=5)
        except Exception:
            try:
                proc.kill()
                proc.wait(timeout=2)
            except Exception:
                pass
        in_thread.join(timeout=2)
        err_thread.join(timeout=2)
        try:
            proc.stderr.close()
        except Exception:
            pass

    if oversized:
        raise AudioTooLargeError("Generated audio exceeded maximum size")
    if timed_out.is_set():
        print("[Piper TTS] Synthesis timed out", flush=True)
        return None
    if proc.returncode != 0:
        print(f"[Piper TTS] Synthesis error: "
              f"{stderr_chunks.decode(errors='replace')[:300]}", flush=True)
        return None
    return bytes(audio)


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

    def _reject_untrusted_origin(self):
        if not is_allowed_host(self.headers.get("Host")):
            self._send_json(403, {"error": "Untrusted Host header."})
            return True
        if is_allowed_origin(self.headers.get("Origin")):
            return False
        self._send_json(403, {"error": "Browser origin is not allowed; configure ALLOFLOW_TTS_ALLOWED_ORIGINS for your school app."})
        return True

    def _send_json(self, status, obj, extra_headers=None):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self._add_cors_headers()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self._reject_untrusted_origin():
            return
        if self.path != "/v1/audio/speech":
            self.send_response(404)
            self._add_security_headers()
            self.end_headers()
            return

        acquired = False
        try:
            length = int(self.headers.get("Content-Length", 0))
            if length < 0 or length > MAX_REQUEST_BYTES:
                return self._send_json(413 if length > MAX_REQUEST_BYTES else 400, {"error": "Request body exceeds maximum size"})
            body = json.loads(self.rfile.read(length)) if length else {}

            if not isinstance(body, dict):
                return self._send_json(400, {"error": "Expected a JSON object"})
            text = body.get("input", "")
            piper_voice = resolve_voice(body.get("voice", "alloy"))
            raw_speed = body.get("speed", 1.0)
            if isinstance(raw_speed, bool):
                raise TypeError("Speed must be a number")
            speed = float(raw_speed)
            if not math.isfinite(speed) or speed <= 0:
                return self._send_json(400, {"error": "Speed must be a finite positive number"})
            speed = max(0.5, min(2.5, speed))

            if not isinstance(text, str):
                return self._send_json(400, {"error": f"Input must be text up to {MAX_TEXT_CHARS} characters"})
            if not text.strip():
                return self._send_json(400, {"error": "No input text"})
            if len(text) > MAX_TEXT_CHARS:
                return self._send_json(400, {"error": f"Input must be text up to {MAX_TEXT_CHARS} characters"})

            acquired = _speech_slots.acquire(blocking=False)
            if not acquired:
                return self._send_json(429, {"error": "TTS server busy; retry shortly"}, extra_headers={"Retry-After": "1"})

            if not ensure_voice(piper_voice):
                # Fall back to the default voice if a specific one can't be fetched
                if piper_voice != DEFAULT_VOICE and ensure_voice(DEFAULT_VOICE):
                    piper_voice = DEFAULT_VOICE
                else:
                    return self._send_json(500, {"error": "Voice model not available"})

            raw_audio = synthesize(text, piper_voice, speed)
            if raw_audio is None:
                return self._send_json(500, {"error": "Synthesis failed"})
            if len(raw_audio) > MAX_PCM_BYTES:
                return self._send_json(413, {"error": "Generated audio exceeded maximum size"})

            wav_audio = pcm_to_wav(raw_audio, voice_sample_rate(piper_voice), 1)
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(wav_audio)))
            self._add_cors_headers()
            self.end_headers()
            self.wfile.write(wav_audio)
            print(f"[Piper TTS] Generated {len(wav_audio)} bytes "
                  f"for voice={piper_voice}", flush=True)

        except AudioTooLargeError:
            self._send_json(413, {"error": "Generated audio exceeded maximum size"})
        except (ValueError, TypeError, OverflowError):
            self._send_json(400, {"error": "Invalid speech request"})
        except Exception as e:
            print(f"[Piper TTS] Error: {e}", flush=True)
            try:
                self._send_json(500, {"error": "Speech generation failed"})
            except Exception:
                pass
        finally:
            if acquired:
                _speech_slots.release()

    def do_OPTIONS(self):
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
        if self.path in ("/health", "/"):
            return self._send_json(200, {
                "status": "ok",
                "engine": "piper-tts",
                "voices": list(VOICE_MAP.keys()),
            })
        self.send_response(404)
        self._add_security_headers()
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
    server = _DaemonThreadingHTTPServer(("127.0.0.1", PORT), TTSHandler)
    print(f"[Piper TTS] ✅ Listening on http://127.0.0.1:{PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Piper TTS] Shutting down...", flush=True)
        server.shutdown()
