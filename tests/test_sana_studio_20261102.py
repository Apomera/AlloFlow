"""Real ASGI security/page content checks; no FastAPI, torch, network or models."""
import ast
import base64
import hashlib
import importlib.util
import os
import pathlib
import re
import subprocess
import sys
import unittest

from test_flux_security_20261102 import security, TOKEN

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('image_studio', ROOT / 'docker/flux-server/studio.py')
studio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(studio)
ORIGIN = 'http://localhost:7860'


class PageTests(unittest.IsolatedAsyncioTestCase):
    async def request(self, path='/', method='GET', auth=None, origin=None, token=TOKEN):
        entered, sent = [], []
        async def app(scope, receive, send):
            entered.append(scope['path'])
            headers = [(k.lower().encode(), v.encode()) for k, v in studio.studio_headers().items()]
            await send({'type': 'http.response.start', 'status': 200, 'headers': headers})
            await send({'type': 'http.response.body', 'body': studio.STUDIO_HTML if path == '/' else b'{}'})
        middleware = security.FluxSecurity(app, token=token, origins=ORIGIN)
        headers = [(b'content-type', b'application/json')]
        if auth is not None: headers.append((b'authorization', ('Bearer ' + auth).encode()))
        if origin is not None: headers.append((b'origin', origin.encode()))
        async def receive(): return {'type': 'http.request', 'body': b'{}'}
        async def send(message): sent.append(message)
        await middleware({'type': 'http', 'path': path, 'method': method, 'headers': headers}, receive, send)
        return sent, entered

    async def test_readonly_page_works_without_server_or_client_token(self):
        sent, entered = await self.request(token='')
        self.assertEqual(sent[0]['status'], 200)
        self.assertEqual(entered, ['/'])
        self.assertEqual(sent[1]['body'], studio.STUDIO_HTML)
        headers = dict(sent[0]['headers'])
        self.assertEqual(headers[b'cache-control'], b'no-store')
        self.assertEqual(headers[b'x-content-type-options'], b'nosniff')
        self.assertEqual(headers[b'x-frame-options'], b'DENY')

    async def test_no_other_get_route_becomes_public(self):
        for path in ['/docs', '/openapi.json', '/.env', '/studio.py', '/studio.html', '/health/', '/v1/images/generations']:
            sent, entered = await self.request(path)
            self.assertEqual((sent[0]['status'], entered), (401, []), path)

    async def test_mutating_routes_including_root_still_require_authentication(self):
        for path in ['/', '/health', '/v1/images/generations', '/v1/images/edits', '/api/generate']:
            for auth in [None, 'wrong']:
                sent, entered = await self.request(path, 'POST', auth=auth, origin=ORIGIN)
                self.assertEqual((sent[0]['status'], entered), (401, []), path)

    async def test_valid_token_and_exact_studio_origin_are_required(self):
        sent, entered = await self.request('/v1/images/generations', 'POST', auth=TOKEN, origin=ORIGIN)
        self.assertEqual((sent[0]['status'], entered), (200, ['/v1/images/generations']))
        for origin in ['http://localhost:7861', 'http://localhost.evil.test:7860', 'null', 'http://127.0.0.1:7860']:
            sent, entered = await self.request('/v1/images/edits', 'POST', auth=TOKEN, origin=origin)
            self.assertEqual((sent[0]['status'], entered), (403, []))

    async def test_missing_server_token_cannot_generate_even_when_page_is_public(self):
        sent, entered = await self.request('/v1/images/generations', 'POST', auth=TOKEN, origin=ORIGIN, token='')
        self.assertEqual((sent[0]['status'], entered), (503, []))

    def test_csp_hashes_match_the_exact_served_script_and_style(self):
        csp = studio.studio_headers()['Content-Security-Policy']
        for tag in [b'script', b'style']:
            block = re.findall(rb'<' + tag + rb'>([\s\S]*?)</' + tag + rb'>', studio.STUDIO_HTML)
            self.assertEqual(len(block), 1)
            digest = base64.b64encode(hashlib.sha256(block[0]).digest()).decode()
            self.assertIn("'sha256-" + digest + "'", csp)
        for directive in ["default-src 'none'", "connect-src 'self'", "frame-ancestors 'none'", "form-action 'none'", "base-uri 'none'"]:
            self.assertIn(directive, csp)
        self.assertNotIn('unsafe-inline', csp)
        self.assertNotIn('unsafe-eval', csp)

    def test_bundle_has_no_external_scripts_or_credential_persistence(self):
        html = studio.STUDIO_HTML.decode()
        self.assertNotRegex(html, r'<script\s+src=')
        self.assertNotIn('localStorage', html)
        self.assertNotIn('sessionStorage', html)
        self.assertNotIn('innerHTML', html)
        self.assertNotRegex(html, r'id="token"[^>]*\bname=')

    def test_actual_fastapi_route_returns_exact_page_and_headers(self):
        tree = ast.parse((ROOT / 'docker/flux-server/flux_server.py').read_text(encoding='utf-8'))
        route = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'image_studio')
        self.assertEqual(route.decorator_list[0].args[0].value, '/')
        route.decorator_list = []
        namespace = {'STUDIO_HTML': studio.STUDIO_HTML, 'studio_headers': studio.studio_headers,
                     'HTMLResponse': lambda **kwargs: kwargs}
        exec(compile(ast.Module(body=[route], type_ignores=[]), 'actual_studio_route', 'exec'), namespace)
        self.assertEqual(namespace['image_studio'](), {'content': studio.STUDIO_HTML, 'headers': studio.studio_headers()})


if __name__ == '__main__':
    selftest = '--selftest' in sys.argv
    if selftest: sys.argv.remove('--selftest')
    result = unittest.main(exit=False).result
    if not result.wasSuccessful(): sys.exit(1)
    if selftest:
        source = ROOT / 'docker/flux-server/security.py'
        original = source.read_bytes()
        text = original.decode('utf-8')
        anchor = "if not (scope['method'] == 'GET' and scope['path'] in ('/', '/health')):"
        assert text.count(anchor) == 1
        mutant = ROOT / 'tmp/security-sana-studio-01a199e2/security-auth-bypass-mutant.py'
        mutant.write_text(text.replace(anchor, 'if False:'), encoding='utf-8')
        environment = dict(os.environ, ALLO_FLUX_SECURITY_PATH=str(mutant))
        check = subprocess.run([sys.executable, '-B', str(pathlib.Path(__file__).resolve())],
                               env=environment, capture_output=True, text=True)
        mutant.with_suffix('.log').write_text(check.stdout + check.stderr, encoding='utf-8')
        assert check.returncode != 0 and 'FAILED (failures=' in check.stderr, check.stderr
        assert source.read_bytes() == original, 'Production middleware was changed during the negative control'
        print('PASS --selftest: authentication-bypass mutation rejected; live source unchanged')
