"""
Edge TTS Server — OpenAI-compatible TTS endpoint using Microsoft Edge TTS.
Exposes POST /v1/audio/speech with { input, voice, speed } 
Returns WAV audio matching the OpenAI TTS API format.
"""
import asyncio
import io
import edge_tts
from flask import Flask, request, Response, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Map OpenAI-style voice IDs to actual Edge TTS voice names
VOICE_MAP = {
    # English US
    "alloy":   "en-US-AvaNeural",
    "echo":    "en-US-AndrewNeural",
    "nova":    "en-US-JennyNeural",
    "shimmer": "en-US-AriaNeural",
    "puck":    "en-US-BrianNeural",
    "onyx":    "en-US-GuyNeural",
    # English UK
    "fable":   "en-GB-SoniaNeural",
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


def _run_edge_tts(text: str, voice: str, rate: str) -> bytes:
    """Run edge-tts in a sync context, return MP3 bytes."""
    async def _generate():
        communicate = edge_tts.Communicate(text, voice, rate=rate)
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


@app.route("/v1/audio/speech", methods=["POST"])
def speech():
    """OpenAI-compatible TTS endpoint."""
    data = request.get_json(force=True, silent=True) or {}
    text = data.get("input", "")
    voice_id = data.get("voice", "alloy").lower()
    speed = float(data.get("speed", 1.0))

    if not text:
        return jsonify({"error": "No input text provided"}), 400

    # Resolve voice
    edge_voice = VOICE_MAP.get(voice_id, "en-US-AvaNeural")

    # Convert speed to Edge TTS rate string (e.g., "+20%", "-10%")
    rate_pct = int((speed - 1.0) * 100)
    rate_str = f"+{rate_pct}%" if rate_pct >= 0 else f"{rate_pct}%"

    try:
        audio_bytes = _run_edge_tts(text, edge_voice, rate_str)
        if not audio_bytes:
            return jsonify({"error": "No audio generated"}), 500
        return Response(audio_bytes, mimetype="audio/mpeg")
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "edge-tts", "voices": len(VOICE_MAP)})


@app.route("/v1/voices", methods=["GET"])
def list_voices():
    """List available voice mappings."""
    voices = [{"id": k, "name": v} for k, v in VOICE_MAP.items()]
    return jsonify({"voices": voices})


if __name__ == "__main__":
    print(f"🎤 Edge TTS Server starting on port 5001 ({len(VOICE_MAP)} voices)")
    app.run(host="0.0.0.0", port=5001, debug=False)
