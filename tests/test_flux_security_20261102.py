"""Offline security checks: real ASGI middleware/Pydantic/Pillow; mocked model only."""
import ast
import asyncio
import base64
import importlib.util
import io
import os
import pathlib
import re
import threading
import tracemalloc
import types
import unittest
from unittest.mock import patch

from pydantic import BaseModel, Field, conint, ValidationError
from typing import Optional, Literal
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('flux_security', os.getenv('ALLO_FLUX_SECURITY_PATH') or ROOT / 'docker/flux-server/security.py')
security = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(security)
BACKEND_SPEC = importlib.util.spec_from_file_location('image_backends', os.getenv('ALLO_IMAGE_BACKENDS_PATH') or ROOT / 'docker/flux-server/image_backends.py')
backends = importlib.util.module_from_spec(BACKEND_SPEC)
BACKEND_SPEC.loader.exec_module(backends)
TOKEN = 'synthetic-flux-token-32-characters-long'
ORIGIN = 'https://synthetic.invalid'


class HTTPException(Exception):
    def __init__(self, status, detail):
        self.status_code, self.detail = status, detail


tree = ast.parse((ROOT / 'docker/flux-server/flux_server.py').read_text(encoding='utf-8'))
names = {'ImageGenerationRequest', 'ImageEditRequest', 'OllamaImageRequest', 'ImageResponse',
         'parse_size', 'image_to_base64', 'base64_to_image', 'generate_image', 'edit_image', 'ollama_generate'}
selected = []
for node in tree.body:
    if isinstance(node, (ast.FunctionDef, ast.ClassDef)) and node.name in names:
        node.decorator_list = []
        selected.append(node)
def load_route_namespace(backend=None):
    backend = backend or backends.ImageBackend('flux', 'synthetic-schnell', revision='a' * 40)
    namespace = dict(BaseModel=BaseModel, Field=Field, conint=conint, Optional=Optional, Literal=Literal,
              Image=Image, HTTPException=HTTPException, re=re, io=io, base64=base64,
              MAX_SIZE=1024, MODEL_ID=backend.model_id, BACKEND=backend, time=types.SimpleNamespace(time=lambda:0),
              log=types.SimpleNamespace(error=lambda *args:None), generation_gate=security.GenerationGate())
    namespace.update({name:getattr(security,name) for name in ('MAX_BODY_BYTES','MAX_IMAGE_BYTES','MAX_IMAGE_PIXELS','MAX_STEPS','MAX_PROMPT_CHARS')})
    exec(compile(ast.Module(body=selected, type_ignores=[]), 'actual_flux_functions', 'exec'), namespace)
    return namespace


ns = load_route_namespace()


