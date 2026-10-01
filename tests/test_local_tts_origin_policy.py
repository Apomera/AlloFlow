"""Exercise the shipped local request handlers without network/provider calls."""
import importlib.util
import io
import json
import os
import pathlib
import types
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]


def load_server(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    with patch.dict(os.environ, {}, clear=False):
        os.environ.pop("EDGE_TTS_HOST", None)
        spec.loader.exec_module(module)
    return module


EDGE = load_server("edge_origin_review", "tts-server/edge_tts_server.py")
PIPER = load_server("piper_origin_review", "tts-server/piper_server.py")
DOCKER = load_server("docker_edge_origin_review", "docker/edge-tts-server/server.py")
SERVERS = (EDGE, PIPER, DOCKER)


class RequestSocket:
    def __init__(self, request):
        self.incoming = io.BytesIO(request)
        self.output = bytearray()

    def makefile(self, *_args):
        return self.incoming

    def sendall(self, data):
        self.output.extend(data)


def request_handler(module, method="POST", origin="http://127.0.0.1:32170", body=None):
    payload = json.dumps(body if body is not None else {"input": "Synthetic test."}).encode()
    path = "/health" if method == "GET" else "/v1/audio/speech"
    headers = [f"{method} {path} HTTP/1.0", "Host: 127.0.0.1", "Content-Type: application/json"]
    if origin is not None:
        headers.append("Origin: " + origin)
    headers.append("Content-Length: " + str(len(payload)))
    sock = RequestSocket("\r\n".join(headers).encode() + b"\r\n\r\n" + payload)
    with patch.object(module.TTSHandler, "log_message"):
        module.TTSHandler(sock, ("127.0.0.1", 12345), types.SimpleNamespace())
    head, response_body = bytes(sock.output).split(b"\r\n\r\n", 1)
    lines = head.decode().split("\r\n")
    response_headers = dict(line.split(": ", 1) for line in lines[1:])
    return int(lines[0].split()[1]), response_headers, response_body


class LocalOriginPolicy(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {"ALLOFLOW_TTS_ALLOWED_ORIGINS": ""})
        self.environment.start()
        self.addCleanup(self.environment.stop)

    def test_native_loopback_and_shipped_web_app_are_supported(self):
        for module in SERVERS:
            for origin in (None, "http://localhost:3000", "http://127.0.0.1:32170",
                           "https://[::1]:32171", "https://alloflow-cdn.pages.dev"):
                with self.subTest(server=module.__name__, origin=origin):
                    self.assertTrue(module.is_allowed_origin(origin))

    def test_untrusted_null_malformed_and_confusable_origins_are_rejected(self):
        bad = ("null", "", "*", "https://attacker.example", "http://localhost.attacker.example",
               "http://127.0.0.1.attacker.example", "https://alloflow-cdn.pages.dev.attacker.example",
               "http://user:password@localhost", "http://localhost:bad", "http://localhost:0",
               "http://localhost:65536", "http://localhost/path", "http://localhost?query=1",
               "http://localhost#fragment", "file://localhost", " http://localhost", "http://localhost\n")
        for module in SERVERS:
            for origin in bad:
                with self.subTest(server=module.__name__, origin=origin):
                    self.assertFalse(module.is_allowed_origin(origin))

    def test_school_origins_require_an_exact_explicit_value(self):
        with patch.dict(os.environ, {"ALLOFLOW_TTS_ALLOWED_ORIGINS": " https://school.example:8443 , * "}):
            for module in SERVERS:
                with self.subTest(server=module.__name__):
                    self.assertTrue(module.is_allowed_origin("https://school.example:8443"))
                    self.assertFalse(module.is_allowed_origin("https://school.example"))
                    self.assertFalse(module.is_allowed_origin("https://school.example.attacker:8443"))
                    self.assertFalse(module.is_allowed_origin("https://other.example"))

    def test_standalone_edge_defaults_to_loopback(self):
        self.assertEqual(EDGE.HOST, "127.0.0.1")

    def test_standalone_blocks_every_browser_route_before_synthesis(self):
        for module in (EDGE, PIPER):
            for method in ("POST", "GET", "OPTIONS"):
                with self.subTest(server=module.__name__, method=method), \
                        patch.object(EDGE, "generate_speech_sync") as edge_synth, \
                        patch.object(PIPER, "ensure_voice") as piper_download, \
                        patch.object(PIPER, "synthesize") as piper_synth:
                    status, headers, body = request_handler(module, method, "https://attacker.example")
                    self.assertEqual(status, 403)
                    self.assertNotIn("Access-Control-Allow-Origin", headers)
                    self.assertEqual(headers["Vary"], "Origin")
                    self.assertIn(b"ALLOFLOW_TTS_ALLOWED_ORIGINS", body)
                    edge_synth.assert_not_called()
                    piper_download.assert_not_called()
                    piper_synth.assert_not_called()

    def test_standalone_allowed_audio_native_and_preflight_responses(self):
        for module in (EDGE, PIPER):
            for origin in ("http://localhost:3000", None):
                with self.subTest(server=module.__name__, origin=origin), \
                        patch.object(EDGE, "generate_speech_sync", return_value=b"mp3"), \
                        patch.object(PIPER, "ensure_voice", return_value=True), \
                        patch.object(PIPER, "synthesize", return_value=b"\0\0"):
                    status, headers, body = request_handler(module, origin=origin)
                    self.assertEqual(status, 200)
                    self.assertTrue(body)
                    self.assertEqual(headers.get("Access-Control-Allow-Origin"), origin)
                    self.assertEqual(headers["Vary"], "Origin")
            status, headers, _body = request_handler(module, "OPTIONS")
            self.assertEqual(status, 200)
            self.assertEqual(headers["Access-Control-Allow-Origin"], "http://127.0.0.1:32170")
            self.assertIn("POST", headers["Access-Control-Allow-Methods"])
            self.assertIn("Content-Type", headers["Access-Control-Allow-Headers"])

    def test_standalone_error_remains_readable_for_allowed_origin(self):
        for module in (EDGE, PIPER):
            with self.subTest(server=module.__name__):
                status, headers, body = request_handler(module, body={"input": ""})
                self.assertEqual(status, 400)
                self.assertEqual(headers["Access-Control-Allow-Origin"], "http://127.0.0.1:32170")
                self.assertIn(b"No input text", body)

    def test_docker_routes_reject_untrusted_origins_before_provider_call(self):
        with DOCKER.app.test_client() as client, patch.object(DOCKER, "_run_edge_tts") as synth:
            for method, path in (("POST", "/v1/audio/speech"), ("OPTIONS", "/v1/audio/speech"),
                                 ("GET", "/health"), ("GET", "/v1/voices")):
                with self.subTest(method=method, path=path):
                    response = client.open(path, method=method, headers={"Origin": "https://attacker.example"},
                                           json={"input": "Synthetic test."})
                    self.assertEqual(response.status_code, 403)
                    self.assertNotIn("Access-Control-Allow-Origin", response.headers)
                    self.assertIn("Origin", response.headers["Vary"])
            synth.assert_not_called()

    def test_docker_audio_preflight_and_failure_keep_exact_cors(self):
        origin = "http://localhost:32174"
        with DOCKER.app.test_client() as client, patch.object(DOCKER, "_run_edge_tts", return_value=b"mp3"):
            response = client.post("/v1/audio/speech", json={"input": "Synthetic test."}, headers={"Origin": origin})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data, b"mp3")
            self.assertEqual(response.headers["Access-Control-Allow-Origin"], origin)
            response = client.options("/v1/audio/speech", headers={"Origin": origin})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["Access-Control-Allow-Origin"], origin)
            self.assertIn("POST", response.headers["Access-Control-Allow-Methods"])
            response = client.post("/v1/audio/speech", json={"input": ""}, headers={"Origin": origin})
            self.assertEqual(response.status_code, 400)
            self.assertEqual(response.headers["Access-Control-Allow-Origin"], origin)
            response = client.post("/v1/audio/speech", json={"input": "Synthetic test."})
            self.assertEqual(response.status_code, 200)
            self.assertNotIn("Access-Control-Allow-Origin", response.headers)


if __name__ == "__main__":
    unittest.main()
