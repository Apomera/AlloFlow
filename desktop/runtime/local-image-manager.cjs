'use strict';
// No process, network, model download or credential access on import.
// The protected desktop runtime supplies its runner, ownership, config and probe adapters.
const path = require('node:path');

function composePlan(action, { composeFile, envFile, projectName }) {
  if (!path.isAbsolute(composeFile || '') || !path.isAbsolute(envFile || '')) throw new Error('Absolute stack/config paths are required');
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(projectName || '')) throw new Error('Invalid image project name');
  const prefix = ['compose', '--env-file', envFile, '-f', composeFile, '-p', projectName, '--profile', 'gpu'];
  const commands = {
    build: ['build', 'flux'],
    provision: ['run', '--pull', 'never', '--rm', '--no-deps', '--entrypoint', 'python3', 'flux', 'model_manifest.py', '--download'],
    verify: ['run', '--pull', 'never', '--rm', '--no-deps', '--entrypoint', 'python3', 'flux', 'model_manifest.py'],
    start: ['up', '-d', '--pull', 'never', '--no-deps', '--no-build', 'flux'],
    stop: ['stop', 'flux'],
  };
  if (!commands[action]) throw new Error('Unsupported image operation');
  return { command: 'docker', args: [...prefix, ...commands[action]], cwd: path.dirname(composeFile), shell: false, windowsHide: true };
}

function preflight({ hardware = {}, model = {}, availableBytes = 0, config = {} }) {
  const issues = [];
  if (hardware.dockerReady !== true) issues.push('Docker with Compose must be available.');
  if (hardware.containerPlatform !== 'linux/amd64') issues.push('This image package requires Linux x86_64 containers.');
  if (hardware.nvidiaReady !== true) issues.push('NVIDIA GPU access must be configured for Docker.');
  if (!Number.isSafeInteger(model.download_bytes) || model.download_bytes <= 0) issues.push('Choose a model from the reviewed image catalog.');
  const requiredBytes = (model.download_bytes || 0) + 2 * 1024 ** 3;
  if (!Number.isFinite(availableBytes) || availableBytes < requiredBytes) issues.push('Free more disk space for the model and at least 2 GiB of working space.');
  if (config.tokenConfigured !== true) issues.push('Configure the private image-service token.');
  if (config.originConfigured !== true) issues.push('Allow this AlloFlow app origin in the image-service configuration.');
  return { eligible: issues.length === 0, issues, requiredBytes, gpuCompatibilityVerified: false };
}

function createLocalImageManager(adapters) {
  for (const name of ['run', 'readSetup', 'probe', 'verifyOwnership']) {
    if (typeof adapters?.[name] !== 'function') throw new Error('Missing protected desktop adapter: ' + name);
  }
  let state = { phase: 'stopped', busy: false, ready: false, message: 'Local images are stopped.' }, epoch = 0;
  const status = () => ({ ...state });
  const completed = () => ({ ...state, busy: false });
  const set = (phase, message, more = {}) => { state = { phase, busy: state.busy, ready: false, message, ...more }; };
  async function command(action, setup) {
    const result = await adapters.run(composePlan(action, setup.paths));
    if (!result || result.code !== 0) throw new Error('image-command-failed');
  }
  async function operation(kind) {
    if (state.busy) throw Object.assign(new Error('An image operation is already running.'), { code: 'image-busy' });
    const revision = ++epoch; state.busy = true;
    try {
      const setup = await adapters.readSetup();
      if (await adapters.verifyOwnership(setup.paths) !== true) throw new Error('image-owner-conflict');
      if (kind === 'stop') { set('stopping', 'Stopping local images…'); await command('stop', setup); set('stopped', 'Local images stopped. Model files are kept.'); return completed(); }
      if (kind === 'install') {
        const check = preflight(setup);
        if (!check.eligible) { set('needs-setup', check.issues.join(' ')); return completed(); }
        if (setup.termsAccepted !== true) { set('needs-setup', 'Review the model and text-encoder terms before installing.'); return completed(); }
        set('installing-runtime', 'Preparing the image runtime…'); await command('build', setup);
        set('installing-model', 'Downloading and verifying the selected model…'); await command('provision', setup);
        set('installed', 'Image files verified. Select Start to load SANA.'); return completed();
      }
      if (kind !== 'start') throw new Error('image-operation-invalid');
      // A normal Start never downloads a model: require an explicit offline configuration.
      if (setup.config?.offline !== true || setup.config?.tokenConfigured !== true || setup.config?.originConfigured !== true) {
        set('needs-setup', 'Configure the local token, app origin and offline startup before starting.'); return completed();
      }
      set('verifying', 'Checking the installed model files…'); await command('verify', setup);
      set('starting', 'Starting the image server…'); await command('start', setup);
      if (revision === epoch) set('loading', 'SANA is loading. The first start can take a while.');
      return completed();
    } catch (error) {
      // Command output/config may contain secrets. Keep public errors bounded and generic.
      const guidance = {
        'installing-runtime': 'The image runtime could not be prepared. Check Docker, internet access and disk space, then select Repair.',
        'installing-model': 'Model download or integrity verification failed. Check internet access and disk space, then select Repair.',
        verifying: 'Installed model files could not be verified. Select Repair before starting again.',
        starting: 'The image server could not start. Check Docker, NVIDIA GPU access and whether port 7860 is already in use.',
        stopping: 'The image server could not stop. Check that Docker is running, then retry Stop.',
      };
      set('error', error.message === 'image-owner-conflict' ? 'Another installation owns this image service. Resolve it before continuing.' : guidance[state.phase] || 'The image operation failed. Refresh the setup checks and resolve the reported issues before retrying.');
      return completed();
    } finally { state.busy = false; }
  }
  async function refresh() {
    if (state.busy || !['stopped', 'installed', 'loading', 'ready', 'unavailable', 'needs-restart'].includes(state.phase)) return status();
    const revision = epoch, priorPhase = state.phase;
    try {
      const setup = await adapters.readSetup();
      if (await adapters.verifyOwnership(setup.paths) !== true) throw new Error('ownership');
      const health = await adapters.probe(setup);
      if (revision !== epoch) return status();
      const expected = setup.model;
      const matches = health?.status === 'ok' && health.backend === 'sana-sprint' && health.model === expected.id
        && /^[a-f0-9]{40}$/.test(expected.revision || '') && health.revision === expected.revision
        && health.offline === true && health.device === 'cuda';
      if (matches && health.txt2img === true) {
        set('ready', 'SANA is available for image requests. A real test image is still needed to verify GPU operation.', { ready: true });
      } else if (matches) set('loading', 'Waiting for the selected SANA model to load…');
      else set('needs-restart', 'The server does not match the selected model revision, offline setting or GPU mode. Check setup, then stop and start it again.');
    } catch (_) {
      // Discovery is optional before the first setup/start; absence must not block Prepare.
      if (revision === epoch && !['stopped', 'installed'].includes(priorPhase)) {
        set('unavailable', 'The image server is not responding yet. Check setup or stop and retry.');
      }
    }
    return status();
  }
  return Object.freeze({ status, install: () => operation('install'), repair: () => operation('install'), start: () => operation('start'), stop: () => operation('stop'), refresh });
}

module.exports = { composePlan, preflight, createLocalImageManager };
