(function () {
  'use strict';

  const state = {
    config: null,
    health: null,
    app: null,
    appLogs: [],
    appFocusMode: false,
    providers: [],
    update: null,
    liveSession: null,
    voice: {
      status: 'unchecked',
      detail: 'Open the bundled app view, then check voice status.',
      quality: '',
      voices: 0,
    },
    schoolBox: null,
    schoolBoxLogs: [],
    lanDiagnostics: null,
  };

  const SETUP_SNOOZE_KEY = 'alloflow_desktop_key_setup_snoozed';
  const BUNDLED_AI_CONFIG_KEY = 'alloflow_ai_config';
  const BUNDLED_LIVE_SESSION_CONFIG_KEY = 'alloflow_live_session_config';
  const APP_FOCUS_IDLE_MS = 2200;
  const PROVIDER_BACKENDS = {
    gemini: 'gemini',
    lmstudio: 'lmstudio',
    localai: 'localai',
    custom: 'custom',
    ollama: 'ollama',
    'alloflow-local': 'alloflow-local',
  };
  const TEXT_MODEL_HINTS = ['qwen', 'llama', 'mistral', 'gemma', 'phi', 'deepseek', 'mixtral', 'command'];
  const NON_TEXT_MODEL_HINTS = ['moondream', 'llava', 'bakllava', 'vision', 'clip', 'image', 'stable-diffusion', 'sdxl'];
  const LIVE_SESSION_LABELS = {
    'schoolbox-lan': 'School Box / Local Network',
    'local-preview': 'Local Preview Only',
    'district-server': 'District Server',
    'byo-firebase': 'Bring Your Own Firebase',
    'alloflow-demo-cloud': 'AlloFlow Demo Cloud',
  };

  let appFocusIdleTimer = null;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const body = await response.json();
    if (!response.ok) {
      const error = new Error(body.error || response.statusText);
      error.body = body;
      throw error;
    }
    return body;
  }

  function setText(selector, value) {
    const node = $(selector);
    if (node) node.textContent = value == null || value === '' ? '-' : String(value);
  }

  function selectPane(name) {
    $$('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === name));
    $$('.pane').forEach((pane) => pane.classList.toggle('active', pane.id === 'pane-' + name));
  }

  function providerById(id) {
    return state.providers.find((provider) => provider.id === id);
  }

  function selectedProvider() {
    return providerById(state.config?.selectedProvider) || state.providers.find((provider) => provider.selected);
  }

  function providerNeedsKey(provider) {
    return Boolean(provider && provider.group === 'cloud' && !provider.hasKey);
  }

  function providerModelNames(provider) {
    return Array.isArray(provider?.models)
      ? provider.models.map((model) => String(model || '').trim()).filter(Boolean)
      : [];
  }

  function pickTextModel(provider) {
    const models = providerModelNames(provider);
    if (!models.length) return '';
    const textModels = models.filter((model) => {
      const lower = model.toLowerCase();
      return !NON_TEXT_MODEL_HINTS.some((hint) => lower.includes(hint));
    });
    const candidates = textModels.length ? textModels : models;
    return candidates.find((model) => {
      const lower = model.toLowerCase();
      return TEXT_MODEL_HINTS.some((hint) => lower.includes(hint));
    }) || candidates[0];
  }

  function pickVisionModel(provider, textModel) {
    const models = providerModelNames(provider);
    return models.find((model) => {
      const lower = model.toLowerCase();
      return lower.includes('moondream') || lower.includes('llava') || lower.includes('vision');
    }) || textModel || '';
  }

  function buildProviderModels(provider, previousModels = {}) {
    const textModel = pickTextModel(provider);
    const models = { ...(previousModels || {}) };
    if (!textModel) return models;
    ['default', 'fallback', 'flash', 'quality', 'safety'].forEach((slot) => {
      models[slot] = textModel;
    });
    models.vision = pickVisionModel(provider, textModel);
    return models;
  }

  function keyableProviders() {
    const cloudProviders = state.providers.filter((provider) => provider.group === 'cloud');
    return cloudProviders.length ? cloudProviders : state.providers;
  }

  function renderHealth() {
    if (!state.health) return;
    const pill = $('#runtime-pill');
    pill.textContent = state.health.status === 'ok' ? 'Runtime ready' : 'Runtime issue';
    pill.classList.toggle('ok', state.health.status === 'ok');

    const appManager = state.app || state.health.appManager || {};
    const appStatus = state.health.appReachable
      ? 'Connected to ' + state.health.appUrl + ' (' + (appManager.status || 'reachable') + ')'
      : 'Waiting for ' + state.health.appUrl;
    setText('#app-status', appStatus);
    $('#app-url').value = state.health.appUrl || '';
    $('#open-app-link').href = state.health.appUrl || '#';
    $('#app-frame').src = state.health.appReachable ? state.health.appUrl : 'about:blank';
    setText('#app-managed-status', appManager.status);
    setText('#app-owner', appManager.pid ? 'Desktop' : (appManager.reachable ? 'External' : 'None'));
    setText('#app-pid', appManager.pid);
    $('#start-app').disabled = appManager.status === 'managed-running';
    $('#stop-app').disabled = !appManager.pid;

    setText('#runtime-version', state.health.version);
    setText('#runtime-data-dir', state.health.dataDir);
    setText('#runtime-config-path', state.health.configPath);
    setText('#runtime-command-dir', state.health.commandCenterDir);
  }

  function renderAppLogs() {
    const logNode = $('#app-logs');
    if (!logNode) return;
    const lines = (state.appLogs || []).slice(-80).map((entry) => `[${entry.at}] ${entry.line}`);
    logNode.textContent = lines.length ? lines.join('\n') : 'No Desktop-managed app logs yet.';
  }

  function renderProviderSelect() {
    const select = $('#provider-select');
    select.innerHTML = '';
    state.providers.forEach((provider) => {
      const option = document.createElement('option');
      option.value = provider.id;
      option.textContent = provider.label;
      select.appendChild(option);
    });
    select.value = state.config?.selectedProvider || 'gemini';
    renderProviderEditor();
  }

  function renderSetupProviderSelect() {
    const select = $('#setup-provider-select');
    if (!select) return;
    select.innerHTML = '';
    keyableProviders().forEach((provider) => {
      const option = document.createElement('option');
      option.value = provider.id;
      option.textContent = provider.label;
      select.appendChild(option);
    });
    const provider = selectedProvider();
    select.value = providerNeedsKey(provider) ? provider.id : 'gemini';
    renderSetupCopy();
  }

  function renderSetupCopy() {
    const provider = providerById($('#setup-provider-select')?.value) || selectedProvider();
    if (!provider) return;
    setText('#api-key-title', 'Connect ' + provider.label);
    setText('#api-key-copy', 'Add your API key to enable cloud AI features in this desktop copy.');
  }

  function renderProviderEditor() {
    const provider = providerById($('#provider-select').value);
    if (!provider) return;
    $('#provider-base-url').value = provider.baseUrl || '';
    $('#provider-api-key').value = '';
    $('#provider-result').textContent = provider.hasKey ? 'API key saved to Desktop secure storage.' : '';
  }

  function renderProviders() {
    const list = $('#provider-list');
    list.innerHTML = '';
    state.providers.forEach((provider) => {
      const row = document.createElement('div');
      row.className = 'provider-row' + (provider.selected ? ' selected' : '');

      const info = document.createElement('div');
      info.innerHTML = [
        '<div class="provider-title">',
        '<strong></strong>',
        '<small></small>',
        '</div>',
        '<small></small>',
      ].join('');
      info.querySelector('strong').textContent = provider.label;
      info.querySelector('.provider-title small').textContent = provider.protocol;
      const textModel = pickTextModel(provider);
      info.lastElementChild.textContent = [
        provider.baseUrl,
        provider.modelCount ? provider.modelCount + ' model(s)' : '',
        textModel ? 'text: ' + textModel : '',
      ].filter(Boolean).join(' - ');

      const status = document.createElement('span');
      status.className = 'status ' + (provider.status || 'unknown');
      status.textContent = provider.status || 'unknown';

      const action = document.createElement('button');
      action.type = 'button';
      action.textContent = provider.selected ? 'Selected' : 'Use';
      action.className = provider.selected ? 'primary' : '';
      action.disabled = provider.selected;
      action.addEventListener('click', async () => {
        await saveConfig({ selectedProvider: provider.id });
        syncBundledAppAiConfig(provider, '', provider.baseUrl);
        await refresh();
        reloadAppFrame();
      });

      row.append(info, status, action);
      list.appendChild(row);
    });

    const availableCount = state.providers.filter((provider) => provider.status === 'available' || provider.status === 'configured').length;
    setText('#ai-status', availableCount + ' provider(s) ready');
  }

  function schoolBoxStatusCopy(status) {
    const labels = {
      disabled: 'Host disabled',
      'missing-stack': 'Stack files missing',
      'missing-app-build': 'App build missing',
      'needs-setup': 'Ready to prepare',
      'needs-docker': 'Docker needed',
      'district-planned': 'District mode planned',
      running: 'Host running',
      partial: 'Partially running',
      ready: 'Ready',
    };
    return labels[status] || status || 'Checking';
  }

  function renderSchoolBoxNextActions(actions) {
    const list = $('#schoolbox-next-actions');
    if (!list) return;
    list.innerHTML = '';
    (actions || []).forEach((action) => {
      const item = document.createElement('li');
      item.textContent = action;
      list.appendChild(item);
    });
    if (!list.children.length) {
      const item = document.createElement('li');
      item.textContent = 'School Box is ready for the next step.';
      list.appendChild(item);
    }
  }

  function renderSchoolBoxServices(services) {
    const list = $('#schoolbox-services');
    if (!list) return;
    list.innerHTML = '';
    (services || []).forEach((service) => {
      const row = document.createElement('div');
      row.className = 'service-row' + (service.reachable ? ' running' : '') + (service.optional ? ' optional' : '');
      const name = document.createElement('div');
      name.innerHTML = '<strong></strong><small></small>';
      name.querySelector('strong').textContent = service.label;
      name.querySelector('small').textContent = service.url || (service.port ? 'port ' + service.port : '');
      const status = document.createElement('span');
      status.className = 'status ' + (service.reachable ? 'available' : 'offline');
      status.textContent = service.reachable ? 'running' : (service.optional ? 'optional' : 'offline');
      row.append(name, status);
      list.appendChild(row);
    });
    if (!list.children.length) {
      list.textContent = 'No services checked yet.';
    }
  }

  function renderSchoolBoxLogs() {
    const logNode = $('#schoolbox-logs');
    if (!logNode) return;
    const lines = (state.schoolBoxLogs || []).slice(-100).map((entry) => `[${entry.at}] ${entry.line}`);
    logNode.textContent = lines.length ? lines.join('\n') : 'No School Box logs yet.';
  }

  function renderSchoolBoxGuide(status) {
    const list = $('#schoolbox-setup-guide');
    if (!list) return;
    const current = status?.status || 'checking';
    const stackReady = Boolean(status?.stack?.stackAvailable);
    const envReady = Boolean(status?.stack?.envExists);
    const dockerReady = Boolean(status?.docker?.available);
    const running = current === 'running';
    const district = current === 'district-planned';
    const steps = [
      {
        title: 'Choose Desktop Host',
        detail: district ? 'District Server is planned for later; Desktop Host runs today on this computer.' : 'Use Desktop Host for the local School Box stack.',
        state: district ? 'blocked' : 'done',
      },
      {
        title: 'Prepare settings',
        detail: stackReady ? 'Create or refresh the local School Box settings file.' : 'The School Box stack files are missing from this build.',
        state: !stackReady ? 'blocked' : (envReady ? 'done' : 'current'),
      },
      {
        title: 'Start local services',
        detail: dockerReady ? 'Start the app, database, local AI, voice, and search services.' : 'Install and start Docker Desktop first.',
        state: !envReady ? 'blocked' : (running ? 'done' : (dockerReady ? 'current' : 'blocked')),
      },
      {
        title: 'Open School Box',
        detail: 'Open the local classroom host once all required services are running.',
        state: running ? 'current' : 'blocked',
      },
    ];
    list.innerHTML = '';
    steps.forEach((step) => {
      const item = document.createElement('li');
      item.className = step.state;
      const body = document.createElement('div');
      const title = document.createElement('strong');
      const detail = document.createElement('small');
      title.textContent = step.title;
      detail.textContent = step.detail;
      body.append(title, detail);
      item.appendChild(body);
      list.appendChild(item);
    });
  }

  function renderSchoolBox() {
    const status = state.schoolBox || {};
    const box = status.schoolBox || state.config?.schoolBox || {};
    const stack = status.stack || {};
    const docker = status.docker || {};
    const url = status.url || ('http://' + (box.host || '127.0.0.1') + ':' + (box.port || 32174));
    const isDistrictMode = box.mode === 'district-server';
    setText('#schoolbox-mode', box.mode);
    setText('#schoolbox-address', url);
    setText('#schoolbox-embedded', box.embedded ? 'yes' : 'no');
    setText('#schoolbox-state', schoolBoxStatusCopy(status.status));
    setText('#schoolbox-docker', isDistrictMode ? 'not used' : (docker.available ? 'ready' : (docker.error || 'not found')));
    setText('#schoolbox-stack', stack.stackAvailable ? (stack.source || 'ready') : 'missing');
    setText('#schoolbox-env', stack.envExists ? 'ready' : 'needs prepare');
    setText('#schoolbox-status', schoolBoxStatusCopy(status.status));
    $('#schoolbox-mode-select').value = box.mode || 'desktop-host';
    $('#schoolbox-port').value = box.port || 32174;
    $('#schoolbox-include-gpu').checked = Boolean(box.includeGpu);
    $('#open-schoolbox-link').href = url;
    $('#setup-schoolbox').disabled = isDistrictMode || !stack.stackAvailable;
    $('#start-schoolbox').disabled = isDistrictMode || box.mode === 'disabled' || status.status === 'missing-app-build' || !stack.stackAvailable || !docker.available;
    $('#stop-schoolbox').disabled = !(status.services || []).some((service) => service.reachable);
    renderSchoolBoxNextActions(status.nextActions || []);
    renderSchoolBoxGuide(status);
    renderSchoolBoxServices(status.services || []);
    renderSchoolBoxLogs();
  }

  function renderList(selector, items, emptyText) {
    const list = $(selector);
    if (!list) return;
    list.innerHTML = '';
    (items || []).forEach((text) => {
      const item = document.createElement('li');
      item.textContent = text;
      list.appendChild(item);
    });
    if (!list.children.length && emptyText) {
      const item = document.createElement('li');
      item.textContent = emptyText;
      list.appendChild(item);
    }
  }

  function joiningCopy(liveSession) {
    if (!liveSession) return '-';
    if (liveSession.mode === 'schoolbox-lan') {
      return liveSession.lanBridge?.enabled
        ? (liveSession.lanBridge.reachableFromOtherDevices ? 'LAN bridge ready' : 'Local bridge ready')
        : 'Start School Box first';
    }
    if (liveSession.mode === 'local-preview') return 'This device only';
    if (liveSession.mode === 'district-server') return 'Future district mode';
    if (liveSession.mode === 'byo-firebase') return 'Shared through school Firebase';
    if (liveSession.mode === 'alloflow-demo-cloud') return 'Demo only';
    return '-';
  }

  function renderLiveSession() {
    const liveSession = state.liveSession || state.health?.liveSession || state.config?.liveSession || {};
    const mode = liveSession.mode || 'schoolbox-lan';
    const lanShare = liveSession.lanBridge?.share || {};
    setText('#live-session-mode', liveSession.label || LIVE_SESSION_LABELS[mode] || mode);
    setText('#live-session-location', liveSession.dataLocation || '-');
    setText('#live-session-cloud', liveSession.firestoreAllowed ? 'allowed' : 'blocked');
    setText('#live-session-joining', joiningCopy(liveSession));
    setText('#live-session-lan', liveSession.lanBridge?.enabled ? `${liveSession.lanBridge.activeSessions || 0} active${lanShare.active ? ' (shared)' : ' (local only)'}` : 'off');
    const joinBase = lanShare.joinBaseUrls?.[0] || liveSession.lanBridge?.joinBaseUrls?.find((url) => !url.includes('127.0.0.1')) || liveSession.lanBridge?.joinBaseUrls?.[0] || '-';
    setText('#live-session-join-base', joinBase);
    const startLanShare = $('#start-lan-share');
    const stopLanShare = $('#stop-lan-share');
    if (startLanShare) startLanShare.disabled = mode !== 'schoolbox-lan' || Boolean(lanShare.active);
    if (stopLanShare) stopLanShare.disabled = !lanShare.active;
    const modeSelect = $('#live-session-mode-select');
    if (modeSelect) modeSelect.value = mode;
    renderList('#live-session-next-actions', [
      ...(liveSession.warnings || []),
      ...(liveSession.nextActions || []),
    ], 'Live-session routing is ready.');
    const result = $('#live-session-result');
    if (result) {
      result.textContent = lanShare.active
        ? `LAN sharing is active at ${joinBase}`
        : liveSession.firestoreAllowed
        ? 'Cloud session creation is explicitly enabled for this mode.'
        : 'Cloud session creation is blocked for desktop live classes in this mode.';
    }
  }

  async function saveConfig(patch) {
    state.config = await api('/api/config', {
      method: 'POST',
      body: JSON.stringify(patch),
    });
    return state.config;
  }

  // ── Classroom join tools (QR / PIN / presenter / diagnostics) ──────
  function classroomJoinBase() {
    const diag = state.lanDiagnostics || {};
    const bases = diag.joinBaseUrls || state.liveSession?.lanBridge?.joinBaseUrls || [];
    return bases.find((url) => !url.includes('127.0.0.1')) || bases[0] || '';
  }

  function classroomCode() {
    const input = $('#presenter-code');
    return input ? input.value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') : '';
  }

  function classroomJoinUrl() {
    const base = classroomJoinBase();
    const code = classroomCode();
    return base && code ? base + code : '';
  }

  function renderJoinQr() {
    const target = $('#join-qr');
    if (!target) return;
    const joinUrl = classroomJoinUrl();
    if (!joinUrl || typeof qrcode !== 'function') {
      target.hidden = true;
      target.innerHTML = '';
      return;
    }
    try {
      const qr = qrcode(0, 'M');
      qr.addData(joinUrl);
      qr.make();
      target.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 0, scalable: true });
      target.hidden = false;
    } catch (error) {
      target.textContent = 'QR unavailable: ' + error.message;
      target.hidden = false;
    }
  }

  function renderLanClassroom() {
    const diag = state.lanDiagnostics || {};
    const pinInput = $('#lan-pin');
    if (pinInput && document.activeElement !== pinInput) {
      pinInput.value = state.config?.liveSession?.lan?.pin || '';
    }
    const joinUrl = classroomJoinUrl();
    const linkNode = $('#join-link');
    if (linkNode) linkNode.textContent = joinUrl || (classroomCode() ? 'Start LAN Share to get a join link.' : '');
    const presenter = $('#open-presenter');
    if (presenter) {
      const code = classroomCode();
      if (code) {
        presenter.href = '/present/' + encodeURIComponent(code);
        presenter.removeAttribute('aria-disabled');
      } else {
        presenter.removeAttribute('href');
        presenter.setAttribute('aria-disabled', 'true');
      }
    }
    const items = [...(diag.warnings || []), ...(diag.notes || [])];
    renderList('#lan-diagnostics', items, 'Network diagnostics appear here once the runtime is reachable.');
    if (!$('#join-qr')?.hidden) renderJoinQr();
  }

  // ── Classroom setup wizard (local-first mode) ───────────────────────
  function renderClassroomWizard() {
    const node = $('#classroom-wizard');
    if (!node) return;
    const liveSession = state.liveSession || {};
    const mode = liveSession.mode || state.config?.liveSession?.mode || '';
    const shareActive = Boolean(liveSession.lanBridge?.share?.active || state.lanDiagnostics?.share?.active);
    const pinConfigured = Boolean(state.lanDiagnostics?.pinConfigured || state.config?.liveSession?.lan?.pin);
    const steps = [
      {
        done: mode === 'schoolbox-lan',
        title: 'Choose the local classroom backend',
        detail: mode === 'schoolbox-lan'
          ? 'School Box / Local Network mode is on — class data stays on this computer.'
          : 'Pick “School Box / Local Network” in Live Sessions and press Save. This keeps class data off the cloud.',
      },
      {
        done: shareActive,
        title: 'Start LAN Share (and set a PIN if you want one)',
        detail: shareActive
          ? 'Students on this network can reach the join page.' + (pinConfigured ? ' A join PIN is set.' : ' Tip: a join PIN keeps drop-ins out on busy networks.')
          : 'Press Start LAN Share. Set a Join PIN first if you want one — it latches when sharing starts.',
      },
      {
        done: false,
        title: 'Put the class code on the projector',
        detail: 'Type your class code above, then open Presenter view — students scan the QR or type the link. Run “classroom check” below to confirm the network path.',
      },
    ];
    node.innerHTML = '';
    steps.forEach((step) => {
      const item = document.createElement('li');
      if (step.done) item.classList.add('done');
      const title = document.createElement('strong');
      title.textContent = step.title;
      const detail = document.createElement('div');
      detail.textContent = step.detail;
      item.append(title, detail);
      node.append(item);
    });
  }

  async function runClassroomCheck() {
    const result = $('#classroom-check-result');
    if (result) result.textContent = 'Checking...';
    const lines = [];
    try {
      const diag = await api('/api/lan-share/diagnostics');
      state.lanDiagnostics = diag;
      lines.push((diag.addresses || []).length
        ? `Network: OK (${diag.addresses.join(', ')})`
        : 'Network: NO LAN address found — connect to the school network.');
      lines.push(diag.share?.active
        ? `LAN Share: ACTIVE on port ${diag.share.port}${diag.pinActive ? ' with join PIN' : ' (no PIN)'}`
        : 'LAN Share: OFF — students cannot join from other devices yet.');
      const joinUrl = classroomJoinUrl();
      if (joinUrl) {
        lines.push('Join link: ' + joinUrl);
      } else if (classroomCode()) {
        lines.push('Join link: unavailable — start LAN Share first.');
      } else {
        lines.push('Type a class code above to get a join link and QR.');
      }
      (diag.warnings || []).forEach((warning) => lines.push('Warning: ' + warning));
    } catch (error) {
      lines.push('Check failed: ' + error.message);
    }
    if (result) result.textContent = lines.join('\n');
    renderLanClassroom();
    renderClassroomWizard();
  }

  function readBundledAppAiConfig() {
    try {
      return JSON.parse(localStorage.getItem(BUNDLED_AI_CONFIG_KEY) || 'null') || {};
    } catch (_) {
      return {};
    }
  }

  function syncBundledAppAiConfig(provider, apiKey = '', baseUrl = '') {
    if (!provider) return false;
    try {
      const previous = readBundledAppAiConfig();
      const backend = PROVIDER_BACKENDS[provider.id] || provider.protocol || provider.id;
      const isCloud = provider.group === 'cloud';
      localStorage.setItem(BUNDLED_AI_CONFIG_KEY, JSON.stringify({
        ...previous,
        providerId: provider.id,
        backend,
        baseUrl: baseUrl || provider.baseUrl || '',
        apiKey: '',
        keySource: isCloud && (apiKey || provider.hasKey) ? 'desktop-secure-storage' : '',
        models: isCloud ? (previous.models || {}) : buildProviderModels(provider, previous.models),
        updatedAt: new Date().toISOString(),
        source: 'alloflow-desktop',
      }));
      return true;
    } catch (_) {
      // Best effort only; the runtime config remains the source of truth.
      return false;
    }
  }

  function syncBundledAppLiveSessionConfig() {
    const liveSession = state.liveSession || state.health?.liveSession || state.config?.liveSession;
    if (!liveSession) return false;
    try {
      localStorage.setItem(BUNDLED_LIVE_SESSION_CONFIG_KEY, JSON.stringify({
        mode: liveSession.mode || 'schoolbox-lan',
        label: liveSession.label || LIVE_SESSION_LABELS[liveSession.mode] || liveSession.mode,
        dataLocation: liveSession.dataLocation || '',
        firestoreAllowed: Boolean(liveSession.firestoreAllowed || liveSession.cloudSessionAllowed),
        cloudSessionAllowed: Boolean(liveSession.cloudSessionAllowed || liveSession.firestoreAllowed),
        lanApiBase: liveSession.lanBridge?.localBaseUrl || '',
        lanJoinBaseUrls: liveSession.lanBridge?.joinBaseUrls || [],
        lanBridgeEnabled: Boolean(liveSession.lanBridge?.enabled),
        lanShareActive: Boolean(liveSession.lanBridge?.share?.active),
        schoolBoxUrl: liveSession.schoolBox?.url || state.schoolBox?.url || '',
        schoolBoxStatus: liveSession.schoolBox?.status || state.schoolBox?.status || '',
        warnings: Array.isArray(liveSession.warnings) ? liveSession.warnings : [],
        nextActions: Array.isArray(liveSession.nextActions) ? liveSession.nextActions : [],
        source: 'alloflow-desktop',
        updatedAt: new Date().toISOString(),
      }));
      return true;
    } catch (_) {
      return false;
    }
  }

  function syncSelectedProviderForBundledApp() {
    const provider = selectedProvider();
    if (!provider || providerNeedsKey(provider)) return false;
    return syncBundledAppAiConfig(provider, '', provider.baseUrl);
  }

  function reloadAppFrame() {
    const frame = $('#app-frame');
    if (!frame || !state.health?.appUrl) return;
    frame.src = 'about:blank';
    setTimeout(() => {
      frame.src = state.health.appUrl;
    }, 30);
  }

  function getBundledAppWindow() {
    const frame = $('#app-frame');
    if (!frame || !frame.contentWindow) return null;
    try {
      const href = frame.contentWindow.location.href;
      if (!href || href === 'about:blank') return null;
      if (new URL(href).origin !== window.location.origin) return null;
      return frame.contentWindow;
    } catch (_) {
      return null;
    }
  }

  function setVoiceState(patch) {
    state.voice = {
      ...(state.voice || {}),
      ...(patch || {}),
    };
    renderVoiceStatus();
  }

  function renderVoiceStatus() {
    const voice = state.voice || {};
    setText('#voice-status', voice.status || 'unchecked');
    setText('#voice-quality', voice.quality || '-');
    setText('#voice-count', voice.voices || '-');
    const result = $('#voice-result');
    if (result && voice.detail) result.textContent = voice.detail;
    const download = $('#download-kokoro');
    if (download) download.disabled = voice.status === 'loading' || voice.status === 'ready';
  }

  function inspectKokoroVoice() {
    const appWindow = getBundledAppWindow();
    if (!appWindow) {
      setVoiceState({
        status: 'bundled app needed',
        detail: 'Voice preload is available when the preview is using the bundled /app/ address.',
        quality: '',
        voices: 0,
      });
      return;
    }

    const kokoro = appWindow._kokoroTTS;
    if (kokoro?.ready) {
      setVoiceState({
        status: 'ready',
        detail: 'Kokoro is ready on this device.',
        quality: kokoro.quality || 'fast',
        voices: Array.isArray(kokoro.voices) ? kokoro.voices.length : 0,
      });
      return;
    }

    if (kokoro) {
      const pct = Math.round((kokoro.progress || 0) * 100);
      setVoiceState({
        status: pct > 0 ? 'loading' : 'available',
        detail: pct > 0 ? `Kokoro model load is ${pct}% complete.` : 'Kokoro loader is present but the model has not been initialized yet.',
        quality: kokoro.quality || 'fast',
        voices: Array.isArray(kokoro.voices) ? kokoro.voices.length : 0,
      });
      return;
    }

    setVoiceState({
      status: typeof appWindow.__loadKokoroTTS === 'function' ? 'available' : 'waiting',
      detail: typeof appWindow.__loadKokoroTTS === 'function'
        ? 'Kokoro can be downloaded and cached now.'
        : 'Waiting for the AlloFlow app to finish loading its voice hooks.',
      quality: '',
      voices: 0,
    });
  }

  function injectKokoroLoader(appWindow) {
    return new Promise((resolve, reject) => {
      if (appWindow._kokoroTTS) {
        resolve(true);
        return;
      }
      const doc = appWindow.document;
      if (!doc?.head) {
        reject(new Error('The bundled app document is not ready yet.'));
        return;
      }
      const script = doc.createElement('script');
      script.src = './kokoro_tts_loader.js?v=desktop-preload';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Kokoro loader file could not be loaded from the bundled app.'));
      doc.head.appendChild(script);
    });
  }

  async function downloadKokoroVoice() {
    const appWindow = getBundledAppWindow();
    if (!appWindow) {
      setVoiceState({
        status: 'bundled app needed',
        detail: 'Switch the app URL to the bundled /app/ address, then try again.',
      });
      return;
    }

    if (appWindow._kokoroTTS?.ready) {
      inspectKokoroVoice();
      return;
    }

    if (appWindow.__alloflowDesktopKokoroDownload) {
      await appWindow.__alloflowDesktopKokoroDownload;
      inspectKokoroVoice();
      return;
    }

    setVoiceState({
      status: 'loading',
      detail: 'Starting Kokoro voice model download...',
      quality: 'fast',
    });

    const onProgress = (progress) => {
      const pct = Math.round(((progress && progress.pct) || 0) * 100);
      const stage = (progress && progress.stage) || 'Downloading voice model';
      setVoiceState({
        status: 'loading',
        detail: `${stage} - ${pct}%`,
        quality: appWindow._kokoroTTS?.quality || 'fast',
        voices: Array.isArray(appWindow._kokoroTTS?.voices) ? appWindow._kokoroTTS.voices.length : 0,
      });
    };

    appWindow.__alloflowDesktopKokoroDownload = (async () => {
      if (typeof appWindow.__loadKokoroTTS === 'function') {
        await appWindow.__loadKokoroTTS(onProgress);
        return true;
      }
      await injectKokoroLoader(appWindow);
      if (!appWindow._kokoroTTS?.init) throw new Error('Kokoro loader did not register correctly.');
      await appWindow._kokoroTTS.init(onProgress);
      return true;
    })();

    try {
      await appWindow.__alloflowDesktopKokoroDownload;
      inspectKokoroVoice();
    } catch (error) {
      setVoiceState({
        status: 'error',
        detail: error.message || 'Kokoro download failed.',
      });
    } finally {
      appWindow.__alloflowDesktopKokoroDownload = null;
    }
  }

  // ── Built-in AI Engine (managed llama-server) ──────────────────────────────
  let enginePollTimer = null;
  function renderEngineStatus(status) {
    if (!status) return;
    let phase = status.phase || 'stopped';
    if (status.download && status.download.totalBytes) {
      const pct = Math.round((status.download.receivedBytes / status.download.totalBytes) * 100);
      phase += ' — ' + status.download.file + ' ' + pct + '%';
    }
    setText('#engine-phase', phase);
    setText('#engine-model', status.model
      ? (status.model.name || 'not set') + (status.model.present ? ' (downloaded)' : ' (will download)')
      : '-');
    setText('#engine-disk', status.diskFreeBytes != null ? (status.diskFreeBytes / 1073741824).toFixed(1) + ' GB' : '-');
    const result = $('#engine-result');
    if (result) {
      if (status.lastError) result.textContent = status.lastError;
      else if (status.advisory) result.textContent = status.advisory;
      else if (status.running) result.textContent = 'Running (' + (status.arch || '?') + ') at ' + status.baseUrl + '. Select the "AlloFlow Built-in Engine" provider to use it.';
    }
  }
  async function refreshEngineStatus() {
    const status = await api('/api/engine/status');
    renderEngineStatus(status);
    const modelSelect = $('#engine-model-select');
    if (modelSelect && status.engine && status.engine.modelUrl) {
      const match = Array.from(modelSelect.options).find((option) => option.value === status.engine.modelUrl);
      if (match) modelSelect.value = status.engine.modelUrl;
    }
    const dirInput = $('#engine-model-dir');
    if (dirInput && document.activeElement !== dirInput && status.engine) {
      dirInput.value = status.engine.modelDirectory || '';
    }
    return status;
  }
  async function changeEngineModel(event) {
    const result = $('#engine-result');
    let modelUrl = event.target.value;
    if (modelUrl === '__custom') {
      modelUrl = window.prompt('Paste a direct .gguf download URL, or the full path to a .gguf file (for example on a USB drive):', '');
      if (!modelUrl || !modelUrl.trim()) { refreshEngineStatus().catch(() => {}); return; }
      modelUrl = modelUrl.trim();
    }
    try {
      await api('/api/config', { method: 'POST', body: JSON.stringify({ localEngine: { modelUrl } }) });
      if (result) {
        result.textContent = /^https?:\/\//i.test(modelUrl)
          ? 'Model choice saved. It downloads on the next engine start (stop + start to switch now). Earlier models stay on disk until you delete them from the engine folder.'
          : 'Local model file saved: ' + modelUrl + ' — used in place, nothing downloads. Keep the drive connected while the engine runs.';
      }
      await refreshEngineStatus();
    } catch (error) {
      if (result) result.textContent = error.message || 'Could not save the model choice.';
    }
  }
  async function saveEngineModelDir() {
    const result = $('#engine-result');
    const input = $('#engine-model-dir');
    try {
      await api('/api/config', { method: 'POST', body: JSON.stringify({ localEngine: { modelDirectory: (input && input.value ? input.value.trim() : '') } }) });
      if (result) result.textContent = 'Model folder saved. New downloads land there on the next engine start; already-downloaded models stay where they are.';
      await refreshEngineStatus();
    } catch (error) {
      if (result) result.textContent = error.message || 'Could not save the model folder.';
    }
  }
  function pollEngineUntilSettled() {
    if (enginePollTimer) clearInterval(enginePollTimer);
    enginePollTimer = setInterval(async () => {
      try {
        const status = await refreshEngineStatus();
        if (status.running || status.phase === 'error' || status.phase === 'stopped') {
          clearInterval(enginePollTimer);
          enginePollTimer = null;
        }
      } catch (_) { /* runtime briefly busy — keep polling */ }
    }, 2000);
  }
  async function startBuiltInEngine() {
    const result = $('#engine-result');
    if (result) result.textContent = 'Starting the built-in engine (first run downloads the engine + model, about 2 GB)...';
    try {
      renderEngineStatus(await api('/api/engine/start', { method: 'POST' }));
      pollEngineUntilSettled();
    } catch (error) {
      if (result) result.textContent = error.message || 'Engine start failed.';
    }
  }
  async function stopBuiltInEngine() {
    try {
      renderEngineStatus(await api('/api/engine/stop', { method: 'POST' }));
    } catch (error) {
      const result = $('#engine-result');
      if (result) result.textContent = error.message || 'Engine stop failed.';
    }
  }

  function updateStatusCopy(update) {
    if (!update) return 'Unavailable';
    if (!update.configured) return update.message || 'Updates are not configured for this build.';
    if (update.checking) return 'Checking';
    if (update.downloading) {
      const pct = update.progress?.percent != null ? ` (${Math.round(update.progress.percent)}%)` : '';
      return 'Downloading' + pct;
    }
    if (update.downloaded) return 'Ready to install';
    if (update.available) return 'Update available';
    return update.message || 'Up to date';
  }

  function renderUpdateStatus() {
    const update = state.update || {};
    setText('#update-current-version', update.currentVersion || state.health?.version);
    setText('#update-available-version', update.availableVersion || '-');
    setText('#update-status', updateStatusCopy(update));
    setText('#update-channel', update.channel || '-');
    setText('#update-platform', [update.platform, update.arch].filter(Boolean).join(' / ') || '-');
    setText('#update-feed', update.feed || update.provider || '-');
    const channelSelect = $('#update-channel-select');
    if (channelSelect) channelSelect.value = update.channel === 'beta' ? 'beta' : 'latest';
    const result = $('#update-result');
    if (result) {
      result.textContent = [
        update.message || '',
        update.lastError ? 'Error: ' + update.lastError : '',
      ].filter(Boolean).join('\n') || 'No update activity yet.';
    }

    const canUseUpdater = Boolean(update.configured);
    $('#check-updates').disabled = !canUseUpdater || update.checking || update.downloading;
    $('#download-update').disabled = !canUseUpdater || !update.available || update.downloaded || update.downloading;
    $('#install-update').disabled = !canUseUpdater || !update.downloaded;
  }

  async function hydrateUpdateStatus() {
    if (!window.alloflowDesktop?.getUpdateStatus) {
      state.update = {
        configured: false,
        currentVersion: state.health?.version,
        message: 'Updates are available in the packaged desktop app.',
      };
      renderUpdateStatus();
      return;
    }
    state.update = await window.alloflowDesktop.getUpdateStatus();
    renderUpdateStatus();
  }

  async function runUpdateAction(action, pendingMessage) {
    if (!window.alloflowDesktop?.[action]) {
      state.update = {
        ...(state.update || {}),
        configured: false,
        message: 'Update controls are available in the packaged desktop app.',
      };
      renderUpdateStatus();
      return;
    }
    state.update = {
      ...(state.update || {}),
      message: pendingMessage,
    };
    renderUpdateStatus();
    try {
      state.update = await window.alloflowDesktop[action]();
    } catch (error) {
      state.update = {
        ...(state.update || {}),
        checking: false,
        downloading: false,
        lastError: error.message,
        message: error.message,
      };
    }
    renderUpdateStatus();
  }

  async function saveUpdateChannel() {
    const channel = $('#update-channel-select')?.value === 'beta' ? 'beta' : 'latest';
    if (window.alloflowDesktop?.setUpdateChannel) {
      state.update = await window.alloflowDesktop.setUpdateChannel(channel);
    } else {
      await saveConfig({ updates: { channel } });
      state.update = {
        ...(state.update || {}),
        channel,
        configured: false,
        message: 'Update channel saved. Packaged Desktop uses this for update checks.',
      };
    }
    renderUpdateStatus();
  }

  async function writeClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }

  async function copyDiagnostics() {
    const resultNode = $('#diagnostics-result');
    if (resultNode) resultNode.textContent = 'Collecting diagnostics...';
    try {
      const diagnostics = await api('/api/diagnostics');
      diagnostics.update = state.update || null;
      diagnostics.copiedAt = new Date().toISOString();
      await writeClipboard(JSON.stringify(diagnostics, null, 2));
      if (resultNode) resultNode.textContent = 'Copied redacted diagnostics to clipboard.';
    } catch (error) {
      if (resultNode) resultNode.textContent = error.message || 'Could not copy diagnostics.';
    }
  }

  function updateAppFocusControls() {
    const toggle = $('#toggle-app-focus');
    if (toggle) {
      toggle.textContent = state.appFocusMode ? 'Exit Full Screen' : 'Full Screen';
      toggle.setAttribute('aria-pressed', state.appFocusMode ? 'true' : 'false');
    }
  }

  function showAppFocusControls() {
    if (!state.appFocusMode) return;
    document.body.classList.add('app-focus-controls-visible');
    clearTimeout(appFocusIdleTimer);
    appFocusIdleTimer = setTimeout(() => {
      if (state.appFocusMode) {
        document.body.classList.remove('app-focus-controls-visible');
      }
    }, APP_FOCUS_IDLE_MS);
  }

  async function setAppFocusMode(enabled, options = {}) {
    const next = Boolean(enabled);
    state.appFocusMode = next;
    document.body.classList.toggle('app-focus-mode', next);
    if (next) selectPane('app');
    updateAppFocusControls();
    clearTimeout(appFocusIdleTimer);
    if (next) {
      showAppFocusControls();
    } else {
      document.body.classList.remove('app-focus-controls-visible');
    }

    if (options.syncWindow === false) return;

    try {
      if (window.alloflowDesktop?.setFullScreen) {
        await window.alloflowDesktop.setFullScreen(next);
        return;
      }
    } catch (_) {
      // Fall through to the browser fullscreen API or CSS-only focus mode.
    }

    try {
      if (next && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (!next && document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (_) {
      // CSS focus mode still provides an app-only layout.
    }
  }

  async function saveProviderSettings(id, baseUrl, apiKey) {
    const provider = {
      ...(providerById(id) || { id }),
      baseUrl: baseUrl || providerById(id)?.baseUrl || '',
    };
    await saveConfig({
      selectedProvider: id,
      providers: { [id]: { baseUrl } },
    });
    if (apiKey) {
      await api('/api/secrets/' + encodeURIComponent(id), {
        method: 'POST',
        body: JSON.stringify({ apiKey }),
      });
    }
    syncBundledAppAiConfig(provider, '', baseUrl);
  }

  function maybeShowApiKeySetup() {
    const modal = $('#api-key-setup');
    if (!modal) return;
    if (sessionStorage.getItem(SETUP_SNOOZE_KEY) === '1') {
      modal.classList.add('hidden');
      return;
    }

    const provider = selectedProvider();
    if (providerNeedsKey(provider)) {
      renderSetupProviderSelect();
      modal.classList.remove('hidden');
      setTimeout(() => $('#setup-api-key')?.focus(), 0);
    } else {
      modal.classList.add('hidden');
    }
  }

  async function refresh() {
    const [health, config, providerResponse, appResponse, logsResponse, schoolBoxResponse, schoolBoxLogsResponse, liveSessionResponse] = await Promise.all([
      api('/api/health'),
      api('/api/config'),
      api('/api/providers'),
      api('/api/app/status'),
      api('/api/app/logs'),
      api('/api/schoolbox/status'),
      api('/api/schoolbox/logs'),
      api('/api/live-session/status'),
    ]);
    state.health = health;
    state.config = config;
    state.providers = providerResponse.providers || [];
    state.app = appResponse.app || null;
    state.appLogs = logsResponse.logs || [];
    state.schoolBox = schoolBoxResponse || null;
    state.schoolBoxLogs = schoolBoxLogsResponse.logs || [];
    state.liveSession = liveSessionResponse || null;
    try {
      state.lanDiagnostics = await api('/api/lan-share/diagnostics');
    } catch (_) {
      state.lanDiagnostics = null;
    }
    syncSelectedProviderForBundledApp();
    syncBundledAppLiveSessionConfig();
    renderHealth();
    renderAppLogs();
    renderProviderSelect();
    renderSetupProviderSelect();
    renderProviders();
    renderVoiceStatus();
    renderSchoolBox();
    renderLiveSession();
    renderLanClassroom();
    renderClassroomWizard();
    maybeShowApiKeySetup();
  }

  function bindEvents() {
    $$('.tab').forEach((tab) => {
      tab.addEventListener('click', () => selectPane(tab.dataset.tab));
    });

    $('#refresh-all').addEventListener('click', refresh);
    $('#refresh-providers').addEventListener('click', refresh);
    $('#refresh-schoolbox').addEventListener('click', refresh);
    $('#check-voice').addEventListener('click', inspectKokoroVoice);
    $('#download-kokoro').addEventListener('click', downloadKokoroVoice);
    $('#engine-start').addEventListener('click', startBuiltInEngine);
    $('#engine-stop').addEventListener('click', stopBuiltInEngine);
    $('#engine-model-select').addEventListener('change', changeEngineModel);
    $('#engine-model-dir-save').addEventListener('click', saveEngineModelDir);
    refreshEngineStatus().catch(() => {});
    $('#app-frame').addEventListener('load', () => {
      setTimeout(inspectKokoroVoice, 800);
    });
    $('#check-updates').addEventListener('click', () => {
      runUpdateAction('checkForUpdates', 'Checking for updates...');
    });
    $('#download-update').addEventListener('click', () => {
      runUpdateAction('downloadUpdate', 'Downloading update...');
    });
    $('#install-update').addEventListener('click', () => {
      runUpdateAction('installUpdate', 'Installing update...');
    });
    $('#save-update-channel').addEventListener('click', saveUpdateChannel);
    $('#copy-diagnostics').addEventListener('click', copyDiagnostics);
    $('#toggle-app-focus').addEventListener('click', () => {
      setAppFocusMode(!state.appFocusMode);
    });
    $('#exit-app-focus').addEventListener('click', () => {
      setAppFocusMode(false);
    });
    $('#exit-app-focus').addEventListener('mouseenter', showAppFocusControls);
    $('#exit-app-focus').addEventListener('focus', showAppFocusControls);
    document.addEventListener('mousemove', showAppFocusControls, { passive: true });
    document.addEventListener('pointerdown', showAppFocusControls, { passive: true });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.appFocusMode) {
        setAppFocusMode(false);
      } else {
        showAppFocusControls();
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && state.appFocusMode) {
        setAppFocusMode(false, { syncWindow: false });
      }
    });

    if (window.alloflowDesktop?.onFullScreenChange) {
      window.alloflowDesktop.onFullScreenChange((enabled) => {
        setAppFocusMode(enabled, { syncWindow: false });
      });
    }

    if (window.alloflowDesktop?.onUpdateStatus) {
      window.alloflowDesktop.onUpdateStatus((update) => {
        state.update = update;
        renderUpdateStatus();
      });
    }

    $('#save-lan-pin')?.addEventListener('click', async () => {
      const pin = ($('#lan-pin')?.value || '').trim().slice(0, 32);
      await saveConfig({ liveSession: { lan: { pin } } });
      const hint = $('#lan-pin-hint');
      if (hint) {
        hint.textContent = pin
          ? 'PIN saved. It applies when LAN sharing (re)starts — stop and start sharing to use it now.'
          : 'PIN cleared. Restart LAN sharing to open the join page without a PIN.';
      }
      await refresh();
    });
    $('#presenter-code')?.addEventListener('input', () => {
      renderLanClassroom();
    });
    $('#show-join-qr')?.addEventListener('click', () => {
      const target = $('#join-qr');
      if (target && !target.hidden) {
        target.hidden = true;
        return;
      }
      renderJoinQr();
    });
    $('#copy-join-link')?.addEventListener('click', async () => {
      const joinUrl = classroomJoinUrl();
      const linkNode = $('#join-link');
      if (!joinUrl) {
        if (linkNode) linkNode.textContent = classroomCode() ? 'Start LAN Share to get a join link.' : 'Type a class code first.';
        return;
      }
      try {
        await writeClipboard(joinUrl);
        if (linkNode) linkNode.textContent = 'Copied: ' + joinUrl;
      } catch (_) {
        if (linkNode) linkNode.textContent = joinUrl;
      }
    });
    $('#open-presenter')?.addEventListener('click', (event) => {
      if (!classroomCode()) {
        event.preventDefault();
        const linkNode = $('#join-link');
        if (linkNode) linkNode.textContent = 'Type a class code first.';
      }
    });
    $('#run-classroom-check')?.addEventListener('click', runClassroomCheck);

    $('#save-app-url').addEventListener('click', async () => {
      await saveConfig({ appUrl: $('#app-url').value.trim() || 'http://localhost:3000' });
      await refresh();
    });

    $('#start-app').addEventListener('click', async () => {
      setText('#app-status', 'Starting AlloFlow app');
      await api('/api/app/start', { method: 'POST', body: '{}' });
      await refresh();
    });

    $('#stop-app').addEventListener('click', async () => {
      setText('#app-status', 'Stopping AlloFlow app');
      await api('/api/app/stop', { method: 'POST', body: '{}' });
      await refresh();
    });

    $('#provider-select').addEventListener('change', renderProviderEditor);
    $('#setup-provider-select').addEventListener('change', renderSetupCopy);
    $('#setup-later').addEventListener('click', () => {
      sessionStorage.setItem(SETUP_SNOOZE_KEY, '1');
      $('#api-key-setup').classList.add('hidden');
    });

    $('#save-provider').addEventListener('click', async () => {
      const id = $('#provider-select').value;
      const baseUrl = $('#provider-base-url').value.trim();
      const apiKey = $('#provider-api-key').value;
      await saveProviderSettings(id, baseUrl, apiKey);
      $('#provider-result').textContent = 'Saved.';
      await refresh();
      reloadAppFrame();
    });

    $('#setup-save-key').addEventListener('click', async () => {
      const id = $('#setup-provider-select').value;
      const provider = providerById(id);
      const apiKey = $('#setup-api-key').value.trim();
      if (!apiKey) {
        setText('#setup-result', 'Paste an API key first.');
        return;
      }
      setText('#setup-result', 'Saving key');
      await saveProviderSettings(id, provider?.baseUrl || '', apiKey);
      sessionStorage.removeItem(SETUP_SNOOZE_KEY);
      $('#setup-api-key').value = '';
      $('#api-key-setup').classList.add('hidden');
      await refresh();
      reloadAppFrame();
    });

    $('#test-provider').addEventListener('click', async () => {
      const id = $('#provider-select').value;
      const baseUrl = $('#provider-base-url').value.trim();
      const result = await api('/api/providers/test', {
        method: 'POST',
        body: JSON.stringify({ id, baseUrl }),
      });
      $('#provider-result').textContent = JSON.stringify(result.provider, null, 2);
    });

    $('#save-live-session').addEventListener('click', async () => {
      const mode = $('#live-session-mode-select').value || 'schoolbox-lan';
      await saveConfig({
        liveSession: {
          mode,
          requireExplicitCloud: true,
        },
      });
      $('#live-session-result').textContent = 'Saved live-session mode.';
      await refresh();
      reloadAppFrame();
    });

    $('#start-lan-share').addEventListener('click', async () => {
      $('#live-session-result').textContent = 'Starting LAN sharing...';
      try {
        await api('/api/lan-share/start', { method: 'POST', body: '{}' });
        await refresh();
        reloadAppFrame();
      } catch (error) {
        $('#live-session-result').textContent = error.body?.error || error.message;
      }
    });

    $('#stop-lan-share').addEventListener('click', async () => {
      $('#live-session-result').textContent = 'Stopping LAN sharing...';
      try {
        await api('/api/lan-share/stop', { method: 'POST', body: '{}' });
        await refresh();
        reloadAppFrame();
      } catch (error) {
        $('#live-session-result').textContent = error.body?.error || error.message;
      }
    });

    $('#save-schoolbox').addEventListener('click', async () => {
      await saveConfig({
        schoolBox: {
          mode: $('#schoolbox-mode-select').value,
          port: Number($('#schoolbox-port').value || 32174),
          includeGpu: $('#schoolbox-include-gpu').checked,
        },
      });
      $('#schoolbox-result').textContent = 'Saved.';
      await refresh();
    });

    $('#setup-schoolbox').addEventListener('click', async () => {
      $('#schoolbox-result').textContent = 'Preparing School Box...';
      try {
        const result = await api('/api/schoolbox/setup', { method: 'POST', body: '{}' });
        state.schoolBox = result.status || state.schoolBox;
        $('#schoolbox-result').textContent = 'Prepared.';
      } catch (error) {
        $('#schoolbox-result').textContent = error.message;
      }
      await refresh();
    });

    $('#start-schoolbox').addEventListener('click', async () => {
      $('#schoolbox-result').textContent = 'Starting School Box...';
      try {
        const result = await api('/api/schoolbox/start', { method: 'POST', body: '{}' });
        state.schoolBox = result.status || state.schoolBox;
        $('#schoolbox-result').textContent = 'Start request finished.';
      } catch (error) {
        $('#schoolbox-result').textContent = error.body?.error || error.message;
      }
      await refresh();
    });

    $('#stop-schoolbox').addEventListener('click', async () => {
      $('#schoolbox-result').textContent = 'Stopping School Box...';
      try {
        const result = await api('/api/schoolbox/stop', { method: 'POST', body: '{}' });
        state.schoolBox = result.status || state.schoolBox;
        $('#schoolbox-result').textContent = 'Stop request finished.';
      } catch (error) {
        $('#schoolbox-result').textContent = error.body?.error || error.message;
      }
      await refresh();
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    try {
      await refresh();
      await hydrateUpdateStatus();
    } catch (error) {
      setText('#runtime-pill', 'Runtime error');
      setText('#app-status', error.message);
    }
  });
})();
