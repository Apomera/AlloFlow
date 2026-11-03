"""Offline backend/actual-route checks. No torch, model download or server needed."""
import base64
import io
import threading
import types
import unittest

from PIL import Image
from pydantic import ValidationError
from test_flux_security_20261102 import backends, load_route_namespace, security, HTTPException


def model_stubs(bf16=True):
    events = []
    control = {'fail_offload': False}

    class Pipeline:
        def __init__(self, weights=None):
            self.weights = weights if weights is not None else {'hook': None}

        @classmethod
        def from_pretrained(cls, model, **kwargs):
            events.append(('load', cls.__name__, model, kwargs))
            return cls()

        @classmethod
        def from_pipe(cls, previous):
            assert previous.weights['hook'] is None, 'old offload hooks retained'
            events.append(('share', cls.__name__, previous.weights))
            return cls(previous.weights)

        def remove_all_hooks(self):
            events.append(('unhook', type(self).__name__))
            self.weights['hook'] = None

        def enable_model_cpu_offload(self, **kwargs):
            assert self.weights['hook'] is None, 'competing offload hooks'
            if control['fail_offload']:
                control['fail_offload'] = False
                raise RuntimeError('synthetic offload failure')
            events.append(('offload', type(self).__name__, kwargs))
            self.weights['hook'] = self

        def to(self, device):
            events.append(('to', device))
            return self

        def __call__(self, **kwargs):
            events.append(('call', type(self).__name__, kwargs))
            return types.SimpleNamespace(images=[Image.new('RGB', (8, 8))])

    diffusers = types.SimpleNamespace(**{
        name: type(name, (Pipeline,), {}) for name in
        ('SanaSprintPipeline', 'SanaSprintImg2ImgPipeline', 'FluxPipeline', 'FluxImg2ImgPipeline')})
    torch = types.SimpleNamespace(bfloat16='bf16', float16='fp16', float32='fp32',
                                  cuda=types.SimpleNamespace(is_bf16_supported=lambda: bf16))
    return torch, diffusers, events, control


class BackendTests(unittest.TestCase):
    def test_default_and_operator_selection(self):
        default = backends.ImageBackend.from_env({})
        self.assertEqual((default.name, default.model_id), ('sana-sprint', backends.SANA_MODEL))
        self.assertEqual(backends.ImageBackend.from_env({'FLUX_MODEL': 'old-flux', 'IMAGE_MODEL_REVISION': 'a' * 40}).model_id, backends.SANA_MODEL)
        flux = backends.ImageBackend.from_env({'IMAGE_BACKEND': 'flux', 'FLUX_MODEL': 'old-flux', 'IMAGE_MODEL_REVISION': 'a' * 40})
        self.assertEqual(flux.model_id, 'old-flux')
        custom = backends.ImageBackend.from_env({'IMAGE_BACKEND': 'sana-sprint', 'IMAGE_MODEL': ' smaller-model ', 'IMAGE_MODEL_REVISION': 'a' * 40})
        self.assertEqual(custom.model_id, 'smaller-model')
        with self.assertRaises(ValueError): backends.ImageBackend.from_env({'IMAGE_BACKEND': 'typo'})

    def test_sana_uses_two_steps_without_resolution_upscaling(self):
        opts = backends.ImageBackend.from_env({}).options(width=512, height=256)
        self.assertEqual((opts['num_inference_steps'], opts['guidance_scale']), (2, 4.5))
        self.assertEqual((opts['width'], opts['height']), (512, 256))
        self.assertIs(opts['use_resolution_binning'], False)

    def test_sana_step_limit_and_explicit_zero_guidance(self):
        backend = backends.ImageBackend.from_env({})
        for invalid in (0, 5, 50, True, '2'):
            with self.assertRaises(ValueError): backend.options(steps=invalid, width=512, height=512)
        for steps in (1, 2, 3, 4):
            self.assertEqual(backend.options(steps=steps, guidance=0, width=512, height=512)['guidance_scale'], 0)

    def test_flux_defaults_and_limit_preserved(self):
        for model, steps, guidance in [('FLUX.1-schnell', 4, 0), ('FLUX.1-dev', 20, 7.5)]:
            backend = backends.ImageBackend('flux', model, revision='a' * 40)
            opts = backend.options(width=512, height=512)
            self.assertEqual((opts['num_inference_steps'], opts['guidance_scale']), (steps, guidance))
            self.assertNotIn('use_resolution_binning', opts)
            self.assertEqual(backend.options(steps=50, width=512, height=512)['num_inference_steps'], 50)


