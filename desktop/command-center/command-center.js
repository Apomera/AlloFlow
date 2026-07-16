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
    localEngineStatus: null,
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
    'schoolbox-lan': 'Desktop LAN / Local Network',
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

  function selectPane(name, focusTab = false) {
    $$('.tab').forEach((tab) => {
      const selected = tab.dataset.tab === name;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focusTab) tab.focus();
    });
    $$('.pane').forEach((pane) => {
      const selected = pane.id === 'pane-' + name;
      pane.classList.toggle('active', selected);
      pane.hidden = !selected;
    });
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

  function localEngineModelId(status) {
    return (status && status.model && (status.model.name || status.model.url))
      || (status && status.capability && status.capability.modelId)
      || 'local-model';
  }

  function normalizeLocalTaskSupport(status) {
    const support = (status && status.taskSupport)
      || (status && status.lastProbe && status.lastProbe.taskSupport)
      || {};
    return {
      status: support.status || 'unknown',
      generatedAt: support.generatedAt || '',
      passed: Number(support.passed) || 0,
      total: Number(support.total) || 0,
      simpleText: support.simpleText || 'unknown',
      strictJson: support.strictJson || 'unknown',
      remediationJson: support.remediationJson || 'unknown',
    };
  }

  function buildLocalEngineProfile(status) {
    const cap = status && status.capability;
    if (!cap) return null;
    const modelId = localEngineModelId(status);
    return {
      id: cap.profileId || cap.id,
      modelId,
      contextWindow: cap.contextSize || cap.contextWindow,
      contextSource: cap.contextSource,
      safeInputTokens: cap.safeInputTokens,
      safeOutputTokens: cap.safeOutputTokens,
      safeJsonOutputTokens: cap.safeJsonOutputTokens,
      taskSupport: normalizeLocalTaskSupport(status),
      probeStatus: status.lastProbe ? status.lastProbe.status : '',
      lastProbeAt: status.lastProbe ? status.lastProbe.generatedAt : '',
    };
  }

  function buildLocalFallbackConfig(status) {
    const profile = buildLocalEngineProfile(status);
    if (!profile) return null;
    const baseUrl = (status && status.baseUrl) || 'http://127.0.0.1:32173';
    return {
      enabled: Boolean((status && status.cloudFallbackEnabled) || (status && status.engine && status.engine.cloudFallbackEnabled)),
      providerId: 'alloflow-local',
      backend: 'alloflow-local',
      baseUrl,
      models: { default: profile.modelId },
      localModelProfile: profile,
      updatedAt: new Date().toISOString(),
    };
  }

  function summarizeLocalFallback(status) {
    const fallback = buildLocalFallbackConfig(status);
    if (!fallback || !fallback.enabled) return 'Off';
    const support = fallback.localModelProfile.taskSupport || {};
    if (support.remediationJson === 'pass') return 'On - remediation ready';
    if (support.strictJson === 'pass') return 'On - JSON ready, remediation not checked';
    if (support.simpleText === 'pass') return 'On - simple text only';
    return 'On - run local model check';
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
      disabled: 'Optional server off',
      'missing-stack': 'Optional stack missing',
      'missing-app-build': 'Server app build missing',
      'needs-setup': 'Ready to prepare',
      'needs-docker': 'Docker optional',
      'district-planned': 'District mode planned',
      running: 'Server running',
      partial: 'Server partially running',
      ready: 'Optional server ready',
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
      item.textContent = 'Optional server controls are ready.';
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
        title: 'Choose optional server mode',
        detail: district ? 'District Server is planned for later; Docker Server Host is the optional local server path today.' : 'Use Docker Server Host only when this computer should run the separate School Box server stack.',
        state: district ? 'blocked' : 'done',
      },
      {
        title: 'Prepare settings',
        detail: stackReady ? 'Create or refresh the optional server settings file.' : 'The optional server stack files are missing from this build.',
        state: !stackReady ? 'blocked' : (envReady ? 'done' : 'current'),
      },
      {
        title: 'Start Docker services',
        detail: dockerReady ? 'Start the optional app, database, local AI, voice, and search services.' : 'Install and start Docker Desktop only if you need the optional server stack.',
        state: !envReady ? 'blocked' : (running ? 'done' : (dockerReady ? 'current' : 'blocked')),
      },
      {
        title: 'Open optional server',
        detail: 'Open the local server host once its services are running.',
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
    setText('#schoolbox-docker', isDistrictMode ? 'not used' : (docker.available ? 'ready' : 'not running (optional)'));
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
        : 'Start LAN Share first';
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

  // â”€â”€ Classroom join tools (QR / PIN / presenter / diagnostics) â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Classroom setup wizard (local-first mode) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          ? 'Desktop LAN / Local Network mode is on - class data stays on this computer.'
          : 'Pick Desktop LAN / Local Network in Live Sessions and press Save. This keeps class data off the cloud.',
      },
      {
        done: shareActive,
        title: 'Start LAN Share (and set a PIN if you want one)',
        detail: shareActive
          ? 'Students on this network can reach the join page.' + (pinConfigured ? ' A join PIN is set.' : ' Tip: a join PIN keeps drop-ins out on busy networks.')
          : 'Press Start LAN Share. Set a Join PIN first if you want one â€” it latches when sharing starts.',
      },
      {
        done: false,
        title: 'Put the class code on the projector',
        detail: 'Type your class code above, then open Presenter view â€” students scan the QR or type the link. Run â€œclassroom checkâ€ below to confirm the network path.',
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
        : 'Network: NO LAN address found â€” connect to the school network.');
      lines.push(diag.share?.active
        ? `LAN Share: ACTIVE on port ${diag.share.port}${diag.pinActive ? ' with join PIN' : ' (no PIN)'}`
        : 'LAN Share: OFF â€” students cannot join from other devices yet.');
      const joinUrl = classroomJoinUrl();
      if (joinUrl) {
        lines.push('Join link: ' + joinUrl);
      } else if (classroomCode()) {
        lines.push('Join link: unavailable â€” start LAN Share first.');
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

  async function collectClassroomReadiness() {
    let diag = state.lanDiagnostics || null;
    let diagnosticsError = '';
    try {
      diag = await api('/api/lan-share/diagnostics');
      state.lanDiagnostics = diag;
    } catch (error) {
      diagnosticsError = error.message || 'LAN diagnostics unavailable.';
    }

    const liveSession = state.liveSession || {};
    const mode = liveSession.mode || state.config?.liveSession?.mode || '';
    const modeLabel = LIVE_SESSION_LABELS[mode] || mode || 'unknown';
    const code = classroomCode();
    const joinUrl = classroomJoinUrl();
    const share = diag?.share || liveSession.lanBridge?.share || {};
    const addresses = Array.isArray(diag?.addresses) ? diag.addresses : [];
    const pinConfigured = Boolean(diag?.pinConfigured || state.config?.liveSession?.lan?.pin);
    const pinActive = Boolean(diag?.pinActive);
    const shareActive = Boolean(share.active);
    const warnings = [...(diag?.warnings || [])];
    const notes = [...(diag?.notes || [])];
    const nextActions = [];

    if (diagnosticsError) nextActions.push('Open the Desktop command center and refresh diagnostics: ' + diagnosticsError);
    if (mode !== 'schoolbox-lan') nextActions.push('Switch Live Sessions to Desktop LAN / Local Network, then press Save Live Session Mode.');
    if (!addresses.length) nextActions.push('Connect this computer to the same school Wi-Fi or ethernet network students will use.');
    if (!shareActive) nextActions.push('Press Start LAN Share before students join from other devices.');
    if (!code) nextActions.push('Type a class code before showing the QR or copying the join link.');
    if (shareActive && code && joinUrl) nextActions.push('Show the QR or copy the join link for students on the same network.');
    if (shareActive && !pinConfigured) nextActions.push('Optional: set a Join PIN, then restart LAN Share, for busy or shared networks.');

    return {
      generatedAt: new Date().toISOString(),
      mode,
      modeLabel,
      classCode: code || null,
      joinLink: joinUrl || null,
      presenterPath: code ? '/present/' + encodeURIComponent(code) : null,
      shareActive,
      sharePort: share.port || null,
      pinConfigured,
      pinActive,
      lanAddresses: addresses,
      reachableFromOtherDevices: Boolean(diag?.reachableFromOtherDevices || shareActive),
      warnings,
      notes,
      nextActions,
      diagnosticsError: diagnosticsError || null,
    };
  }

  function formatClassroomReadinessSummary(classroom) {
    if (!classroom) return 'Classroom LAN: diagnostics unavailable.';
    const lines = [];
    lines.push('Classroom LAN: ' + (classroom.shareActive ? 'active' : 'not sharing') + ' - ' + classroom.modeLabel);
    if (classroom.classCode) lines.push('Class code: ' + classroom.classCode);
    if (classroom.joinLink) lines.push('Join link: ' + classroom.joinLink);
    lines.push('PIN: ' + (classroom.pinConfigured ? (classroom.pinActive ? 'active for this share' : 'saved; restart LAN Share to apply') : 'not set'));
    if (classroom.lanAddresses.length) lines.push('LAN addresses: ' + classroom.lanAddresses.join(', '));
    if (classroom.warnings.length) classroom.warnings.forEach((warning) => lines.push('Warning: ' + warning));
    if (classroom.nextActions.length) {
      lines.push('Classroom next steps:');
      classroom.nextActions.forEach((action) => lines.push('  - ' + action));
    }
    return lines.join('\n');
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
      const localEngineProfile = buildLocalEngineProfile(state.localEngineStatus);
      const localFallback = buildLocalFallbackConfig(state.localEngineStatus);
      const localModelProfile = provider.id === 'alloflow-local' ? localEngineProfile : null;
      const nextConfig = {
        ...previous,
        providerId: provider.id,
        backend,
        baseUrl: baseUrl || provider.baseUrl || '',
        apiKey: '',
        keySource: isCloud && (apiKey || provider.hasKey) ? 'desktop-secure-storage' : '',
        models: isCloud ? (previous.models || {}) : buildProviderModels(provider, previous.models),
        updatedAt: new Date().toISOString(),
        source: 'alloflow-desktop',
      };
      if (localModelProfile) nextConfig.localModelProfile = localModelProfile;
      else delete nextConfig.localModelProfile;
      if (localFallback) nextConfig.localFallback = localFallback;
      else delete nextConfig.localFallback;
      localStorage.setItem(BUNDLED_AI_CONFIG_KEY, JSON.stringify(nextConfig));
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

  // â”€â”€ Built-in AI Engine (managed llama-server) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let enginePollTimer = null;
  function renderEngineStatus(status) {
    if (!status) return;
    let phase = status.phase || 'stopped';
    if (status.download && status.download.totalBytes) {
      const pct = Math.round((status.download.receivedBytes / status.download.totalBytes) * 100);
      phase += ' â€” ' + status.download.file + ' ' + pct + '%';
    }
    setText('#engine-phase', phase);
    setText('#engine-model', status.model
      ? (status.model.name || 'not set') + (status.model.present ? ' (downloaded)' : ' (will download)') +
        (status.capability && status.capability.contextSize ? ' - ctx ' + status.capability.contextSize : '')
      : '-');
    setText('#engine-context', status.capability
      ? 'ctx ' + status.capability.contextSize + ' (' + status.capability.contextSource + '), input ' + status.capability.safeInputTokens + ', JSON ' + status.capability.safeJsonOutputTokens
      : '-');
    setText('#engine-fallback-state', summarizeLocalFallback(status));
    setText('#engine-disk', status.diskFreeBytes != null ? (status.diskFreeBytes / 1073741824).toFixed(1) + ' GB' : '-');
    const fallbackToggle = $('#engine-cloud-fallback');
    if (fallbackToggle && document.activeElement !== fallbackToggle) {
      fallbackToggle.checked = Boolean((status.engine && status.engine.cloudFallbackEnabled) || status.cloudFallbackEnabled);
    }
    const result = $('#engine-result');
    if (result) {
      if (status.lastError) result.textContent = status.lastError;
      else if (status.advisory) result.textContent = status.advisory;
      else if (status.running) result.textContent = 'Running (' + (status.arch || '?') + ') at ' + status.baseUrl + '. Select the "AlloFlow Built-in Engine" provider to use it.';
      else if (status.lastProbe) result.textContent = 'Last local model check: ' + (status.lastProbe.summary || status.lastProbe.status || 'finished') + ' (' + (status.lastProbe.generatedAt || 'recent') + ').';
    }
  }
  async function refreshEngineStatus() {
    const status = await api('/api/engine/status');
    state.localEngineStatus = status;
    renderEngineStatus(status);
    syncSelectedProviderForBundledApp();
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
      // window.prompt() throws in Electron renderers â€” use the inline row.
      const row = $('#engine-custom-row');
      if (row) { row.hidden = false; const input = $('#engine-custom-input'); if (input) input.focus(); }
      return;
    }
    try {
      await api('/api/config', { method: 'POST', body: JSON.stringify({ localEngine: { modelUrl } }) });
      if (result) {
        result.textContent = /^https?:\/\//i.test(modelUrl)
          ? 'Model choice saved. It downloads on the next engine start (stop + start to switch now). Earlier models stay on disk until you delete them from the engine folder.'
          : 'Local model file saved: ' + modelUrl + ' â€” used in place, nothing downloads. Keep the drive connected while the engine runs.';
      }
      await refreshEngineStatus();
    } catch (error) {
      if (result) result.textContent = error.message || 'Could not save the model choice.';
    }
  }
  async function applyCustomEngineModel() {
    const result = $('#engine-result');
    const row = $('#engine-custom-row');
    const input = $('#engine-custom-input');
    const modelUrl = input && input.value ? input.value.trim() : '';
    if (!modelUrl) { if (result) result.textContent = 'Enter a .gguf URL or file path first.'; return; }
    try {
      await api('/api/config', { method: 'POST', body: JSON.stringify({ localEngine: { modelUrl } }) });
      if (row) row.hidden = true;
      if (result) {
        result.textContent = /^https?:\/\//i.test(modelUrl)
          ? 'Custom model saved. It downloads on the next engine start.'
          : 'Local model file saved: ' + modelUrl + ' â€” used in place, nothing downloads. Keep the drive connected while the engine runs.';
      }
      await refreshEngineStatus();
    } catch (error) {
      if (result) result.textContent = error.message || 'Could not save the custom model.';
    }
  }
  function cancelCustomEngineModel() {
    const row = $('#engine-custom-row');
    if (row) row.hidden = true;
    refreshEngineStatus().catch(() => {});
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
  async function toggleEngineCloudFallback(event) {
    const result = $('#engine-result');
    const enabled = Boolean(event && event.target && event.target.checked);
    try {
      await api('/api/config', { method: 'POST', body: JSON.stringify({ localEngine: { cloudFallbackEnabled: enabled } }) });
      const status = await refreshEngineStatus();
      if (result) {
        result.textContent = enabled
          ? summarizeLocalFallback(status) + '. Cloud text AI can try this local model after a cloud rate limit, only for task types the check has passed.'
          : 'Cloud-rate-limit local fallback is off.';
      }
    } catch (error) {
      if (event && event.target) event.target.checked = !enabled;
      if (result) result.textContent = error.message || 'Could not save the local fallback setting.';
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
      } catch (_) { /* runtime briefly busy â€” keep polling */ }
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

  function formatEngineProbe(probe) {
    if (!probe) return 'No probe result returned.';
    const lines = [];
    lines.push((probe.summary || 'Local model check finished.') + (probe.model ? ' Model: ' + probe.model + '.' : ''));
    if (probe.status === 'not-running') {
      lines.push('Start the built-in engine first. This check does not start downloads or change settings.');
    }
    if (probe.engine && probe.engine.capability) {
      const cap = probe.engine.capability;
      lines.push('Capability: ctx ' + cap.contextSize + ' (' + cap.contextSource + '), safe input ' + cap.safeInputTokens + ', safe JSON output ' + cap.safeJsonOutputTokens + '.');
    }
    if (probe.taskSupport) {
      const support = probe.taskSupport;
      lines.push('Task support: text ' + (support.simpleText || 'unknown') + ', JSON ' + (support.strictJson || 'unknown') + ', remediation ' + (support.remediationJson || 'unknown') + '.');
    }
    (probe.tests || []).forEach((test) => {
      lines.push((test.ok ? 'OK' : 'FAIL') + ' - ' + test.label + ' (' + test.latencyMs + ' ms): ' + (test.detail || ''));
      if (!test.ok && test.preview) lines.push('  Preview: ' + test.preview);
    });
    return lines.join('\n');
  }

  async function probeBuiltInEngine() {
    const result = $('#engine-result');
    if (result) result.textContent = 'Checking the local model with small text and JSON probes...';
    try {
      const probe = await api('/api/engine/probe', { method: 'POST', body: '{}' });
      await refreshEngineStatus();
      if (result) result.textContent = formatEngineProbe(probe);
    } catch (error) {
      if (result) result.textContent = error.message || 'Local model check failed.';
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

  async function cacheEntryCount(cacheName, urlIncludes) {
    try {
      if (!window.caches) return 0;
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      return keys.filter((request) => !urlIncludes || String(request.url || '').includes(urlIncludes)).length;
    } catch (_) {
      return 0;
    }
  }

  async function collectBrowserReadiness() {
    const appWindow = getBundledAppWindow();
    let microphone = 'unknown';
    try {
      if (navigator.permissions && navigator.permissions.query) {
        microphone = (await navigator.permissions.query({ name: 'microphone' })).state || 'unknown';
      }
    } catch (_) {
      microphone = 'unknown';
    }
    const webGpuReady = await _webGpuAdapterOk();
    const sdCacheEntries = await cacheEntryCount('allo-sd-turbo');
    const kokoroCacheEntries = await cacheEntryCount('transformers-cache', 'Kokoro-82M');
    return {
      generatedAt: new Date().toISOString(),
      appFrame: {
        loadedSameOrigin: Boolean(appWindow),
        href: appWindow ? appWindow.location.href : '',
      },
      localImages: {
        webGpuReady,
        sdTurboCacheEntries: sdCacheEntries,
        status: !webGpuReady ? 'unsupported' : (sdCacheEntries > 0 ? 'downloaded' : 'available-not-downloaded'),
      },
      localVoice: {
        kokoroReady: Boolean(appWindow && appWindow._kokoroTTS && appWindow._kokoroTTS.ready),
        kokoroDownloading: Boolean(appWindow && appWindow.__kokoroTTSDownloading),
        kokoroCacheEntries,
        lastRoute: appWindow ? (appWindow.__ttsLastRoute || null) : null,
      },
      microphone: {
        permission: microphone,
      },
    };
  }

  function formatReadinessSummary(report) {
    const lines = [];
    lines.push('Overall: ' + (report.overall || 'unknown') + ' - ' + (report.summary || ''));
    (report.sections || []).forEach((section) => {
      lines.push(section.label + ': ' + section.state + ' - ' + section.summary);
      if (section.nextAction) lines.push('  Next: ' + section.nextAction);
    });
    if (report.browser) {
      lines.push('Local images: ' + report.browser.localImages.status + (report.browser.localImages.webGpuReady ? ' (WebGPU ready)' : ' (no WebGPU adapter)'));
      lines.push('Local voice: ' + (report.browser.localVoice.kokoroReady ? 'ready' : (report.browser.localVoice.kokoroCacheEntries ? 'downloaded' : 'not downloaded')));
      lines.push('Microphone: ' + report.browser.microphone.permission);
    }
    return lines.join('\n');
  }

  async function copyReadinessReport(targetSelector = '#readiness-result') {
    if (typeof targetSelector !== 'string') targetSelector = '#readiness-result';
    const resultNode = $(targetSelector);
    if (resultNode) resultNode.textContent = 'Collecting readiness report...';
    try {
      const report = await api('/api/readiness');
      report.browser = await collectBrowserReadiness();
      report.classroom = await collectClassroomReadiness();
      report.update = state.update || null;
      report.copiedAt = new Date().toISOString();
      await writeClipboard(JSON.stringify(report, null, 2));
      if (resultNode) resultNode.textContent = formatReadinessSummary(report) + '\n\n' + formatClassroomReadinessSummary(report.classroom) + '\n\nCopied readiness report to clipboard.';
    } catch (error) {
      if (resultNode) resultNode.textContent = error.message || 'Could not copy readiness report.';
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

    // The wizard owns the modal while the user is inside it — refresh() runs
    // every few seconds and must not yank them back to the first step.
    if (state.wizardActive) return;
    const provider = selectedProvider();
    if (providerNeedsKey(provider)) {
      wizardGo('choose');
      modal.classList.remove('hidden');
    } else {
      modal.classList.add('hidden');
    }
  }

  // ── First-run setup wizard ─────────────────────────────────────────────────
  // Multi-step guided flow covering every AI option the app supports. Design
  // notes: plain language for non-technical users, hardware requirements
  // stated up front for local options, and live progress for the built-in
  // engine download (the old flow started a ~2 GB download with no feedback).
  const WIZ_CONNECT_APPS = {
    lmstudio: {
      label: 'LM Studio',
      providerId: 'lmstudio',
      steps: [
        'Install LM Studio from <a href="https://lmstudio.ai" target="_blank" rel="noreferrer">lmstudio.ai ↗</a> (free).',
        'Open it, use its search to download a model — “Qwen 2.5 7B Instruct” is a good start.',
        'In LM Studio, open the <strong>Developer / Local Server</strong> tab and press <strong>Start</strong>.',
        'Press <strong>Test connection</strong> below.',
      ],
    },
    ollama: {
      label: 'Ollama',
      providerId: 'ollama',
      steps: [
        'Install Ollama from <a href="https://ollama.com" target="_blank" rel="noreferrer">ollama.com ↗</a> (free).',
        'Open a terminal and run: <code>ollama pull qwen2.5</code>',
        'Ollama serves automatically once installed.',
        'Press <strong>Test connection</strong> below.',
      ],
    },
    localai: {
      label: 'LocalAI',
      providerId: 'localai',
      steps: [
        'Follow the install guide at <a href="https://localai.io" target="_blank" rel="noreferrer">localai.io ↗</a>.',
        'Start the LocalAI server with at least one chat model.',
        'Press <strong>Test connection</strong> below.',
      ],
    },
    custom: {
      label: 'Custom endpoint',
      providerId: 'custom',
      needsKeyField: true,
      steps: [
        'Enter the address of any OpenAI-compatible server (for example, a school-hosted AI).',
        'Add an API key below only if that server requires one.',
        'Press <strong>Test connection</strong> below.',
      ],
    },
  };

  const WIZ_STEP_COPY = {
    choose: ['First-time setup', 'Choose your AI', 'AlloFlow uses an AI engine to create lessons, read aloud, and answer questions. Pick how you\'d like it to work — you can change this any time under ⚙ Settings → AI.'],
    gemini: ['Step 2 of 2 · Google Gemini', 'Get your free key', 'Four small steps — about two minutes. You only do this once.'],
    builtin: ['Step 2 of 2 · Built-in private AI', 'Before you turn it on', 'A quick look at what this option means for your computer.'],
    connect: ['Step 2 of 3 · Connect an AI app', 'Which app do you use?', 'Pick the AI software running on this computer.'],
    'connect-detail': ['Step 3 of 3 · Connect an AI app', 'Connect it', ''],
    done: ['Setup complete', 'You\'re ready! 🎉', ''],
  };

  function wizardGo(step) {
    state.wizardActive = step !== 'choose';
    $$('[data-wizard-step]').forEach((node) => {
      node.classList.toggle('hidden', node.dataset.wizardStep !== step);
    });
    const copy = WIZ_STEP_COPY[step] || WIZ_STEP_COPY.choose;
    setText('#wiz-kicker', copy[0]);
    setText('#wiz-title', copy[1]);
    setText('#wiz-copy', copy[2]);
    setText('#wiz-error', '');
    if (step === 'builtin') {
      // Friendly hardware self-check. navigator.deviceMemory is capped at 8 by
      // Chromium, so phrase it as "at least".
      const mem = Number(navigator.deviceMemory || 0);
      setText('#wiz-builtin-hw', mem >= 8
        ? '✅ This computer reports at least ' + mem + ' GB of memory — you\'re good to go.'
        : (mem > 0
          ? '⚠️ This computer reports about ' + mem + ' GB of memory. The built-in AI will run, but expect slower answers — Google Gemini may feel better here.'
          : ''));
    }
  }

  function wizardDone(label) {
    setText('#wiz-done-msg', '✅ You\'re all set — AlloFlow is using ' + label + '.');
    wizardGo('done');
  }

  function wizardFail(message) {
    setText('#wiz-error', message);
  }

  function wizardOpenConnectDetail(appId) {
    const app = WIZ_CONNECT_APPS[appId];
    if (!app) return;
    state.wizardConnectApp = appId;
    const list = $('#wiz-connect-steps');
    if (list) list.innerHTML = app.steps.map((step) => '<li>' + step + '</li>').join('');
    const preset = providerById(app.providerId);
    const urlInput = $('#wiz-connect-url');
    if (urlInput) urlInput.value = (preset && preset.baseUrl) || '';
    $('#wiz-connect-key-wrap')?.classList.toggle('hidden', !app.needsKeyField);
    $('#wiz-connect-use')?.classList.add('hidden');
    setText('#wiz-connect-result', '');
    wizardGo('connect-detail');
    setText('#wiz-title', 'Connect ' + app.label);
  }

  let wizardEnginePoll = null;
  function wizardStopEnginePoll() {
    if (wizardEnginePoll) { clearInterval(wizardEnginePoll); wizardEnginePoll = null; }
  }

  async function wizardStartBuiltin() {
    const startBtn = $('#wiz-builtin-start');
    if (startBtn) { startBtn.disabled = true; startBtn.textContent = 'Working…'; }
    $('#wiz-builtin-progress')?.classList.remove('hidden');
    setText('#wiz-builtin-status', 'Starting the built-in engine…');
    try {
      await saveConfig({ selectedProvider: 'alloflow-local' });
      await api('/api/engine/start', { method: 'POST' });
    } catch (error) {
      wizardFail('Could not start: ' + error.message);
      if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'Download & turn on'; }
      return;
    }
    wizardStopEnginePoll();
    wizardEnginePoll = setInterval(async () => {
      let eng = null;
      try { eng = await api('/api/engine/status'); } catch (_) { return; }
      const bar = $('#wiz-builtin-bar');
      if (eng.running) {
        wizardStopEnginePoll();
        if (bar) bar.style.width = '100%';
        const model = eng.model && eng.model.name ? eng.model.name.replace(/\.gguf$/i, '') : 'the local model';
        setText('#wiz-builtin-status', 'Running — ' + model);
        await refresh();
        reloadAppFrame();
        wizardDone('the built-in private AI');
      } else if (eng.download && eng.download.totalBytes) {
        const pct = Math.round((eng.download.receivedBytes / eng.download.totalBytes) * 100);
        if (bar) bar.style.width = pct + '%';
        setText('#wiz-builtin-status', 'Downloading the AI model — ' + pct + '% (keep the app open)');
      } else if (eng.phase && eng.phase !== 'stopped') {
        setText('#wiz-builtin-status', eng.phase.replace(/-/g, ' ') + '…');
      } else if (eng.lastError) {
        wizardStopEnginePoll();
        wizardFail('The engine could not start: ' + eng.lastError);
        if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'Try again'; }
      }
    }, 2000);
  }

  // â”€â”€ Local Images (SD-Turbo) panel â€” AI tab twin of the Voice panel â”€â”€
  async function _webGpuAdapterOk() {
    try {
      if (!(navigator.gpu && typeof navigator.gpu.requestAdapter === 'function')) return false;
      return !!(await navigator.gpu.requestAdapter());
    } catch (_) { return false; }
  }

  async function inspectSdTurbo() {
    const adapterOk = await _webGpuAdapterOk();
    setText('#sd-gpu', adapterOk ? 'WebGPU ready' : 'No WebGPU adapter');
    const appWindow = getBundledAppWindow();
    if (appWindow && appWindow._sdTurbo && appWindow._sdTurbo.ready) {
      setText('#sd-status', 'ready');
      $('#sd-result').textContent = 'SD-Turbo is loaded â€” images generate on this device.';
      return;
    }
    let entries = 0;
    try { entries = (await (await caches.open('allo-sd-turbo')).keys()).length; } catch (_) {}
    if (!adapterOk) {
      setText('#sd-status', 'not supported');
      $('#sd-result').textContent = 'This computer has no WebGPU graphics adapter, so local image generation cannot run here. Cloud image AI still works with an API key.';
    } else if (entries > 0) {
      setText('#sd-status', 'downloaded');
      $('#sd-result').textContent = 'Model files are cached on this device. The app loads them when image generation is first used.';
    } else {
      setText('#sd-status', 'not downloaded');
    }
  }

  async function downloadSdTurbo() {
    const appWindow = getBundledAppWindow();
    if (!appWindow) {
      $('#sd-result').textContent = 'Switch the app URL to the bundled /app/ address, then try again.';
      return;
    }
    if (!(await _webGpuAdapterOk())) {
      $('#sd-result').textContent = 'This computer has no WebGPU graphics adapter â€” local image generation is not available here.';
      return;
    }
    if (typeof appWindow.__loadSdTurbo !== 'function') {
      $('#sd-result').textContent = 'The app view has not finished loading yet â€” wait a few seconds and try again.';
      return;
    }
    $('#sd-result').textContent = 'Downloading SD-Turbo (~2 GB, one time)â€¦';
    try {
      const done = await appWindow.__loadSdTurbo((p) => {
        const pct = p && p.pct != null ? Math.round(p.pct * 100) + '%' : '';
        $('#sd-result').textContent = 'Downloading SD-Turbo (~2 GB, one time)â€¦ ' + pct;
      });
      $('#sd-result').textContent = done
        ? 'SD-Turbo ready â€” images generate on this device.'
        : 'The download did not complete â€” check the connection and try again.';
    } catch (error) {
      $('#sd-result').textContent = 'Download failed: ' + (error && error.message ? error.message : error);
    }
    inspectSdTurbo();
    refreshSetupHealth().catch(() => {});
  }

  // Speak a fixed sentence through the REAL local engine and play it here â€”
  // separates "engine can synthesize" from "the app routed elsewhere" in one
  // click, with the router's own breadcrumb shown for the app half.
  async function testKokoroVoice() {
    const appWindow = getBundledAppWindow();
    if (!appWindow) {
      $('#voice-result').textContent = 'Switch the app URL to the bundled /app/ address, then try again.';
      return;
    }
    if (!(appWindow._kokoroTTS && appWindow._kokoroTTS.ready)) {
      $('#voice-result').textContent = 'The Kokoro engine is not ready yet (state: ' + (appWindow._kokoroTTS ? 'loaded, preparing' : 'not loaded') + '). Wait for the ready toast in the app, then retry.';
      return;
    }
    let voicePref = 'af_heart';
    try { voicePref = localStorage.getItem('allo_voice_preference') || 'af_heart'; } catch (_) {}
    $('#voice-result').textContent = 'Synthesizing a test sentence with voice "' + voicePref + '"â€¦';
    try {
      const url = await appWindow._kokoroTTS.speakStreaming('Hello! This is the local Kokoro voice speaking on this computer.', voicePref, 1);
      if (!url) { $('#voice-result').textContent = 'Engine returned no audio â€” send this to the developer with the app console lines.'; return; }
      const audio = new Audio(url);
      await audio.play();
      const lastRoute = appWindow.__ttsLastRoute;
      $('#voice-result').textContent = 'You should be hearing the Kokoro voice now (engine OK). Last in-app read-aloud route: '
        + (lastRoute ? lastRoute.route + ' (voice ' + lastRoute.voice + ', ' + (lastRoute.detail || 'no detail') + ')' : 'none recorded yet â€” read something aloud in the app first.');
    } catch (error) {
      $('#voice-result').textContent = 'Playback failed: ' + (error && error.message ? error.message : error);
    }
  }

  // â”€â”€ Setup Health card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // One glance = live truth for the five capabilities field testing kept
  // tripping over. Rows only show an action button when the runtime can
  // actually do something about the state from here.
  let healthPollTimer = null;

  function setHealthRow(id, cls, text, actLabel, actFn) {
    const row = $(id);
    if (!row) return;
    row.classList.remove('ok', 'warn', 'err', 'busy');
    if (cls) row.classList.add(cls);
    const textEl = row.querySelector('[data-text]');
    if (textEl && textEl.textContent !== text) textEl.textContent = text;
    const btn = row.querySelector('[data-act]');
    if (!btn) return;
    if (actLabel && actFn) {
      btn.textContent = actLabel;
      btn.setAttribute('aria-label', actLabel);
      btn.hidden = false;
      btn.disabled = false;
      btn.onclick = async () => {
        btn.disabled = true;
        try { await actFn(); } catch (_) {}
        ensureHealthPolling();
        refreshSetupHealth();
      };
    } else {
      btn.hidden = true;
      btn.setAttribute('aria-label', 'Setup action unavailable');
      btn.onclick = null;
    }
  }

  async function refreshSetupHealth() {
    // 1. AI Engine (text generation)
    try {
      const eng = await api('/api/engine/status');
      if (eng.running) {
        const model = eng.model && eng.model.name ? eng.model.name.replace(/\.gguf$/i, '') : 'local model';
        setHealthRow('#health-engine', 'ok', 'Running â€” ' + model);
      } else if (eng.download && eng.download.totalBytes) {
        setHealthRow('#health-engine', 'busy', 'Downloading model â€” ' + Math.round((eng.download.receivedBytes / eng.download.totalBytes) * 100) + '%');
      } else if (eng.phase && eng.phase !== 'stopped') {
        setHealthRow('#health-engine', 'busy', eng.phase.replace(/-/g, ' ') + 'â€¦');
      } else {
        setHealthRow('#health-engine', 'warn', 'Not running', 'Start', () => api('/api/engine/start', { method: 'POST' }));
      }
    } catch (_) {
      setHealthRow('#health-engine', 'err', 'Runtime unreachable');
    }

    // 2. Reading voice (Kokoro) â€” live in-app truth when the bundled app is
    // loaded; otherwise the shared same-origin cache tells us if the model
    // is on disk.
    try {
      const w = getBundledAppWindow();
      if (w && w._kokoroTTS && w._kokoroTTS.ready) {
        // Engine READY is necessary but not sufficient â€” show what the last
        // read-aloud actually did (window.__ttsLastRoute breadcrumb from the
        // TTS router) so "ready but I hear the robot voice" is diagnosable
        // at a glance instead of via DevTools.
        let voicePref = '';
        try { voicePref = localStorage.getItem('allo_voice_preference') || ''; } catch (_) {}
        const lastRoute = w.__ttsLastRoute || null;
        if (lastRoute && lastRoute.route && lastRoute.route !== 'kokoro' && lastRoute.route !== 'provider') {
          setHealthRow('#health-voice', 'warn', 'Ready, but last read-aloud fell back (' + lastRoute.route + (lastRoute.voice ? ', voice ' + lastRoute.voice : '') + ')');
        } else {
          setHealthRow('#health-voice', 'ok', 'Ready â€” reads aloud on this device' + (voicePref ? ' (' + voicePref + ')' : ''));
        }
      } else if (w && w.__kokoroTTSDownloading) {
        setHealthRow('#health-voice', 'busy', 'Preparing voice modelâ€¦');
      } else {
        let cached = false;
        try {
          const cache = await caches.open('transformers-cache');
          const keys = await cache.keys();
          cached = keys.some((r) => String(r.url).includes('Kokoro-82M') && String(r.url).includes('model_quantized'));
        } catch (_) {}
        if (cached) {
          setHealthRow('#health-voice', 'ok', 'Downloaded â€” loads shortly after the app opens');
        } else if (w && typeof w.__loadKokoroTTS === 'function') {
          setHealthRow('#health-voice', 'warn', 'Not downloaded yet (~88 MB, one time)', 'Download', () => downloadKokoroVoice());
        } else {
          setHealthRow('#health-voice', 'warn', 'Downloads on first app launch (~88 MB)');
        }
      }
    } catch (_) {
      setHealthRow('#health-voice', 'warn', 'Downloads on first app launch (~88 MB)');
    }

    // 3. Local images (SD-Turbo) â€” needs a REAL WebGPU adapter, not just the API.
    try {
      let adapter = null;
      if (navigator.gpu && typeof navigator.gpu.requestAdapter === 'function') {
        try { adapter = await navigator.gpu.requestAdapter(); } catch (_) { adapter = null; }
      }
      if (!adapter) {
        setHealthRow('#health-images', 'err', 'Not supported on this computer (no WebGPU)');
      } else {
        let entries = 0;
        try {
          const cache = await caches.open('allo-sd-turbo');
          entries = (await cache.keys()).length;
        } catch (_) {}
        if (entries > 0) {
          setHealthRow('#health-images', 'ok', 'Downloaded â€” images generate on this device');
        } else {
          setHealthRow('#health-images', 'warn', 'Available â€” enable in the appâ€™s AI Settings (~2 GB once)');
        }
      }
    } catch (_) {
      setHealthRow('#health-images', 'warn', 'Could not check');
    }

    // 4. Speech-to-text (whisper.cpp) â€” the one-click opt-in lives HERE.
    try {
      const asr = await api('/api/asr/status');
      if (asr.running) {
        setHealthRow('#health-asr', 'ok', 'On â€” student audio stays on this device', 'Turn off', () => api('/api/asr/stop', { method: 'POST' }));
      } else if (asr.phase && /download|starting|extract/i.test(asr.phase)) {
        const pct = asr.download && asr.download.totalBytes
          ? ' â€” ' + Math.round((asr.download.receivedBytes / asr.download.totalBytes) * 100) + '%'
          : 'â€¦';
        setHealthRow('#health-asr', 'busy', asr.phase.replace(/-/g, ' ') + pct);
      } else if (asr.lastError) {
        setHealthRow('#health-asr', 'err', String(asr.lastError).slice(0, 80), 'Retry', () => api('/api/asr/start', { method: 'POST' }));
      } else if (asr.model && asr.model.present) {
        setHealthRow('#health-asr', 'warn', 'Downloaded but off', 'Start', () => api('/api/asr/start', { method: 'POST' }));
      } else {
        setHealthRow('#health-asr', 'warn', 'Off â€” reading practice uses the cloud', 'Enable (~148 MB once)', () => api('/api/asr/start', { method: 'POST' }));
      }
    } catch (_) {
      setHealthRow('#health-asr', 'err', 'Runtime unreachable');
    }

    // 5. Microphone permission (never triggers the prompt from here).
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const st = await navigator.permissions.query({ name: 'microphone' });
        if (st.state === 'granted') setHealthRow('#health-mic', 'ok', 'Allowed');
        else if (st.state === 'denied') setHealthRow('#health-mic', 'err', 'Blocked â€” allow the app in Windows microphone settings');
        else setHealthRow('#health-mic', 'warn', 'Will ask the first time a lesson records');
      } else {
        setHealthRow('#health-mic', 'warn', 'Will ask the first time a lesson records');
      }
    } catch (_) {
      setHealthRow('#health-mic', 'warn', 'Will ask the first time a lesson records');
    }

    // Keep polling only while something is mid-flight.
    const anyBusy = $$('#setup-health .health-item.busy').length > 0;
    if (!anyBusy && healthPollTimer) { clearInterval(healthPollTimer); healthPollTimer = null; }
  }

  function ensureHealthPolling() {
    if (healthPollTimer) return;
    healthPollTimer = setInterval(refreshSetupHealth, 4000);
  }

  // ── Build editions (teacher | admin) ──────────────────────────────────────
  // The runtime reports the baked edition in /api/health. Teacher boots
  // straight into the app view full-bleed (console behind the ⚙ gear); admin
  // shows the school-server "teachers connect here" banner with the join PIN.
  // Unflavored builds change nothing.
  function applyEditionPosture() {
    const edition = String((state.health && state.health.edition) || '').toLowerCase();
    document.body.classList.toggle('edition-admin', edition === 'admin');
    document.body.classList.toggle('edition-desktop', edition === 'desktop');
    if (edition === 'desktop' && !state.editionBooted) {
      state.editionBooted = true;
      // CSS-only full-bleed — no forced OS fullscreen; the Full Screen control
      // still does that on demand.
      setAppFocusMode(true, { syncWindow: false });
    }
    renderAdminConnectBanner().catch(() => {});
  }

  async function renderAdminConnectBanner() {
    const banner = $('#admin-connect-banner');
    if (!banner) return;
    const edition = String((state.health && state.health.edition) || '').toLowerCase();
    if (edition !== 'admin') {
      banner.classList.add('hidden');
      return;
    }
    banner.classList.remove('hidden');
    const lan = (((state.config || {}).liveSession || {}).lan || {});
    const pin = String(lan.pin || '').trim();
    setText('#admin-connect-pin', pin || 'not set');
    let share = null;
    try { share = await api('/api/lan-share/status'); } catch (_) {}
    // Public address (domain / reverse-proxy deployments) leads; LAN URLs follow.
    const publicUrl = String(lan.publicUrl || '').trim().replace(/\/+$/, '');
    const urls = (share && Array.isArray(share.appUrls)) ? share.appUrls : [];
    const displayUrls = (publicUrl ? [publicUrl + '/app/'] : []).concat(urls);
    setText('#admin-connect-urls', displayUrls.length
      ? displayUrls.join('  ·  ')
      : 'LAN Share is not running — start it from the Server tab (or restart the app).');
    setText('#admin-connect-state', share && share.active ? 'serving' : 'stopped');
    const urlInput = $('#admin-public-url-input');
    if (urlInput && document.activeElement !== urlInput) urlInput.value = publicUrl;
    // User roster — per-user join PINs (Google Classroom sync can fill this later).
    const list = $('#admin-users-list');
    if (list) {
      let users = [];
      try { users = (await api('/api/users')).users || []; } catch (_) {}
      list.innerHTML = '';
      if (!users.length) {
        const empty = document.createElement('li');
        empty.className = 'admin-users-empty';
        empty.textContent = 'No users yet — add one below, or share the admin PIN.';
        list.appendChild(empty);
      }
      for (const user of users) {
        const item = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = user.name || '(unnamed)';
        const pinCode = document.createElement('code');
        pinCode.textContent = user.pin || '';
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.dataset.userId = user.id || '';
        remove.textContent = 'Remove';
        item.append(name, pinCode, remove);
        list.appendChild(item);
      }
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
    applyEditionPosture();
    maybeShowApiKeySetup();
    refreshSetupHealth().catch(() => {});
    inspectSdTurbo().catch(() => {});
  }

  function bindEvents() {
    const tabs = $$('.tab');
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => selectPane(tab.dataset.tab));
      tab.addEventListener('keydown', (event) => {
        let nextIndex = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex == null) return;
        event.preventDefault();
        selectPane(tabs[nextIndex].dataset.tab, true);
      });
    });

    $('#refresh-all').addEventListener('click', refresh);
    $('#refresh-providers').addEventListener('click', refresh);
    $('#refresh-schoolbox').addEventListener('click', refresh);
    $('#check-voice').addEventListener('click', inspectKokoroVoice);
    $('#download-kokoro').addEventListener('click', downloadKokoroVoice);
    $('#check-sd').addEventListener('click', inspectSdTurbo);
    $('#download-sd').addEventListener('click', downloadSdTurbo);
    $('#test-voice').addEventListener('click', testKokoroVoice);
    $('#engine-start').addEventListener('click', startBuiltInEngine);
    $('#engine-probe').addEventListener('click', probeBuiltInEngine);
    $('#engine-stop').addEventListener('click', stopBuiltInEngine);
    $('#engine-cloud-fallback').addEventListener('change', toggleEngineCloudFallback);
    $('#engine-model-select').addEventListener('change', changeEngineModel);
    $('#engine-custom-apply').addEventListener('click', applyCustomEngineModel);
    $('#engine-custom-cancel').addEventListener('click', cancelCustomEngineModel);
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
    $('#copy-readiness').addEventListener('click', () => copyReadinessReport());
    $('#copy-classroom-readiness')?.addEventListener('click', () => copyReadinessReport('#classroom-check-result'));
    $('#copy-diagnostics').addEventListener('click', copyDiagnostics);
    $('#toggle-app-focus').addEventListener('click', () => {
      setAppFocusMode(!state.appFocusMode);
    });
    $('#exit-app-focus').addEventListener('click', () => {
      setAppFocusMode(false);
    });
    $('#exit-app-focus').addEventListener('mouseenter', showAppFocusControls);
    $('#exit-app-focus').addEventListener('focus', showAppFocusControls);
    // Teacher edition: the console lives behind this gear — leave the app view
    // and land on the Settings pane.
    $('#focus-settings-gear')?.addEventListener('click', () => {
      setAppFocusMode(false);
      selectPane('settings', true);
    });
    $('#focus-settings-gear')?.addEventListener('mouseenter', showAppFocusControls);
    $('#focus-settings-gear')?.addEventListener('focus', showAppFocusControls);
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
          ? 'PIN saved. It applies when LAN sharing (re)starts â€” stop and start sharing to use it now.'
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
    // ── First-run wizard bindings ──
    $('#wiz-later')?.addEventListener('click', () => {
      sessionStorage.setItem(SETUP_SNOOZE_KEY, '1');
      state.wizardActive = false;
      wizardStopEnginePoll();
      $('#api-key-setup').classList.add('hidden');
    });
    // Step navigation (any element carrying data-wiz-go).
    $$('[data-wiz-go]').forEach((btn) => {
      btn.addEventListener('click', () => {
        wizardStopEnginePoll();
        wizardGo(btn.dataset.wizGo);
      });
    });
    // Connect step: pick which local AI app to link.
    $$('[data-wiz-app]').forEach((btn) => {
      btn.addEventListener('click', () => wizardOpenConnectDetail(btn.dataset.wizApp));
    });
    $('#wiz-gemini-save')?.addEventListener('click', async () => {
      const key = $('#wiz-gemini-key')?.value.trim() || '';
      if (!key) { wizardFail('Paste your API key first — step 4 above.'); return; }
      try {
        await saveProviderSettings('gemini', providerById('gemini')?.baseUrl || '', key);
        sessionStorage.removeItem(SETUP_SNOOZE_KEY);
        if ($('#wiz-gemini-key')) $('#wiz-gemini-key').value = '';
        await refresh();
        reloadAppFrame();
        wizardDone('Google Gemini');
      } catch (error) {
        wizardFail('Could not save the key: ' + error.message);
      }
    });
    $('#wiz-builtin-start')?.addEventListener('click', wizardStartBuiltin);
    $('#wiz-connect-test')?.addEventListener('click', async () => {
      const app = WIZ_CONNECT_APPS[state.wizardConnectApp];
      if (!app) return;
      const baseUrl = $('#wiz-connect-url')?.value.trim() || '';
      setText('#wiz-connect-result', 'Testing…');
      try {
        const result = await api('/api/providers/test', {
          method: 'POST',
          body: JSON.stringify({ id: app.providerId, baseUrl }),
        });
        const probe = result.provider || {};
        if (probe.reachable) {
          const models = (probe.models || []).slice(0, 4).join(', ');
          setText('#wiz-connect-result', '✅ Connected! ' + (models ? 'Models found: ' + models : 'The server answered.'));
          $('#wiz-connect-use')?.classList.remove('hidden');
        } else {
          setText('#wiz-connect-result', '❌ No answer at that address. Is ' + app.label + ' running? Check its server is started, then try again.');
          $('#wiz-connect-use')?.classList.add('hidden');
        }
      } catch (error) {
        setText('#wiz-connect-result', '❌ Test failed: ' + error.message);
      }
    });
    $('#wiz-connect-use')?.addEventListener('click', async () => {
      const app = WIZ_CONNECT_APPS[state.wizardConnectApp];
      if (!app) return;
      const baseUrl = $('#wiz-connect-url')?.value.trim() || '';
      const key = $('#wiz-connect-key')?.value.trim() || '';
      try {
        await saveProviderSettings(app.providerId, baseUrl, key);
        sessionStorage.removeItem(SETUP_SNOOZE_KEY);
        await refresh();
        reloadAppFrame();
        wizardDone(app.label);
      } catch (error) {
        wizardFail('Could not save: ' + error.message);
      }
    });
    $('#wiz-finish')?.addEventListener('click', () => {
      state.wizardActive = false;
      $('#api-key-setup').classList.add('hidden');
      if (document.body.classList.contains('edition-desktop')) {
        setAppFocusMode(true, { syncWindow: false });
      }
    });

    // Desktop edition: obvious way home from the console.
    $('#back-to-app')?.addEventListener('click', () => {
      setAppFocusMode(true, { syncWindow: false });
    });

    // Admin edition: public address + user roster (per-user join PINs).
    $('#admin-public-url-save')?.addEventListener('click', async () => {
      const value = $('#admin-public-url-input')?.value.trim() || '';
      await saveConfig({ liveSession: { lan: { publicUrl: value } } });
      renderAdminConnectBanner().catch(() => {});
    });
    $('#admin-user-add')?.addEventListener('click', async () => {
      const input = $('#admin-user-name');
      const name = input?.value.trim() || '';
      if (!name) { input?.focus(); return; }
      await api('/api/users', { method: 'POST', body: JSON.stringify({ name }) });
      if (input) input.value = '';
      renderAdminConnectBanner().catch(() => {});
    });
    $('#admin-users-list')?.addEventListener('click', async (event) => {
      const btn = event.target.closest('button[data-user-id]');
      if (!btn) return;
      await api('/api/users/' + encodeURIComponent(btn.dataset.userId), { method: 'DELETE' });
      renderAdminConnectBanner().catch(() => {});
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
      $('#schoolbox-result').textContent = 'Preparing optional server...';
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
      $('#schoolbox-result').textContent = 'Starting optional server...';
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
      $('#schoolbox-result').textContent = 'Stopping optional server...';
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
