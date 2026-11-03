"""Local image backends. Importing this module never loads or downloads a model."""
import os
import json
import re
from pathlib import Path


SANA_MODEL = "Efficient-Large-Model/Sana_Sprint_1.6B_1024px_diffusers"
FLUX_MODEL = "black-forest-labs/FLUX.1-schnell"


class ImageBackend:
    def __init__(self, name, model_id, revision='', offline=False):
        if name not in ("sana-sprint", "flux"):
            raise ValueError("IMAGE_BACKEND must be sana-sprint or flux")
        self.name = name
        self.model_id = model_id
        manifest = json.loads(Path(__file__).with_name('model-manifest.json').read_text(encoding='utf-8'))
        known = manifest['models'].get(model_id, {})
        self.revision = str(revision or known.get('revision', '')).strip()
        if not re.fullmatch(r'[a-f0-9]{40}', self.revision):
            raise ValueError('IMAGE_MODEL_REVISION must be a full 40-character commit for custom models')
        if known and known['backend'] != name:
            raise ValueError('IMAGE_BACKEND does not match the selected known model')
        self.offline = bool(offline)
        self.size_multiple = 32 if name == "sana-sprint" else 8
        self.max_steps = 4 if name == "sana-sprint" else 50
        schnell = "schnell" in model_id.lower()
        self.default_steps = 2 if name == "sana-sprint" else (4 if schnell else 20)
        self.default_guidance = 4.5 if name == "sana-sprint" else (0.0 if schnell else 7.5)

    @classmethod
    def from_env(cls, environ=None):
        env = os.environ if environ is None else environ
        name = env.get("IMAGE_BACKEND", "sana-sprint").strip().lower()
        default_model = SANA_MODEL if name == "sana-sprint" else env.get("FLUX_MODEL", FLUX_MODEL)
        offline = env.get('ALLOFLOW_IMAGE_OFFLINE', '0').strip()
        if offline not in ('0', '1'):
            raise ValueError('ALLOFLOW_IMAGE_OFFLINE must be 0 or 1')
        return cls(name, env.get("IMAGE_MODEL", "").strip() or default_model,
                   env.get('IMAGE_MODEL_REVISION', '').strip(), offline == '1')

    def options(self, *, steps=None, guidance=None, width, height):
        steps = self.default_steps if steps is None else steps
        if type(steps) is not int or not 1 <= steps <= self.max_steps:
            raise ValueError(f"{self.name} requires 1 to {self.max_steps} inference steps")
        options = dict(width=width, height=height, num_inference_steps=steps,
                       guidance_scale=self.default_guidance if guidance is None else guidance,
                       max_sequence_length=300 if self.name == "sana-sprint" else 256)
        if self.name == "sana-sprint":
            # The upstream default renders in a 1024px bucket before resizing.
            # Honor the requested size and our pixel budget during inference itself.
            options["use_resolution_binning"] = False
        return options


class SharedImagePipeline:
    """One set of weights; switch pipeline wrappers only inside GenerationGate.

    Offload hooks belong to the active wrapper. Remove them before from_pipe and
    install fresh hooks on the new wrapper, so edits and generation never retain
    competing hooks or allocate a second copy of the model.
    """

    def __init__(self, backend, device, torch_module, diffusers_module):
        self.device = device
        if backend.name == "sana-sprint":
            self.classes = (diffusers_module.SanaSprintPipeline,
                            diffusers_module.SanaSprintImg2ImgPipeline)
            # FP16 can overflow SANA's text encoder/VAE. Use FP32 when BF16
            # acceleration is unavailable (slower and requires more memory).
            dtype = (torch_module.bfloat16 if device == "cuda" and
                     torch_module.cuda.is_bf16_supported() else torch_module.float32)
        else:
            self.classes = (diffusers_module.FluxPipeline, diffusers_module.FluxImg2ImgPipeline)
            dtype = torch_module.float16 if device == "cuda" else torch_module.float32
        self.active = self.classes[0].from_pretrained(
            backend.model_id, dtype=dtype, use_safetensors=True,
            trust_remote_code=False, revision=backend.revision,
            local_files_only=backend.offline)
        self.active_kind = None
        self._prepare(0)

    def _prepare(self, kind):
        if self.active_kind != kind:
            self.active_kind = None
            self.active.remove_all_hooks()
            target = self.classes[kind]
            if type(self.active) is not target:
                self.active = target.from_pipe(self.active)
            if self.device == "cuda":
                # Do not first move the entire model to CUDA: that defeats offload.
                self.active.enable_model_cpu_offload(device="cuda")
            else:
                self.active.to(self.device)
            self.active_kind = kind
        return self.active

    def generate(self, **kwargs):
        return self._prepare(0)(**kwargs)

    def edit(self, **kwargs):
        return self._prepare(1)(**kwargs)

    def close(self):
        if self.active is not None:
            self.active.remove_all_hooks()
            self.active = None
            self.active_kind = None
