(function () {
  'use strict';

  const state = {
    config: null,
    health: null,
    providers: [],
  };

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

  function renderHealth() {
    if (!state.health) return;
    const pill = $('#runtime-pill');
    pill.textContent = state.health.status === 'ok' ? 'Runtime ready' : 'Runtime issue';
    pill.classList.toggle('ok', state.health.status === 'ok');

    const appStatus = state.health.appReachable
      ? 'Connected to ' + state.health.appUrl
      : 'Waiting for ' + state.health.appUrl;
    setText('#app-status', appStatus);
    $('#app-url').value = state.health.appUrl || '';
    $('#open-app-link').href = state.health.appUrl || '#';
    $('#app-frame').src = state.health.appReachable ? state.health.appUrl : 'about:blank';

    setText('#runtime-version', state.health.version);
    setText('#runtime-data-dir', state.health.dataDir);
    setText('#runtime-config-path', state.health.configPath);
    setText('#runtime-command-dir', state.health.commandCenterDir);
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
      info.lastElementChild.textContent = provider.baseUrl;

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
        await refresh();
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

  async function refresh() {
    const [health, config, providerResponse] = await Promise.all([
      api('/api/health'),
      api('/api/config'),
      api('/api/providers'),
    ]);
    state.health = health;
    state.config = config;
    state.providers = providerResponse.providers || [];
    renderHealth();
    renderProviderSelect();
    renderProviders();
    renderSchoolBox();
  }

  function bindEvents() {
    $$('.tab').forEach((tab) => {
      tab.addEventListener('click', () => selectPane(tab.dataset.tab));
    });

    $('#refresh-all').addEventListener('click', refresh);
    $('#refresh-providers').addEventListener('click', refresh);

    $('#save-app-url').addEventListener('click', async () => {
      await saveConfig({ appUrl: $('#app-url').value.trim() || 'http://localhost:3000' });
      await refresh();
    });

    $('#provider-select').addEventListener('change', renderProviderEditor);

    $('#save-provider').addEventListener('click', async () => {
      const id = $('#provider-select').value;
      const baseUrl = $('#provider-base-url').value.trim();
      const apiKey = $('#provider-api-key').value;
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
      $('#provider-result').textContent = 'Saved.';
      await refresh();
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