class IntakeTests(unittest.IsolatedAsyncioTestCase):
    async def request(self, *, token=TOKEN, auth=TOKEN, origin=ORIGIN, method='POST', path='/v1/images/generations', chunks=None, extra=None, limit=security.MAX_BODY_BYTES):
        entered = []
        async def app(scope, receive, send):
            entered.append(await receive() if method == 'POST' else {})
            await send({'type':'http.response.start','status':200,'headers':[]})
            await send({'type':'http.response.body','body':b'ok'})
        middleware = security.FluxSecurity(app, token=token, origins=ORIGIN, max_body_bytes=limit)
        headers = [(b'content-type',b'application/json')]
        if auth is not None: headers.append((b'authorization', ('Bearer '+auth).encode()))
        if origin is not None: headers.append((b'origin', origin.encode()))
        headers += extra or []
        messages = list(chunks or [{'type':'http.request','body':b'{}'}])
        async def receive():
            if messages:return messages.pop(0)
            await asyncio.sleep(1)
            return {'type':'http.disconnect'}
        output=[]
        async def send(message):output.append(message)
        await middleware({'type':'http','method':method,'path':path,'headers':headers},receive,send)
        return output[0]['status'], entered, dict(output[0]['headers'])

    async def test_protects_every_mutating_route(self):
        for path in ['/v1/images/generations','/v1/images/edits','/api/generate']:
            for auth in [None,'wrong']:
                status,entered,_=await self.request(path=path,auth=auth)
                self.assertEqual((status,entered),(401,[]))

    async def test_missing_or_short_server_token_fails_closed(self):
        for token in ['', 'too-short']:
            self.assertEqual((await self.request(token=token))[0],503)

    async def test_health_probe_is_available_without_token(self):
        self.assertEqual((await self.request(token='',auth=None,origin=None,method='GET',path='/health'))[0],200)

    async def test_exact_origin_and_token_required(self):
        for origin in ['null','https://synthetic.invalid.attacker.test','https://synthetic.invalid/','https://evil.invalid']:
            status,entered,headers=await self.request(origin=origin)
            self.assertEqual((status,entered),(403,[]));self.assertNotIn(b'access-control-allow-origin',headers)
        status,entered,headers=await self.request()
        self.assertEqual(status,200);self.assertEqual(entered[0]['body'],b'{}')
        self.assertEqual(headers[b'access-control-allow-origin'],ORIGIN.encode())
        self.assertEqual((await self.request(origin=None))[0],200)

    async def test_preflight_is_bounded_and_does_not_reach_application(self):
        status,entered,_=await self.request(method='OPTIONS',auth=None,extra=[(b'access-control-request-method',b'POST'),(b'access-control-request-headers',b'authorization,content-type')])
        self.assertEqual((status,entered),(204,[]))
        self.assertEqual((await self.request(method='OPTIONS',extra=[(b'access-control-request-method',b'DELETE')]))[0],403)

    async def test_declared_and_actual_chunked_size_enforced_before_parse(self):
        self.assertEqual((await self.request(limit=8,extra=[(b'content-length',b'9')]))[0],413)
        status,entered,_=await self.request(limit=8,chunks=[{'type':'http.request','body':b'12345','more_body':True},{'type':'http.request','body':b'6789'}],extra=[(b'content-length',b'2')])
        self.assertEqual((status,entered),(413,[]))
        self.assertEqual((await self.request(extra=[(b'content-length',b'-1')]))[0],400)
        self.assertEqual((await self.request(extra=[(b'content-length',b'9'*5000)]))[0],413)

    async def test_duplicate_headers_rejected(self):
        self.assertEqual((await self.request(extra=[(b'authorization',b'Bearer '+TOKEN.encode())]))[0],400)

    async def test_slow_body_times_out_without_application_work(self):
        real_wait=asyncio.wait_for
        with patch.object(security.asyncio,'wait_for',lambda coro,timeout:real_wait(coro,0.01)):
            status,entered,_=await self.request(chunks=[{'type':'http.request','body':b'{','more_body':True}])
        self.assertEqual((status,entered),(408,[]))


