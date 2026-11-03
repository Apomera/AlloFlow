"""Bounded ASGI intake and process-local GPU admission; no model dependencies."""
import asyncio
from collections import deque
from contextlib import contextmanager
import hmac
import json
import threading
import time
from urllib.parse import urlsplit

MAX_BODY_BYTES = 8 * 1024 * 1024
MAX_IMAGE_BYTES = 6 * 1024 * 1024
MAX_IMAGE_PIXELS = 4 * 1024 * 1024
MAX_STEPS = 50
MAX_PROMPT_CHARS = 4000
MAX_IN_FLIGHT_REQUESTS = 4


def allowed_origins(value):
    result = []
    for origin in str(value or '').split(','):
        origin = origin.strip()
        if not origin:
            continue
        parsed = urlsplit(origin)
        if (parsed.scheme not in ('http', 'https') or not parsed.hostname
                or parsed.username or parsed.password or parsed.path
                or parsed.query or parsed.fragment or '*' in origin
                or any(ord(c) <= 32 or ord(c) == 127 for c in origin)):
            raise ValueError('Flux allowed origins must be exact HTTP(S) origins')
        # Accessing port also rejects malformed/out-of-range ports.
        if parsed.port is not None and not 0 < parsed.port < 65536:
            raise ValueError('Invalid Flux origin port')
        result.append(origin)
    return frozenset(result)


class IntakeError(Exception):
    def __init__(self, status, code):
        self.status, self.code = status, code


class FluxSecurity:
    def __init__(self, app, token='', origins='', max_body_bytes=MAX_BODY_BYTES):
        self.app = app
        self.token = str(token).encode('utf-8')
        self.origins = allowed_origins(origins)
        self.max_body_bytes = min(MAX_BODY_BYTES, max_body_bytes)
        self.intake_slots = threading.BoundedSemaphore(MAX_IN_FLIGHT_REQUESTS)

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        pairs = scope.get('headers', [])
        headers = {k.lower(): v for k, v in pairs}
        origin = headers.get(b'origin', b'').decode('latin-1')
        cors = [(b'vary', b'Origin')]
        if origin and origin in self.origins:
            cors.append((b'access-control-allow-origin', origin.encode('latin-1')))

        async def secure_send(message):
            if message['type'] == 'http.response.start':
                message = dict(message, headers=list(message.get('headers', [])) + cors + [
                    (b'cache-control', b'no-store'), (b'x-content-type-options', b'nosniff')])
            await send(message)

        admitted = False
        try:
            if any(sum(k.lower() == field for k, _ in pairs) > 1 for field in (b'origin', b'authorization', b'content-length')):
                raise IntakeError(400, 'ambiguous-headers')
            if origin and origin not in self.origins:
                raise IntakeError(403, 'origin-not-allowed')
            if scope['method'] == 'OPTIONS':
                requested = {v.strip().lower() for v in headers.get(b'access-control-request-headers', b'').split(b',') if v.strip()}
                if (not origin or headers.get(b'access-control-request-method') != b'POST'
                        or not requested <= {b'authorization', b'content-type'}):
                    raise IntakeError(403, 'preflight-not-allowed')
                await secure_send({'type':'http.response.start', 'status':204, 'headers':[
                    (b'access-control-allow-methods', b'POST'),
                    (b'access-control-allow-headers', b'Authorization, Content-Type')]})
                await send({'type':'http.response.body', 'body':b''})
                return
            # The read-only page and health check are public; API calls retain
            # bearer authentication and the exact-origin requirement.
            if not (scope['method'] == 'GET' and scope['path'] in ('/', '/health')):
                if len(self.token) < 32:
                    raise IntakeError(503, 'flux-auth-not-configured')
                auth = headers.get(b'authorization', b'')
                if len(auth) > 1024 or not auth.startswith(b'Bearer ') or not hmac.compare_digest(auth[7:], self.token):
                    raise IntakeError(401, 'unauthorized')
            if scope['method'] == 'POST':
                if headers.get(b'content-type', b'').split(b';')[0].strip().lower() != b'application/json':
                    raise IntakeError(415, 'json-required')
                declared = headers.get(b'content-length')
                if declared is not None:
                    if not declared.isdigit():
                        raise IntakeError(400, 'invalid-content-length')
                    if len(declared) > 16 or int(declared) > self.max_body_bytes:
                        raise IntakeError(413, 'request-too-large')
                admitted = self.intake_slots.acquire(blocking=False)
                if not admitted:
                    raise IntakeError(429, 'request-capacity-exhausted')

                async def read_body():
                    buffered = bytearray()
                    while True:
                        message = await receive()
                        if message['type'] == 'http.disconnect':
                            raise IntakeError(400, 'request-disconnected')
                        if message['type'] != 'http.request':
                            raise IntakeError(400, 'invalid-request')
                        chunk = message.get('body', b'')
                        if len(buffered) + len(chunk) > self.max_body_bytes:
                            raise IntakeError(413, 'request-too-large')
                        buffered.extend(chunk)
                        if not message.get('more_body', False):
                            return bytes(buffered)

                try:
                    body = await asyncio.wait_for(read_body(), timeout=15)
                except asyncio.TimeoutError:
                    raise IntakeError(408, 'request-timeout') from None
                sent = False
                async def replay():
                    nonlocal sent
                    if not sent:
                        sent = True
                        return {'type':'http.request', 'body':body, 'more_body':False}
                    return await receive()
                return await self.app(scope, replay, secure_send)
            return await self.app(scope, receive, secure_send)
        except IntakeError as error:
            error_headers = [(b'content-type', b'application/json')]
            if error.code == 'request-capacity-exhausted':
                error_headers.append((b'retry-after', b'1'))
            await secure_send({'type':'http.response.start', 'status':error.status, 'headers':error_headers})
            await send({'type':'http.response.body', 'body':json.dumps({'error':error.code}).encode()})
        finally:
            if admitted:
                self.intake_slots.release()


class GenerationGate:
    def __init__(self, per_minute=10, clock=time.monotonic):
        self.lock = threading.Lock()
        self.recent = deque()
        self.per_minute = per_minute
        self.clock = clock

    @contextmanager
    def acquire(self):
        if not self.lock.acquire(blocking=False):
            raise IntakeError(429, 'generation-busy')
        try:
            now = self.clock()
            while self.recent and self.recent[0] <= now - 60:
                self.recent.popleft()
            if len(self.recent) >= self.per_minute:
                raise IntakeError(429, 'generation-rate-limited')
            self.recent.append(now)
            yield
        finally:
            self.lock.release()
