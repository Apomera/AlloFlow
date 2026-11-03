"""Self-contained image page; no model, network or secret dependencies."""
import base64
import hashlib
from pathlib import Path
import re

STUDIO_HTML = Path(__file__).with_name("studio.html").read_bytes().replace(b"\r\n", b"\n").replace(b"\r", b"\n")


def studio_headers():
    def digest(tag):
        blocks = re.findall(rb"<" + tag + rb">([\s\S]*?)</" + tag + rb">", STUDIO_HTML)
        if len(blocks) != 1:
            raise ValueError("Studio requires exactly one bundled script and style")
        return base64.b64encode(hashlib.sha256(blocks[0]).digest()).decode("ascii")
    return {
        "Content-Security-Policy": (
            "default-src 'none'; "
            f"script-src 'sha256-{digest(b'script')}'; "
            f"style-src 'sha256-{digest(b'style')}'; "
            "connect-src 'self'; img-src data: blob:; base-uri 'none'; "
            "form-action 'none'; frame-ancestors 'none'; object-src 'none'"
        ),
        "Referrer-Policy": "no-referrer",
        "X-Frame-Options": "DENY",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    }
