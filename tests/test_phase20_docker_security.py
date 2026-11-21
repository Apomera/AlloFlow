import asyncio
import importlib.util
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


class Phase20DockerSecurityTests(unittest.IsolatedAsyncioTestCase):
    def test_edge_tts_host_and_non_ascii_auth(self):
        fake_edge_tts = types.ModuleType("edge_tts")
        with mock.patch.dict(sys.modules, {"edge_tts": fake_edge_tts}):
            mod = load_module("phase20_edge_tts_server", "docker/edge-tts-server/server.py")

        for bad_host in [
            "",
            "evil.com@127.0.0.1:5001",
            "localhost/evil",
            "localhost?x=1",
            "localhost#frag",
            "localhost:99999",
            "localhost:abc",
            "localhost.",
            "[::1",
            "localhost\r\nX-Injected: 1",
        ]:
            self.assertFalse(mod.is_allowed_host(bad_host), f"expected {bad_host!r} rejected")

        for good_host in ["localhost", "localhost:5001", "127.0.0.1:5001", "[::1]:5001", "edge-tts:5001"]:
            self.assertTrue(mod.is_allowed_host(good_host), f"expected {good_host!r} allowed")

        client = mod.app.test_client()
        with mock.patch.dict(os.environ, {"ALLOFLOW_TTS_API_TOKEN": "a" * 40, "ALLOFLOW_OFFLINE_ONLY": "0"}):
            resp = client.post(
                "/v1/audio/speech",
                json={"input": "hello"},
                headers={
                    "Host": "localhost:5001",
                    "Authorization": "Bearer \xe9\xe9\xe9",
                },
            )
            self.assertEqual(resp.status_code, 401)
            self.assertEqual(resp.get_json().get("error"), "Valid bearer token required.")

    def test_npu_server_host_non_ascii_auth_and_timeout(self):
        mod = load_module("phase20_npu_server", "docker/npu_server.py")

        for bad_host in [
            "evil.com@127.0.0.1:11435",
            "localhost/evil",
            "localhost:99999",
            "localhost.",
            "[::1",
        ]:
            self.assertFalse(mod.is_allowed_host(bad_host), f"expected {bad_host!r} rejected")

        old_bound = mod._bound_host
        try:
            mod._bound_host = "192.168.1.50"
            self.assertTrue(mod.is_allowed_host("192.168.1.50:11435"))
            mod._bound_host = "0.0.0.0"
            self.assertFalse(mod.is_allowed_host("0.0.0.0:11435"))
        finally:
            mod._bound_host = old_bound

        client = mod.app.test_client()
        with mock.patch.dict(os.environ, {"ALLOFLOW_NPU_API_TOKEN": "b" * 40}):
            resp = client.post(
                "/v1/chat/completions",
                json={"messages": [{"role": "user", "content": "hi"}]},
                headers={
                    "Host": "localhost:11435",
                    "Authorization": "Bearer \xe9\xff",
                },
            )
            self.assertEqual(resp.status_code, 401)

        # Verify wall-clock generation deadline raises GenerationTimeoutError
        self.assertTrue(issubclass(mod.GenerationTimeoutError, TimeoutError))

    async def test_flux_security_malformed_and_missing_host_returns_403_with_headers(self):
        import security as flux_security

        async def ok_app(scope, receive, send):
            await send({"type": "http.response.start", "status": 200, "headers": []})
            await send({"type": "http.response.body", "body": b'{"ok":true}'})

        mw = flux_security.FluxSecurity(ok_app, token="t" * 40, origins="https://school.example")

        async def call(headers, http_version="1.1"):
            out = []
            async def receive():
                return {"type": "http.request", "body": b"", "more_body": False}
            async def send(msg):
                out.append(msg)
            await mw({"type": "http", "http_version": http_version, "method": "GET", "path": "/health", "headers": headers}, receive, send)
            return out[0]["status"], dict(out[0]["headers"]), json.loads(out[1]["body"].decode())

        for bad_headers in [
            [],  # missing Host on HTTP/1.1
            [(b"host", b"")],
            [(b"host", b"[::1")],
            [(b"host", b"evil.com@localhost:7860")],
            [(b"host", b"localhost/evil")],
            [(b"host", b"localhost:99999")],
            [(b"host", b"localhost.")],
        ]:
            status, hdrs, body = await call(bad_headers)
            self.assertEqual(status, 403, f"expected 403 for {bad_headers!r}, got {status}")
            self.assertEqual(body, {"error": "host-not-allowed"})
            self.assertEqual(hdrs.get(b"cache-control"), b"no-store")
            self.assertEqual(hdrs.get(b"x-content-type-options"), b"nosniff")

        status, _, _ = await call([(b"host", b"localhost:7860")])
        self.assertEqual(status, 200)

    def test_model_manifest_removes_tampered_download_on_verify_failure(self):
        import model_manifest

        with tempfile.TemporaryDirectory() as tmp:
            cache_dir = Path(tmp)
            snap_dir = cache_dir / "hub" / "models--fake--model" / "snapshots" / ("a" * 40)
            snap_dir.mkdir(parents=True)
            fake_record = {
                "revision": "a" * 40,
                "files": [{"path": "weights.safetensors", "bytes": 4, "sha256": "0" * 64}],
            }

            def fake_download(**_kwargs):
                (snap_dir / "weights.safetensors").write_bytes(b"evil")
                return str(snap_dir)

            with mock.patch.dict(os.environ, {"HF_HOME": str(cache_dir)}), \
                 mock.patch.object(model_manifest, "model_record", return_value=fake_record), \
                 mock.patch.object(model_manifest.shutil, "disk_usage", return_value=types.SimpleNamespace(free=10 * 1024**3)):
                with self.assertRaisesRegex(ValueError, "integrity"):
                    model_manifest.provision("fake/model", download=True, snapshot_download=fake_download)

            self.assertFalse((snap_dir / "weights.safetensors").exists(), "tampered file must be deleted on verification failure")


if __name__ == "__main__":
    unittest.main()
