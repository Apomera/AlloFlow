"""Exercise optional Flask services without speech providers or model downloads."""
import contextlib
import importlib.util
import io
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]


def load_server(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    # Only provider calls are mocked. Flask request parsing/limits/CORS are real.
    with patch.dict(sys.modules, {"edge_tts": types.SimpleNamespace()}):
        spec.loader.exec_module(module)
    module.app.config["TESTING"] = True
    return module


SPEECH = load_server("optional_speech_security", "docker/edge-tts-server/server.py")
NPU = load_server("optional_npu_security", "docker/npu_server.py")
CHAT = {"messages": [{"role": "user", "content": "Synthetic classroom example."}]}


class OptionalServiceSecurity(unittest.TestCase):
    def setUp(self):
        env = patch.dict(os.environ, {"ALLOFLOW_TTS_ALLOWED_ORIGINS": "",
                                     "ALLOFLOW_NPU_ALLOWED_ORIGINS": ""})
        env.start()
        self.addCleanup(env.stop)

    def test_json_shape_and_body_limits_fail_before_provider_work(self):
        for server, route, engine, valid in (
                (SPEECH, "/v1/audio/speech", "_run_edge_tts", {"input": "Hello"}),
                (NPU, "/v1/chat/completions", "generate", CHAT)):
            with server.app.test_client() as client, patch.object(server, engine) as work:
                for body in ("[]", "null", "true", '"text"', "3", "{invalid"):
                    with self.subTest(server=server.__name__, body=body):
                        response = client.post(route, data=body, content_type="application/json")
                        self.assertEqual(response.status_code, 400)
                        self.assertIsNotNone(response.get_json())
                oversized = {**valid, "padding": "x" * (256 * 1024)}
                response = client.post(route, json=oversized, headers={"Origin": "http://localhost:3000"})
                self.assertEqual(response.status_code, 413)
                self.assertIsNotNone(response.get_json())
                self.assertEqual(response.headers["Access-Control-Allow-Origin"], "http://localhost:3000")
                work.assert_not_called()

    def test_speech_types_nonfinite_values_and_work_limits(self):
        bad_inputs = [None, False, 12, [], {}, "", "  ", "x" * 20001]
        bad_speeds = [None, True, [], {}, "bad", "NaN", "Infinity", float("nan"),
                      float("inf"), -1, 0, 0.249, 4.01, 10 ** 1000]
        invalid = [{"input": value} for value in bad_inputs]
        invalid += [{"input": "Hello", "speed": value} for value in bad_speeds]
        invalid += [{"input": "Hello", "voice": value} for value in (None, 5, [], "", "x" * 129)]
        with SPEECH.app.test_client() as client, patch.object(SPEECH, "_run_edge_tts") as work:
            for payload in invalid:
                with self.subTest(payload=str(payload)[:80]):
                    self.assertEqual(client.post("/v1/audio/speech", json=payload).status_code, 400)
            work.assert_not_called()

    def test_speech_voice_aliases_fallback_and_speed_compatibility(self):
        with SPEECH.app.test_client() as client, patch.object(SPEECH, "_run_edge_tts", return_value=b"mp3") as work:
            for alias, voice in SPEECH.VOICE_MAP.items():
                with self.subTest(alias=alias):
                    response = client.post("/v1/audio/speech", json={"input": "Bonjour", "voice": alias.upper()})
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.mimetype, "audio/mpeg")
                    self.assertEqual(response.data, b"mp3")
                    work.assert_called_with("Bonjour", voice, "+0%")
            for speed, rate in ((0.25, "-75%"), (4, "+300%"), ("1.25", "+25%")):
                response = client.post("/v1/audio/speech", json={"input": "Hello", "voice": "unknown", "speed": speed})
                self.assertEqual(response.status_code, 200)
                work.assert_called_with("Hello", SPEECH.VOICE_MAP["alloy"], rate)

    def test_speech_buffer_and_timeout_are_enforced(self):
        class FakeCommunicate:
            def __init__(self, *_args, **_kwargs):
                pass

            async def stream(self):
                yield {"type": "WordBoundary", "text": "ignored"}
                yield {"type": "audio", "data": b"abc"}
                yield {"type": "audio", "data": b"def"}

        with patch.object(SPEECH, "edge_tts", types.SimpleNamespace(Communicate=FakeCommunicate)):
            self.assertEqual(SPEECH._run_edge_tts("Hello", "alloy", "+0%"), b"abcdef")
            with patch.object(SPEECH, "MAX_AUDIO_BYTES", 5):
                with self.assertRaises(RuntimeError):
                    SPEECH._run_edge_tts("Hello", "alloy", "+0%")
            with patch.object(SPEECH, "SPEECH_TIMEOUT_SECONDS", 0):
                with self.assertRaises(TimeoutError):
                    SPEECH._run_edge_tts("Hello", "alloy", "+0%")

    def test_npu_invalid_fields_cannot_load_or_run_a_model(self):
        invalid = [{}, {"messages": []}, {"messages": "text"}, {"messages": [None]},
                   {"messages": [{"content": []}]}, {"messages": [{"role": 3, "content": "text"}]},
                   {"messages": [{"role": "x" * 33, "content": "text"}]},
                   {"messages": [{"content": "x" * 64001}]},
                   {"messages": [{"content": "x"}] * 129}]
        for field, values in (("max_tokens", [None, True, 0, -1, 4097, 1.2, "512"]),
                              ("temperature", [None, True, "0.7", -0.1, 2.1, float("inf"), float("nan"), 10 ** 1000]),
                              ("model", [None, [], 3, "x" * 201])):
            invalid.extend({**CHAT, field: value} for value in values)
        with NPU.app.test_client() as client, patch.object(NPU, "generate") as work, patch.object(NPU, "load_model") as load:
            for payload in invalid:
                with self.subTest(payload=str(payload)[:80]):
                    self.assertEqual(client.post("/v1/chat/completions", json=payload).status_code, 400)
            work.assert_not_called()
            load.assert_not_called()

    def test_npu_defaults_aliases_model_switch_and_response_shape(self):
        with NPU.app.test_client() as client, patch.object(NPU, "generate", return_value="Hello classroom"), \
                patch.object(NPU, "_active_id", "deepseek-r1-1.5b"), patch.object(NPU, "load_model") as load:
            response = client.post("/v1/chat/completions", json={**CHAT, "model": "client-alias"})
            self.assertEqual(response.status_code, 200)
            result = response.get_json()
            self.assertEqual(result["choices"][0]["message"]["content"], "Hello classroom")
            self.assertEqual(result["model"], "deepseek-r1-1.5b")
            NPU.generate.assert_called_once_with(CHAT["messages"], 512, 0.7)
            load.assert_not_called()
            response = client.post("/v1/chat/completions", json={**CHAT, "model": "phi-3.5-mini", "temperature": 0, "max_tokens": 1})
            self.assertEqual(response.status_code, 200)
            load.assert_called_once_with("phi-3.5-mini")

    def test_npu_actual_encoded_context_checked_before_inference(self):
        ids = types.SimpleNamespace(shape=(1, 4090))
        ids.astype = lambda _dtype: ids
        tokenizer = types.SimpleNamespace(apply_chat_template=lambda *_args, **_kwargs: "prompt",
                                          encode=lambda *_args, **_kwargs: ids)
        session = types.SimpleNamespace(run=lambda *_args: self.fail("Oversized context reached inference"))
        with patch.object(NPU, "_session", session), patch.object(NPU, "_tokenizer", tokenizer), \
                patch.object(NPU, "_active_id", "deepseek-r1-1.5b"), patch.dict(sys.modules, {"numpy": types.SimpleNamespace()}):
            with self.assertRaises(NPU.ContextLimitError):
                NPU.generate(CHAT["messages"], max_tokens=7)
        with NPU.app.test_client() as client, patch.object(NPU, "generate", side_effect=NPU.ContextLimitError("internal")):
            response = client.post("/v1/chat/completions", json=CHAT)
            self.assertEqual(response.status_code, 400)
            self.assertNotIn(b"internal", response.data)

    def test_failed_model_swap_preserves_previous_working_pair(self):
        old_session, old_tokenizer = object(), object()
        ort = types.SimpleNamespace(SessionOptions=lambda: types.SimpleNamespace(),
                                    GraphOptimizationLevel=types.SimpleNamespace(ORT_ENABLE_ALL=1),
                                    InferenceSession=lambda *_args, **_kwargs: object())
        def fail_tokenizer(*_args, **_kwargs):
            raise RuntimeError("synthetic tokenizer failure")
        modules = {"onnxruntime": ort, "huggingface_hub": types.SimpleNamespace(snapshot_download=lambda *_args, **_kwargs: "fake-model"),
                   "transformers": types.SimpleNamespace(AutoTokenizer=types.SimpleNamespace(from_pretrained=fail_tokenizer))}
        with patch.dict(sys.modules, modules), patch.object(NPU, "_session", old_session), \
                patch.object(NPU, "_tokenizer", old_tokenizer), patch.object(NPU, "_active_id", "deepseek-r1-1.5b"), \
                patch.object(NPU.os, "walk", return_value=[("fake-model", [], ["model.onnx"])]), \
                patch.object(NPU.os.path, "getsize", return_value=1), contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(RuntimeError):
                NPU.load_model("phi-3.5-mini")
            self.assertIs(NPU._session, old_session)
            self.assertIs(NPU._tokenizer, old_tokenizer)
            self.assertEqual(NPU._active_id, "deepseek-r1-1.5b")

    def test_busy_services_do_not_queue_engine_work(self):
        for server, route, engine, payload, lock, count in (
                (SPEECH, "/v1/audio/speech", "_run_edge_tts", {"input": "Hello"}, SPEECH._speech_slots, 4),
                (NPU, "/v1/chat/completions", "generate", CHAT, NPU._generation_lock, 1)):
            for _ in range(count):
                lock.acquire()
            try:
                with server.app.test_client() as client, patch.object(server, engine) as work:
                    response = client.post(route, json=payload)
                    self.assertEqual(response.status_code, 429)
                    self.assertEqual(response.headers["Retry-After"], "1")
                    work.assert_not_called()
            finally:
                for _ in range(count):
                    lock.release()

    def test_internal_errors_are_redacted_and_capacity_is_released(self):
        for server, route, engine, payload, valid in (
                (SPEECH, "/v1/audio/speech", "_run_edge_tts", {"input": "Hello"}, b"mp3"),
                (NPU, "/v1/chat/completions", "generate", CHAT, "Hello"),
                (NPU, "/v1/chat/completions", "load_model", {**CHAT, "model": "phi-3.5-mini"}, None)):
            with server.app.test_client() as client, patch.object(server.app.logger, "exception") as log, \
                    patch.object(server, engine, side_effect=[RuntimeError("secret-token /private/path"), valid]):
                response = client.post(route, json=payload, headers={"Origin": "http://localhost:3000"})
                self.assertEqual(response.status_code, 500)
                self.assertNotIn(b"secret-token", response.data)
                self.assertNotIn(b"/private/path", response.data)
                self.assertEqual(response.headers["Access-Control-Allow-Origin"], "http://localhost:3000")
                log.assert_called_once()
                if engine == "load_model":
                    with patch.object(NPU, "generate", return_value="Hello"):
                        self.assertEqual(client.post(route, json=payload).status_code, 200)
                else:
                    self.assertEqual(client.post(route, json=payload).status_code, 200)

    def test_origins_and_preflight_preserve_local_and_explicit_lan_clients(self):
        for server, route, engine, payload, valid, env_key in (
                (SPEECH, "/v1/audio/speech", "_run_edge_tts", {"input": "Hello"}, b"mp3", "ALLOFLOW_TTS_ALLOWED_ORIGINS"),
                (NPU, "/v1/chat/completions", "generate", CHAT, "Hello", "ALLOFLOW_NPU_ALLOWED_ORIGINS")):
            for origin in ("http://local\thost", "http://local\nhost", "http://localhost\r\nX-Test: yes", "http://local\x00host", "http://local\x7fhost"):
                self.assertFalse(server.is_allowed_origin(origin))
            with server.app.test_client() as client, patch.object(server, engine, return_value=valid) as work:
                for origin in ("https://attacker.example", "http://localhost.attacker.example", "null", "http://192.168.1.50:3000"):
                    response = client.post(route, json=payload, headers={"Origin": origin})
                    self.assertEqual(response.status_code, 403)
                    self.assertNotIn("Access-Control-Allow-Origin", response.headers)
                work.assert_not_called()
                with patch.dict(os.environ, {env_key: "http://192.168.1.50:3000"}):
                    for origin in (None, "http://localhost:3000", "http://127.0.0.1:32170", "http://[::1]:3000",
                                   "https://alloflow-cdn.pages.dev", "http://192.168.1.50:3000"):
                        headers = {"Origin": origin} if origin else {}
                        response = client.post(route, json=payload, headers=headers)
                        self.assertEqual(response.status_code, 200)
                        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), origin)
                        self.assertIn("Origin", response.headers["Vary"])
                        response = client.options(route, headers=headers)
                        self.assertEqual(response.status_code, 200)
                        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), origin)

    def test_npu_default_listener_and_explicit_lan_override(self):
        for args, host in (([], "127.0.0.1"), (["--host", "192.168.1.50", "--port", "11436"], "192.168.1.50")):
            with patch.object(NPU, "load_model"), patch.object(NPU.app, "run") as run, contextlib.redirect_stdout(io.StringIO()):
                NPU.main(args)
                run.assert_called_once_with(host=host, port=11436 if args else 11435, debug=False)


