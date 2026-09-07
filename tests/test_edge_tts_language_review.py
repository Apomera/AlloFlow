import importlib.util
import pathlib
import sys
import types
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("edge_server_review", ROOT / "tts-server" / "edge_tts_server.py")
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)

class EdgeLanguageReview(unittest.TestCase):
    def test_unknown_gemini_voice_uses_passage_language(self):
        for language, code in [("French", "fr"), ("es-MX", "es"), ("fr_CA", "fr"), ("Japanese", "ja")]:
            with self.subTest(language=language):
                self.assertEqual(server.resolve_edge_voice("Kore", language), server.VOICE_MAP[code])

    def test_explicit_language_voice_takes_priority(self):
        self.assertEqual(server.resolve_edge_voice("de", "French"), server.VOICE_MAP["de"])

    def test_explicit_native_voice_is_preserved_case_insensitively(self):
        native = server.VOICE_MAP["puck"]
        self.assertEqual(server.resolve_edge_voice(native.lower(), "French"), native)

    def test_english_and_unknown_languages_keep_existing_fallback(self):
        self.assertEqual(server.resolve_edge_voice("puck", "English"), server.VOICE_MAP["puck"])
        self.assertEqual(server.resolve_edge_voice("Kore", "unsupported"), server.VOICE_MAP["alloy"])

    def test_synthesis_uses_resolved_language_and_natural_speed(self):
        captured = {}
        class FakeCommunicate:
            def __init__(self, text, voice, rate):
                captured.update(text=text, voice=voice, rate=rate)
            async def stream(self):
                yield {"type": "WordBoundary", "text": "ignored"}
                yield {"type": "audio", "data": b"first"}
                yield {"type": "audio", "data": b"second"}
        with patch.dict(sys.modules, {"edge_tts": types.SimpleNamespace(Communicate=FakeCommunicate)}):
            result = server.generate_speech_sync("Bonjour.", "Kore", 1, "fr-CA")
        self.assertEqual(result, b"firstsecond")
        self.assertEqual(captured, {"text": "Bonjour.", "voice": server.VOICE_MAP["fr"], "rate": "+0%"})

if __name__ == "__main__":
    unittest.main()

