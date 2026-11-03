"""Local infrastructure checks: no Docker, model downloads or GPU execution."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import unittest
from unittest.mock import patch
import yaml
from packaging.requirements import Requirement

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(os.environ.get('ALLO_INFRA_SOURCE', ROOT / 'docker/flux-server'))
OUT = ROOT / 'tmp/local-model-infra-01a199e2'
def load(name):
    spec = importlib.util.spec_from_file_location(name, SOURCE / (name + '.py'))
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module); return module
backend = load('image_backends')
models = load('model_manifest')

class InfrastructureTests(unittest.TestCase):
    def test_cpu_base_has_no_ollama_gpu_reservation(self):
        data = yaml.safe_load((ROOT / 'docker/docker-compose.yml').read_text(encoding='utf-8'))
        self.assertNotIn('deploy', data['services']['ollama'])
        self.assertEqual(data['services']['flux']['profiles'], ['gpu'])
        self.assertEqual(data['services']['ollama']['volumes'], ['ollama_data:/root/.ollama'])

    def test_gpu_override_changes_only_text_device_access(self):
        extra = yaml.safe_load((ROOT / 'docker/docker-compose.gpu.yml').read_text())
        self.assertEqual(set(extra['services']), {'ollama'})
        self.assertEqual(set(extra['services']['ollama']), {'deploy'})
        self.assertEqual(extra['services']['ollama']['deploy']['resources']['reservations']['devices'],
                         [{'driver': 'nvidia', 'count': 1, 'capabilities': ['gpu']}])

    def test_lock_has_no_unpinned_dependency_or_unhashed_artifact(self):
        text = (SOURCE / 'requirements.txt').read_text()
        lines = [x.strip() for x in text.replace('\\\n', ' ').splitlines() if x.strip() and not x.startswith('#')]
        self.assertGreater(len(lines), 60)
        for line in lines:
            requirement, *hashes = re.split(r'\s+--hash=sha256:', line)
            req = Requirement(requirement.strip())
            self.assertTrue(req.url or str(req.specifier).startswith('=='), req.name)
            self.assertTrue(hashes, req.name)
            self.assertTrue(all(re.fullmatch(r'[0-9a-f]{64}', value.strip()) for value in hashes), req.name)
            if req.url: self.assertTrue(req.url.startswith('https://download-r2.pytorch.org/whl/cu126/'))

    def test_container_enforces_hashes_import_gate_and_pinned_base(self):
        text = (SOURCE / 'Dockerfile').read_text()
        self.assertIn('--require-hashes --only-binary=:all:', text)
        self.assertIn('python3 -m pip check', text)
        self.assertIn('from diffusers import SanaSprintPipeline, SanaSprintImg2ImgPipeline', text)
        self.assertRegex(text, r'FROM nvidia/cuda:12\.6\.3-runtime-ubuntu24\.04@sha256:[0-9a-f]{64}')
        self.assertIn('model_manifest.py model-manifest.json', text)
        self.assertNotIn('pip3 install torch torchvision', text)

    def test_known_models_have_fixed_revisions_and_valid_integrity_metadata(self):
        catalog = json.loads((SOURCE / 'model-manifest.json').read_text())['models']
        self.assertEqual(len(catalog), 3)
        for name, record in catalog.items():
            self.assertRegex(record['revision'], r'^[a-f0-9]{40}$')
            self.assertEqual(record['download_bytes'], sum(x['bytes'] for x in record['files']))
            for item in record['files']:
                self.assertNotIn('..', Path(item['path']).parts)
                self.assertRegex(item['sha256'] or item['git_blob'], r'^(?:[a-f0-9]{40}|[a-f0-9]{64})$')
            self.assertEqual(backend.ImageBackend(record['backend'], name).revision, record['revision'])

    def test_custom_checkpoint_requires_an_immutable_revision(self):
        for revision in ['', 'main', 'latest', 'v1', 'a' * 39, 'Z' * 40]:
            with self.assertRaises(ValueError): backend.ImageBackend('sana-sprint', 'custom/model', revision)
        self.assertEqual(backend.ImageBackend('sana-sprint', 'custom/model', 'a' * 40).revision, 'a' * 40)
        with self.assertRaises(ValueError): backend.ImageBackend('flux', backend.SANA_MODEL)

    def test_offline_setting_fails_closed_on_invalid_value(self):
        self.assertTrue(backend.ImageBackend.from_env({'ALLOFLOW_IMAGE_OFFLINE':'1'}).offline)
        self.assertFalse(backend.ImageBackend.from_env({}).offline)
        for value in ['yes','true','2']:
            with self.assertRaises(ValueError): backend.ImageBackend.from_env({'ALLOFLOW_IMAGE_OFFLINE':value})

    def test_actual_loader_passes_revision_and_offline_without_remote_code(self):
        from test_local_image_backends_20261102 import model_stubs
        torch, diffusers, events, _ = model_stubs()
        selected = backend.ImageBackend.from_env({'ALLOFLOW_IMAGE_OFFLINE':'1'})
        runtime = backend.SharedImagePipeline(selected, 'cuda', torch, diffusers)
        options = events[0][3]
        self.assertEqual(options['revision'], selected.revision)
        self.assertIs(options['local_files_only'], True)
        self.assertIs(options['trust_remote_code'], False)
        self.assertIs(options['use_safetensors'], True)
        runtime.close()

    def fixture(self, root):
        raw = b'synthetic model bytes'; config = b'{"synthetic":true}'
        (root/'weights').write_bytes(raw); (root/'config.json').write_bytes(config)
        files = [{'path':'weights','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'git_blob':None},
                 {'path':'config.json','bytes':len(config),'sha256':None,'git_blob':hashlib.sha1(('blob '+str(len(config))+'\0').encode()+config).hexdigest()}]
        return {'revision':'a'*40,'download_bytes':sum(x['bytes'] for x in files),'files':files}

    def test_model_verification_checks_both_weight_sha256_and_git_blob(self):
        with tempfile.TemporaryDirectory(dir=OUT) as tmp:
            root=Path(tmp);record=self.fixture(root)
            self.assertTrue(models.verify_snapshot(root,record))
            (root/'weights').write_bytes(b'x'*record['files'][0]['bytes'])
            with self.assertRaisesRegex(ValueError,'integrity'):models.verify_snapshot(root,record)
            record=self.fixture(root);(root/'config.json').write_bytes(b'x'*record['files'][1]['bytes'])
            with self.assertRaisesRegex(ValueError,'integrity'):models.verify_snapshot(root,record)

    def test_missing_truncated_and_traversal_paths_are_rejected(self):
        with tempfile.TemporaryDirectory(dir=OUT) as tmp:
            root=Path(tmp);record=self.fixture(root)
            (root/'weights').write_bytes(b'bad')
            with self.assertRaisesRegex(ValueError,'size'):models.verify_snapshot(root,record)
            for name in ['../outside','/absolute']:
                record['files'][0]['path']=name
                with self.assertRaisesRegex(ValueError,'Unsafe'):models.verify_snapshot(root,record)

    def test_provision_is_explicit_pinned_and_verifies_download(self):
        with tempfile.TemporaryDirectory(dir=OUT) as tmp:
            root=Path(tmp);record=self.fixture(root);calls=[]
            def download(**kw): calls.append(kw);return root
            with patch.object(models,'model_record',return_value=record), patch.dict(os.environ,{'HF_HOME':str(root/'cache')}), patch.object(models.shutil,'disk_usage',return_value=type('Disk',(),{'free':10*1024**3})()):
                with self.assertRaises(ValueError): models.provision('synthetic/model',snapshot_download=download)
                self.assertEqual(calls,[])
                result=models.provision('synthetic/model',download=True,snapshot_download=download)
                self.assertTrue(result['verified']);self.assertEqual(calls[0]['revision'],'a'*40)
                self.assertEqual(calls[0]['allow_patterns'],['weights','config.json'])
                with self.assertRaises(ValueError):models.provision('synthetic/model','b'*40,download=True,snapshot_download=download)

    def test_insufficient_disk_prevents_any_download(self):
        calls=[]
        with tempfile.TemporaryDirectory(dir=OUT) as tmp:
            record=self.fixture(Path(tmp))
            with patch.object(models,'model_record',return_value=record), patch.dict(os.environ,{'HF_HOME':tmp}), patch.object(models.shutil,'disk_usage',return_value=type('Disk',(),{'free':1})()):
                with self.assertRaisesRegex(ValueError,'space'):models.provision('synthetic/model',download=True,snapshot_download=lambda **kw:calls.append(kw))
                self.assertEqual(calls,[])

    def test_repair_downloads_only_failed_files_and_checks_every_result(self):
        with tempfile.TemporaryDirectory(dir=OUT) as tmp:
            cache=Path(tmp);root=cache/'hub/models--synthetic--model/snapshots'/('a'*40);root.mkdir(parents=True)
            record=self.fixture(root);(root/'weights').write_bytes(b'broken');calls=[]
            def download(**kwargs):
                calls.append(kwargs);self.fixture(root);return root
            with patch.object(models,'model_record',return_value=record), patch.dict(os.environ,{'HF_HOME':str(cache)}), patch.object(models.shutil,'disk_usage',return_value=type('Disk',(),{'free':10*1024**3})()):
                result=models.provision('synthetic/model',download=True,snapshot_download=download)
                self.assertTrue(result['verified']);self.assertEqual(calls[0]['allow_patterns'],['weights']);self.assertTrue(calls[0]['force_download'])
                calls.clear();self.assertTrue(models.provision('synthetic/model',snapshot_download=download)['verified']);self.assertEqual(calls,[])

    def test_gated_flux_cannot_claim_managed_integrity_verification(self):
        with self.assertRaisesRegex(ValueError,'separate operator'):models.model_record(backend.FLUX_MODEL)

if __name__ == '__main__':
    selftest='--selftest' in sys.argv
    if selftest:sys.argv.remove('--selftest')
    result=unittest.main(exit=False).result
    if not result.wasSuccessful():sys.exit(1)
    if selftest:
        import subprocess
        mutant=OUT/'mutant';mutant.mkdir(exist_ok=True)
        for name in ['image_backends.py','model_manifest.py','model-manifest.json','requirements.txt','Dockerfile']:
            (mutant/name).write_bytes((SOURCE/name).read_bytes())
        file=mutant/'image_backends.py';text=file.read_text();changed=text.replace('revision=backend.revision','revision="main"');assert changed!=text;file.write_text(changed)
        check=subprocess.run([sys.executable,'-B',__file__],env=dict(os.environ,ALLO_INFRA_SOURCE=str(mutant)),capture_output=True,text=True)
        (OUT/'mutation-python.log').write_text(check.stdout+check.stderr,encoding='utf-8')
        assert check.returncode!=0 and 'test_actual_loader_passes_revision' in check.stderr
        print('PASS --selftest: moving model revision rejected')