@unittest.skipUnless(shutil.which("docker") or os.environ.get("GITHUB_ACTIONS") == "true",
                     "Docker Compose is not installed locally; config integration runs in CI")
class ComposeNetworkDefaults(unittest.TestCase):
    def test_rendered_compose_defaults_and_explicit_lan_bindings(self):
        for address in (None, "192.168.1.50", "0.0.0.0"):
            with self.subTest(address=address), tempfile.TemporaryDirectory() as temp:
                env_file = pathlib.Path(temp) / "empty.env"
                env_file.write_text("", encoding="utf-8")
                env = {key: value for key, value in os.environ.items()
                       if not key.startswith(("ALLOFLOW_", "COMPOSE_"))
                       and key not in ("WEB_PORT", "PB_PORT", "OLLAMA_PORT", "FLUX_PORT", "TTS_PORT", "PIPER_PORT", "SEARCH_PORT")}
                if address:
                    env["ALLOFLOW_BIND_ADDRESS"] = address
                    env["ALLOFLOW_TTS_ALLOWED_ORIGINS"] = "http://192.168.1.50:3000"
                    env["TTS_PORT"] = "15001"
                result = subprocess.run(["docker", "compose", "--env-file", str(env_file), "-f",
                                         str(ROOT / "docker/docker-compose.yml"), "config", "--format", "json"],
                                        env=env, capture_output=True, text=True, check=True, timeout=30)
                services = json.loads(result.stdout)["services"]
                self.assertEqual(len(services), 7)
                for service in services.values():
                    for port in service["ports"]:
                        self.assertEqual(port["host_ip"], address or "127.0.0.1")
                self.assertEqual(str(services["edge-tts"]["ports"][0]["published"]), "15001" if address else "5001")
                self.assertEqual(services["edge-tts"]["environment"]["ALLOFLOW_TTS_ALLOWED_ORIGINS"],
                                 "http://192.168.1.50:3000" if address else "")


if __name__ == "__main__":
    unittest.main()