class ConcurrentIntakeTests(unittest.IsolatedAsyncioTestCase):
    def middleware(self, phase='receive'):
        self.ready = asyncio.Event()
        self.release = asyncio.Event()
        self.starts = 0
        self.received_bodies = []
        async def wait():
            self.starts += 1
            if self.starts >= 4: self.ready.set()
            await self.release.wait()
        self.wait = wait
        self.phase = phase
        async def app(scope, receive, send):
            if scope['method'] == 'POST':
                self.received_bodies.append((await receive())['body'])
                if phase == 'application' and scope.get('test_block'): await wait()
            await send({'type':'http.response.start','status':200,'headers':[]})
            await send({'type':'http.response.body','body':b'ok'})
        return security.FluxSecurity(app,token=TOKEN,origins=ORIGIN)

    async def call(self, middleware, *, block=False, auth=TOKEN, method='POST', path='/v1/images/generations', receive=None):
        async def body():
            if block and self.phase == 'receive': await self.wait()
            return {'type':'http.request','body':b'{}'}
        output=[]
        async def send(message):
            if block and self.phase == 'response': await self.wait()
            output.append(message)
        headers=[(b'content-type',b'application/json'),(b'authorization',('Bearer '+auth).encode())]
        scope={'type':'http','method':method,'path':path,'headers':headers,'test_block':block}
        await middleware(scope,receive or body,send)
        return output[0]['status'],dict(output[0]['headers'])

    async def saturate(self,middleware):
        routes=['/v1/images/generations','/v1/images/edits','/api/generate','/v1/images/generations']
        tasks=[asyncio.create_task(self.call(middleware,block=True,path=p)) for p in routes]
        try: await asyncio.wait_for(self.ready.wait(),1)
        except BaseException:
            await self.stop(tasks)
            raise
        return tasks

    async def stop(self,tasks):
        for task in tasks:task.cancel()
        await asyncio.gather(*tasks,return_exceptions=True)

    async def test_shared_upload_cap_refuses_before_reading_and_preserves_health(self):
        middleware=self.middleware();tasks=await self.saturate(middleware)
        async def unread(): self.fail('Rejected request body must not be read')
        try:
            status,headers=await self.call(middleware,receive=unread)
            self.assertEqual(status,429);self.assertEqual(headers[b'retry-after'],b'1')
            self.assertEqual((await self.call(middleware,auth='wrong',receive=unread))[0],401)
            self.assertEqual((await self.call(middleware,auth='',method='GET',path='/health'))[0],200)
            self.release.set()
            self.assertTrue(all(r[0]==200 for r in await asyncio.gather(*tasks)))
            self.assertEqual((await self.call(middleware))[0],200)
        finally:await self.stop(tasks)

    async def test_cancellation_releases_slots_during_upload_application_and_response(self):
        for phase in ['receive','application','response']:
            with self.subTest(phase=phase):
                middleware=self.middleware(phase);tasks=await self.saturate(middleware)
                try:
                    self.assertEqual((await self.call(middleware))[0],429)
                    tasks[0].cancel()
                    with self.assertRaises(asyncio.CancelledError):await tasks[0]
                    self.assertEqual((await self.call(middleware))[0],200)
                finally:await self.stop(tasks)
                self.assertEqual((await self.call(middleware))[0],200)

    async def test_disconnect_and_failed_body_reads_never_leak_capacity(self):
        middleware=self.middleware()
        for event,status in [({'type':'http.disconnect'},400),({'type':'unexpected'},400),
                             ({'type':'http.request','body':b'x'*(security.MAX_BODY_BYTES+1)},413)]:
            async def receive():return event
            for _ in range(5):self.assertEqual((await self.call(middleware,receive=receive))[0],status)
        async def broken():raise OSError('synthetic disconnect')
        for _ in range(5):
            with self.assertRaises(OSError):await self.call(middleware,receive=broken)
        self.assertEqual((await self.call(middleware))[0],200)

    async def test_body_timeouts_release_capacity(self):
        middleware=self.middleware();real_wait=asyncio.wait_for
        async def stalled():await asyncio.Event().wait()
        with patch.object(security.asyncio,'wait_for',lambda coro,timeout:real_wait(coro,0.001)):
            for _ in range(5):self.assertEqual((await self.call(middleware,receive=stalled))[0],408)
        self.assertEqual((await self.call(middleware))[0],200)

    async def test_fragmented_body_preserves_bytes_without_chunk_list_amplification(self):
        middleware=self.middleware();count=32768;seen=0
        async def receive():
            nonlocal seen
            seen+=1
            return {'type':'http.request','body':b'x','more_body':seen<count}
        tracemalloc.start()
        try:
            self.assertEqual((await self.call(middleware,receive=receive))[0],200)
            _,peak=tracemalloc.get_traced_memory()
        finally:tracemalloc.stop()
        self.assertEqual(self.received_bodies,[b'x'*count])
        self.assertLess(peak,1024*1024,'Tiny chunks must not amplify 32 KiB into megabytes of retained objects')


