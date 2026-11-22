"""Round 12 / Wave 43 behavioral regressions for Docker & standalone TTS/NPU/Flux Python services."""
import importlib.util
import io
import json
import os
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "docker" / "flux-server"))


def load_module(name, rel_path):
    spec = importlib.util.spec_from_file_location(name, ROOT / rel_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class _FakeSocket:
    def __init__(self, raw_request: bytes):
        self.incoming = io.BytesIO(raw_request)
        self.output = bytearray()

    def makefile(self, *_args):
        return self.incoming

    def sendall(self, data):
        self.output.extend(data)


class Round12Wave43ServerTests(unittest.TestCase):
    def test_standalone_edge_tts_non_ascii_auth_and_port_bounds(self):
        mod = load_module("r12_edge_tts", "tts-server/edge_tts_server.py")
        self.assertFalse(mod.is_allowed_host("localhost:0"))
        self.assertFalse(mod.is_allowed_host("localhost:65536"))
        self.assertFalse(mod.is_allowed_host("[::1]:99999"))
        self.assertTrue(mod.is_allowed_host("localhost:5500"))

        payload = json.dumps({"input": "Hello"}).encode()
        raw = (
            "POST /v1/audio/speech HTTP/1.0\r\n"
            "Host: 127.0.0.1:5500\r\n"
            "Content-Type: application/json\r\n"
            "Authorization: Bearer \xe9\xe9\xe9\r\n"
            f"Content-Length: {len(payload)}\r\n\r\n"
        ).encode("latin-1") + payload
        sock = _FakeSocket(raw)
        with mock.patch.dict(os.environ, {"ALLOFLOW_TTS_API_TOKEN": "a" * 40, "ALLOFLOW_OFFLINE_ONLY": "0"}), \
             mock.patch.object(mod.TTSHandler, "log_message"):
            mod.TTSHandler(sock, ("127.0.0.1", 12345), types.SimpleNamespace())
        head = bytes(sock.output).split(b"\r\n\r\n", 1)[0].decode("latin-1")
        self.assertIn(" 401 ", head)

    def test_piper_server_security_headers_lock_leak_guard_bool_speed_and_sample_rate(self):
        mod = load_module("r12_piper", "tts-server/piper_server.py")
        self.assertFalse(mod.is_allowed_host("localhost:0"))
        self.assertFalse(mod.is_allowed_host("localhost:65536"))

        # Unlisted voice IDs must NOT leak entries into _voice_locks
        mod._voice_locks.clear()
        with tempfile.TemporaryDirectory() as tmp:
            old_dir = mod.VOICES_DIR
            try:
                mod.VOICES_DIR = tmp
                self.assertFalse(mod.ensure_voice("aa_AA-unlisted99-low"))
                self.assertNotIn("aa_AA-unlisted99-low", mod._voice_locks)

                # Native sample rate is read from .onnx.json (e.g. 16000 Hz for x_low/low voices)
                (Path(tmp) / "it_IT-riccardo-x_low.onnx.json").write_text(
                    json.dumps({"audio": {"sample_rate": 16000}}), encoding="utf-8"
                )
                self.assertEqual(mod.voice_sample_rate("it_IT-riccardo-x_low"), 16000)
                self.assertEqual(mod.voice_sample_rate("en_US-amy-medium"), 22050)
            finally:
                mod.VOICES_DIR = old_dir

        # Reject boolean speed, whitespace-only input, and emit no-store + nosniff headers
        for bad_body in ({"input": "hi", "speed": True}, {"input": "   "}):
            payload = json.dumps(bad_body).encode()
            raw = (
                "POST /v1/audio/speech HTTP/1.0\r\n"
                "Host: 127.0.0.1:5500\r\n"
                "Origin: http://localhost:3000\r\n"
                "Content-Type: application/json\r\n"
                f"Content-Length: {len(payload)}\r\n\r\n"
            ).encode() + payload
            sock = _FakeSocket(raw)
            mod.TTSHandler(sock, ("127.0.0.1", 12345), types.SimpleNamespace())
            head = bytes(sock.output).split(b"\r\n\r\n", 1)[0].decode()
            self.assertIn(" 400 ", head)
            self.assertIn("Cache-Control: no-store", head)
            self.assertIn("X-Content-Type-Options: nosniff", head)

    def test_docker_edge_tts_offline_only_accepts_true_yes_on(self):
        fake_edge_tts = types.ModuleType("edge_tts")
        with mock.patch.dict(sys.modules, {"edge_tts": fake_edge_tts}):
            mod = load_module("r12_docker_edge", "docker/edge-tts-server/server.py")
        client = mod.app.test_client()
        for val in ("true", "TRUE", "yes", "on", "1"):
            with mock.patch.dict(os.environ, {"ALLOFLOW_OFFLINE_ONLY": val, "ALLOFLOW_ALLOW_CLOUD_EDGE_TTS": "0"}):
                resp = client.post("/v1/audio/speech", json={"input": "hello"}, headers={"Host": "localhost:5001"})
                self.assertEqual(resp.status_code, 403, f"expected offline-only 403 for {val!r}")

    def test_npu_server_timeout_guard_and_state_preservation_on_exit(self):
        with mock.patch.dict(os.environ, {"ALLOFLOW_NPU_GENERATION_TIMEOUT_SECONDS": "inf"}):
            mod = load_module("r12_npu", "docker/npu_server.py")
        self.assertEqual(mod.GENERATION_TIMEOUT_SECONDS, 120.0)

        # Failed non-loopback main() must NOT pollute _bound_host / _require_api_token
        with mock.patch.dict(os.environ, {"ALLOFLOW_NPU_API_TOKEN": ""}):
            with self.assertRaises(SystemExit):
                mod.main(["--host", "0.0.0.0"])
        self.assertEqual(mod._bound_host, "127.0.0.1")
        self.assertFalse(mod._require_api_token)

        # Weak token configured on loopback returns 503
        client = mod.app.test_client()
        with mock.patch.dict(os.environ, {"ALLOFLOW_NPU_API_TOKEN": "short"}):
            resp = client.post("/v1/chat/completions", json={"messages": [{"role": "user", "content": "hi"}]}, headers={"Host": "localhost:11435"})
            self.assertEqual(resp.status_code, 503)

    def test_model_manifest_cleanup_does_not_unlink_through_parent_symlink(self):
        import model_manifest

        with tempfile.TemporaryDirectory() as tmp:
            outside = Path(tmp) / "outside_secret.txt"
            outside.write_text("keep-me", encoding="utf-8")
            outside_dir = Path(tmp) / "outside_dir"
            outside_dir.mkdir()
            victim = outside_dir / "tokenizer.json"
            victim.write_text("do-not-delete", encoding="utf-8")

            cache_dir = Path(tmp) / "cache"
            snap_dir = cache_dir / "hub" / "models--fake--model" / "snapshots" / ("b" * 40)
            snap_dir.mkdir(parents=True)
            fake_record = {
                "revision": "b" * 40,
                "files": [{"path": "tokenizer/tokenizer.json", "bytes": 13, "sha256": "0" * 64}],
            }

            def fake_download(**_kwargs):
                tok_link = snap_dir / "tokenizer"
                try:
                    tok_link.symlink_to(outside_dir, target_is_directory=True)
                except OSError:
                    self.skipTest("Symlink creation requires elevated privileges on this Windows host")
                return str(snap_dir)

            with mock.patch.dict(os.environ, {"HF_HOME": str(cache_dir)}), \
                 mock.patch.object(model_manifest, "model_record", return_value=fake_record), \
                 mock.patch.object(model_manifest.shutil, "disk_usage", return_value=types.SimpleNamespace(free=10 * 1024**3)):
                with self.assertRaises(ValueError):
                    model_manifest.provision("fake/model", download=True, snapshot_download=fake_download)

            self.assertTrue(victim.exists(), "cleanup must never unlink a file outside resolved_root through a parent symlink")


if __name__ == "__main__":
    unittest.main()
