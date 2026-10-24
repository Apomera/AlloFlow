"""Local speech input boundaries; no speech engine, download, or network needed."""
import importlib.util
import io
import json
import pathlib
import types
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "tts-server" / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


PIPER = load("piper_server")
EDGE = load("edge_tts_server")


class RequestSocket:
    def __init__(self, body):
        payload = json.dumps(body).encode()
        head = ("POST /v1/audio/speech HTTP/1.0\r\nHost: 127.0.0.1\r\n"
                "Origin: http://localhost:3000\r\nContent-Type: application/json\r\n"
                f"Content-Length: {len(payload)}\r\n\r\n").encode()
        self.incoming = io.BytesIO(head + payload)
        self.output = bytearray()

    def makefile(self, *_args):
        return self.incoming

    def sendall(self, data):
        self.output.extend(data)


def request(body):
    sock = RequestSocket(body)
    PIPER.TTSHandler(sock, ("127.0.0.1", 12345), types.SimpleNamespace())
    head, response = bytes(sock.output).split(b"\r\n\r\n", 1)
    return int(head.split()[1]), response


class SpeechInputSafety(unittest.TestCase):
    def test_aliases_catalog_models_and_unknown_friendly_names_still_work(self):
        cases = [("NOVA", PIPER.VOICE_MAP["nova"]), ("unlisted", PIPER.DEFAULT_VOICE),
                 ("en_us-amy-medium", "en_US-amy-medium"),
                 ("ca_ES-upc_ona-x_low", "ca_ES-upc_ona-x_low"),
                 ("en_GB-northern_english_male-medium", "en_GB-northern_english_male-medium")]
        for voice, expected in cases:
            with self.subTest(voice=voice), patch.object(PIPER, "ensure_voice", return_value=True) as download, \
                    patch.object(PIPER, "synthesize", return_value=b"\0\0") as synth:
                status, audio = request({"input": "Synthetic text.", "voice": voice, "speed": 1.25})
                self.assertEqual(status, 200)
                self.assertTrue(audio.startswith(b"RIFF"))
                download.assert_called_once_with(expected)
                synth.assert_called_once_with("Synthetic text.", expected, 1.25)

    def test_paths_options_and_control_characters_never_reach_engine(self):
        bad = ["../../en_US-amy-medium", "C:\\models\\en_US-amy-medium", "--data_dir=outside",
               "en_US-amy-medium\n", "en_US-amy-medium;whoami", "en_US-amy-medium.onnx", [], None]
        for voice in bad:
            with self.subTest(voice=voice), patch.object(PIPER, "ensure_voice") as download, \
                    patch.object(PIPER, "synthesize") as synth:
                self.assertEqual(request({"input": "Synthetic text.", "voice": voice})[0], 400)
                download.assert_not_called()
                synth.assert_not_called()

    def test_internal_model_entry_points_also_reject_unsafe_ids(self):
        with patch.object(PIPER.os, "makedirs") as mkdir, patch.object(PIPER.subprocess, "run") as run:
            with self.assertRaises(ValueError):
                PIPER.ensure_voice("../en_US-amy-medium")
            with self.assertRaises(ValueError):
                PIPER.synthesize("Synthetic text.", "--config_file", 1)
            mkdir.assert_not_called()
            run.assert_not_called()

    def test_invalid_request_types_and_nonfinite_speeds_fail_before_engine(self):
        bad = [[], {"input": ["text"]}, {"input": "text", "speed": 0},
               {"input": "text", "speed": "nan"}, {"input": "text", "speed": "inf"},
               {"input": "text", "speed": -1}, {"input": "text", "speed": []}]
        with patch.object(PIPER, "ensure_voice") as download:
            for body in bad:
                with self.subTest(body=body):
                    self.assertEqual(request(body)[0], 400)
            download.assert_not_called()

    def test_unavailable_catalog_voice_preserves_default_fallback(self):
        with patch.object(PIPER, "ensure_voice", side_effect=[False, True]), \
                patch.object(PIPER, "synthesize", return_value=b"\0\0") as synth:
            self.assertEqual(request({"input": "text", "voice": "fr_FR-siwis-medium"})[0], 200)
            self.assertEqual(synth.call_args.args[1], PIPER.DEFAULT_VOICE)

    def test_origins_reject_controls_before_url_parser_can_strip_them(self):
        for module in (PIPER, EDGE):
            for origin in ("http://local\nhost:3000", "http://localhost\r\n:3000",
                           "http://local\thost:3000", "http://localhost\x7f:3000"):
                with self.subTest(server=module.__name__, origin=origin):
                    self.assertFalse(module.is_allowed_origin(origin))
            for origin in (None, "http://localhost:3000", "https://alloflow-cdn.pages.dev"):
                self.assertTrue(module.is_allowed_origin(origin))


if __name__ == "__main__":
    unittest.main()