class PipelineTests(unittest.TestCase):
    def test_switching_between_generation_and_editing_shares_one_load(self):
        torch, diffusers, events, _ = model_stubs()
        runtime = backends.SharedImagePipeline(backends.ImageBackend.from_env({}), 'cuda', torch, diffusers)
        weights = runtime.active.weights
        for method in [runtime.generate, runtime.edit, runtime.generate, runtime.edit]:
            result = method(prompt='synthetic')
            result.images[0].close()
            self.assertIs(runtime.active.weights, weights)
        loads = [e for e in events if e[0] == 'load']
        self.assertEqual(len(loads), 1)
        self.assertEqual(loads[0][1], 'SanaSprintPipeline')
        self.assertEqual(loads[0][3], {'dtype': 'bf16', 'use_safetensors': True, 'trust_remote_code': False, 'revision': backends.ImageBackend.from_env({}).revision, 'local_files_only': False})
        self.assertNotIn(('to', 'cuda'), events)
        self.assertEqual([e[1] for e in events if e[0] == 'call'],
                         ['SanaSprintPipeline', 'SanaSprintImg2ImgPipeline', 'SanaSprintPipeline', 'SanaSprintImg2ImgPipeline'])
        runtime.close()
        self.assertIsNone(weights['hook'])
        self.assertIsNone(runtime.active)

    def test_sana_never_uses_fp16_when_bf16_is_unavailable(self):
        for device, bf16 in [('cpu', True), ('cuda', False)]:
            torch, diffusers, events, _ = model_stubs(bf16)
            runtime = backends.SharedImagePipeline(backends.ImageBackend.from_env({}), device, torch, diffusers)
            self.assertEqual(events[0][3]['dtype'], 'fp32')
            if device == 'cpu':
                self.assertIn(('to', 'cpu'), events)
                self.assertFalse(any(e[0] == 'offload' for e in events))
            runtime.close()

    def test_flux_remains_available_with_shared_weights(self):
        torch, diffusers, events, _ = model_stubs()
        runtime = backends.SharedImagePipeline(backends.ImageBackend('flux', backends.FLUX_MODEL), 'cuda', torch, diffusers)
        runtime.edit(prompt='synthetic').images[0].close()
        self.assertEqual(events[0][1], 'FluxPipeline')
        self.assertEqual(events[0][3]['dtype'], 'fp16')
        self.assertEqual([e[1] for e in events if e[0] == 'call'], ['FluxImg2ImgPipeline'])
        self.assertEqual(len([e for e in events if e[0] == 'load']), 1)
        runtime.close()

    def test_failed_offload_switch_can_recover_on_next_request(self):
        torch, diffusers, events, control = model_stubs()
        runtime = backends.SharedImagePipeline(backends.ImageBackend.from_env({}), 'cuda', torch, diffusers)
        control['fail_offload'] = True
        with self.assertRaises(RuntimeError): runtime.edit(prompt='synthetic')
        self.assertIsNone(runtime.active_kind)
        runtime.generate(prompt='synthetic').images[0].close()
        self.assertEqual(runtime.active_kind, 0)
        self.assertIs(runtime.active.weights['hook'], runtime.active)
        self.assertEqual(len([e for e in events if e[0] == 'load']), 1)
        runtime.close()


