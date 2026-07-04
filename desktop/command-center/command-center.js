(function () {
  'use strict';

  const state = {
    config: null,
    health: null,
    app: null,
    appLogs: [],
    appFocusMode: false,
    providers: [],
  };

  const SETUP_SNOOZE_KEY = 'alloflow_desktop_key_setup_snoozed';
  const BUNDLED_AI_CONFIG_KEY = 'alloflow_ai_config';
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
    $('#provider-result').textContent = provider.hasKey ? 'API key saved locally.' : '';
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

  function renderSchoolBox() {
    const box = state.config?.schoolBox || {};
    setText('#schoolbox-mode', box.mode);
    setText('#schoolbox-address', (box.host || '127.0.0.1') + ':' + (box.port || 32174));
    setText('#schoolbox-embedded', box.embedded ? 'yes' : 'no');
    setText('#schoolbox-state', box.mode === 'disabled' ? 'disabled' : 'not-started');
    $('#schoolbox-mode-select').value = box.mode || 'disabled';
    $('#schoolbox-port').value = box.port || 32174;
    setText('#schoolbox-status', box.mode === 'disabled' ? 'Host disabled' : 'Host configured');
  }

  async function saveConfig(patch) {
    state.config = await api('/api/config', {
      method: 'POST',
      body: JSON.stringify(patch),
    });
    return state.config;
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
      const nextApiKey = apiKey || (isCloud && previous.providerId === provider.id ? previous.apiKey || '' : '');
      localStorage.setItem(BUNDLED_AI_CONFIG_KEY, JSON.stringify({
        ...previous,
        providerId: provider.id,
        backend,
        baseUrl: baseUrl || provider.baseUrl || '',
        apiKey: nextApiKey,
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
    syncBundledAppAiConfig(provider, apiKey, baseUrl);
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
    const [health, config, providerResponse, appResponse, logsResponse] = await Promise.all([
      api('/api/health'),
      api('/api/config'),
      api('/api/providers'),
      api('/api/app/status'),
      api('/api/app/logs'),
    ]);
    state.health = health;
    state.config = config;
    state.providers = providerResponse.providers || [];
    state.app = appResponse.app || null;
    state.appLogs = logsResponse.logs || [];
    syncSelectedProviderForBundledApp();
    renderHealth();
    renderAppLogs();
    renderProviderSelect();
    renderSetupProviderSelect();
    renderProviders();
    renderSchoolBox();
    maybeShowApiKeySetup();
  }

  function bindEvents() {
    $$('.tab').forEach((tab) => {
      tab.addEventListener('click', () => selectPane(tab.dataset.tab));
    });

    $('#refresh-all').addEventListener('click', refresh);
    $('#refresh-providers').addEventListener('click', refresh);
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

    $('#save-schoolbox').addEventListener('click', async () => {
      await saveConfig({
        schoolBox: {
          mode: $('#schoolbox-mode-select').value,
          port: Number($('#schoolbox-port').value || 32174),
        },
      });
      $('#schoolbox-result').textContent = 'Saved.';
      await refresh();
    });

    $('#start-schoolbox').addEventListener('click', async () => {
      try {
        await api('/api/schoolbox/start', { method: 'POST', body: '{}' });
      } catch (error) {
        $('#schoolbox-result').textContent = error.message;
      }
    });

    $('#stop-schoolbox').addEventListener('click', async () => {
      try {
        await api('/api/schoolbox/stop', { method: 'POST', body: '{}' });
      } catch (error) {
        $('#schoolbox-result').textContent = error.message;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    try {
      await refresh();
    } catch (error) {
      setText('#runtime-pill', 'Runtime error');
      setText('#app-status', error.message);
    }
  });
})();