class ModelBoundaryTests(unittest.TestCase):
    def test_server_installs_middleware_and_blocking_generation_routes(self):
        middleware = [node for node in ast.walk(tree) if isinstance(node,ast.Call)
                      and isinstance(node.func,ast.Attribute) and node.func.attr == 'add_middleware']
        self.assertEqual(len(middleware),1)
        self.assertEqual(middleware[0].args[0].id,'FluxSecurity')
        settings = {item.arg: ast.unparse(item.value) for item in middleware[0].keywords}
        self.assertIn('ALLOFLOW_FLUX_API_TOKEN',settings['token'])
        self.assertIn('ALLOFLOW_FLUX_ALLOWED_ORIGINS',settings['origins'])
        for name in ['generate_image','edit_image','ollama_generate']:
            self.assertTrue(any(isinstance(node,ast.FunctionDef) and node.name == name for node in tree.body))

    def test_steps_and_all_request_schemas_are_bounded(self):
        for value in [0,-1,51,1000000000,True,'50']:
            with self.assertRaises(ValidationError): ns['ImageGenerationRequest'](prompt='synthetic',num_inference_steps=value)
        for name in ['ImageGenerationRequest','ImageEditRequest','OllamaImageRequest']:
            with self.assertRaises(ValidationError):ns[name](prompt='x'*4001,image='synthetic')
        for value in [float('nan'),float('inf'),-1,21]:
            with self.assertRaises(ValidationError):ns['ImageGenerationRequest'](prompt='x',guidance_scale=value)

    def test_sizes_and_images_are_bounded(self):
        self.assertEqual(ns['parse_size']('512x512'),(512,512))
        for size in ['1000000x512','0x0','bad','1025x1024']:
            with self.assertRaises(HTTPException):ns['parse_size'](size)
        for image in ['@@@@','data:image/svg+xml;base64,PHN2Zz4=', 'A'*(security.MAX_IMAGE_BYTES*2)]:
            with self.assertRaises(HTTPException):ns['base64_to_image'](image)
        image=Image.new('RGB',(8,8));buf=io.BytesIO();image.save(buf,format='PNG');image.close()
        decoded=ns['base64_to_image'](base64.b64encode(buf.getvalue()).decode())
        self.assertEqual(decoded.size,(8,8));decoded.close()
        fake=types.SimpleNamespace(format='PNG',width=4096,height=4096)
        manager=unittest.mock.MagicMock();manager.__enter__.return_value=fake
        with patch.object(Image,'open',return_value=manager):
            with self.assertRaises(HTTPException):ns['base64_to_image']('eA==')

    def test_generation_uses_validated_steps_and_keeps_zero_guidance(self):
        calls=[]
        ns['pipe_txt2img']=lambda **args:(calls.append(args) or types.SimpleNamespace(images=[Image.new('RGB',(8,8))]))
        result=ns['generate_image'](ns['ImageGenerationRequest'](prompt='synthetic',num_inference_steps=50,guidance_scale=0))
        self.assertTrue(result.data[0]['b64_json']);self.assertEqual(calls[0]['num_inference_steps'],50);self.assertEqual(calls[0]['guidance_scale'],0)

    def test_failure_does_not_expose_prompt_or_provider_exception(self):
        def fail(**args):raise RuntimeError('synthetic confidential prompt')
        ns['pipe_txt2img']=fail
        with self.assertRaises(HTTPException) as got:ns['generate_image'](ns['ImageGenerationRequest'](prompt='synthetic'))
        self.assertEqual(got.exception.detail,'Image generation failed')

    def test_concurrent_jobs_refused_and_rate_window_expires(self):
        clock=[0];gate=security.GenerationGate(per_minute=2,clock=lambda:clock[0])
        started=threading.Event();finish=threading.Event()
        def job():
            with gate.acquire():started.set();finish.wait(2)
        thread=threading.Thread(target=job);thread.start();self.assertTrue(started.wait(1))
        try:
            with self.assertRaises(security.IntakeError):
                with gate.acquire():self.fail('concurrent job admitted')
        finally:finish.set();thread.join()
        with gate.acquire():pass
        with self.assertRaises(security.IntakeError):
            with gate.acquire():self.fail('rate limit bypass')
        clock[0]=61
        with gate.acquire():pass

    def test_invalid_origin_configuration_rejected(self):
        for origin in ['*','https://*.invalid','https://host.invalid/','https://u:p@host.invalid','file://localhost']:
            with self.assertRaises(ValueError):security.allowed_origins(origin)


if __name__ == '__main__':unittest.main()