class SanaRouteTests(unittest.TestCase):
    def setUp(self):
        self.ns = load_route_namespace(backends.ImageBackend.from_env({}))
        self.calls = []
        def pipeline(**kwargs):
            self.calls.append(kwargs)
            return types.SimpleNamespace(images=[Image.new('RGB', (8, 8))])
        self.ns['pipe_txt2img'] = self.ns['pipe_img2img'] = pipeline
        with Image.new('RGB', (8, 8)) as image:
            buffer = io.BytesIO()
            image.save(buffer, format='PNG')
        self.input = base64.b64encode(buffer.getvalue()).decode()

    def test_actual_generation_uses_sana_defaults_and_bounded_dimensions(self):
        req = self.ns['ImageGenerationRequest'](prompt='synthetic', size='300x520', model='untrusted-checkpoint')
        result = self.ns['generate_image'](req)
        call = self.calls[0]
        self.assertEqual((call['width'], call['height']), (288, 512))
        self.assertEqual((call['num_inference_steps'], call['guidance_scale']), (2, 4.5))
        self.assertIs(call['use_resolution_binning'], False)
        self.assertNotIn('model', call)
        self.assertTrue(result.data[0]['b64_json'])

    def test_request_schema_rejects_steps_beyond_sprint_limit(self):
        for name in ('ImageGenerationRequest', 'ImageEditRequest'):
            for invalid in (0, 5, 50, True, '2'):
                with self.assertRaises(ValidationError):
                    self.ns[name](prompt='synthetic', image=self.input, num_inference_steps=invalid)

    def test_actual_edit_passes_dimensions_without_implicit_1024_render(self):
        req = self.ns['ImageEditRequest'](prompt='synthetic', image=self.input, size='256x512',
                                         num_inference_steps=4, guidance_scale=0, strength=0.5)
        result = self.ns['edit_image'](req)
        call = self.calls[0]
        self.assertEqual((call['width'], call['height']), (256, 512))
        self.assertEqual((call['num_inference_steps'], call['guidance_scale'], call['strength']), (4, 0, 0.5))
        self.assertIs(call['use_resolution_binning'], False)
        self.assertTrue(result.data[0]['b64_json'])

    def test_ollama_route_uses_same_sana_defaults(self):
        result = self.ns['ollama_generate'](self.ns['OllamaImageRequest'](prompt='synthetic'))
        self.assertTrue(result['images'][0])
        self.assertEqual(self.calls[0]['num_inference_steps'], 2)
        self.assertIs(self.calls[0]['use_resolution_binning'], False)

    def test_edit_and_generation_share_the_gpu_gate(self):
        started, release = threading.Event(), threading.Event()
        errors = []
        def slow(**kwargs):
            started.set()
            if not release.wait(3): raise RuntimeError('test timed out')
            return types.SimpleNamespace(images=[Image.new('RGB', (8, 8))])
        self.ns['pipe_txt2img'] = slow
        def generate():
            try: self.ns['generate_image'](self.ns['ImageGenerationRequest'](prompt='synthetic'))
            except Exception as error: errors.append(error)
        thread = threading.Thread(target=generate)
        thread.start()
        try:
            self.assertTrue(started.wait(1))
            with self.assertRaises(security.IntakeError):
                self.ns['edit_image'](self.ns['ImageEditRequest'](prompt='synthetic', image=self.input))
            self.assertEqual(self.calls, [])
        finally:
            release.set()
            thread.join(4)
        self.assertFalse(thread.is_alive())
        self.assertEqual(errors, [])

    def test_invalid_edit_image_is_rejected_before_pipeline(self):
        with self.assertRaises(HTTPException) as got:
            self.ns['edit_image'](self.ns['ImageEditRequest'](prompt='synthetic', image='invalid'))
        self.assertEqual(got.exception.status_code, 400)
        self.assertEqual(self.calls, [])


if __name__ == '__main__': unittest.main()
