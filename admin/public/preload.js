const { contextBridge, ipcRenderer } = require('electron');

// Expose setup API to React
contextBridge.exposeInMainWorld('alloAPI', {
  setup: {
    check: () => {
      console.log('[preload:setup:check] Calling setup:check handler');
      return ipcRenderer.invoke('setup:check');
    },
    saveConfig: (setupData) => {
      console.log('[preload:setup:saveConfig] Saving config for:', setupData.deploymentType);
      return ipcRenderer.invoke('setup:save-config', setupData);
    },
    getConfig: () => {
      console.log('[preload:setup:getConfig] Getting saved config');
      return ipcRenderer.invoke('setup:get-config');
    },
    checkDocker: (deploymentType) => {
      console.log('[preload:setup:checkDocker] Checking Docker for:', deploymentType);
      return ipcRenderer.invoke('setup:check-docker', deploymentType);
    },
    browseFolder: (defaultPath) => {
      console.log('[preload:setup:browseFolder] Opening folder browser');
      return ipcRenderer.invoke('setup:browse-folder', defaultPath);
    },
    detectHardware: () => {
      console.log('[preload:setup:detectHardware] Detecting hardware');
      return ipcRenderer.invoke('setup:detect-hardware');
    },
    getServices: (hardwareTier) => {
      console.log('[preload:setup:getServices] Getting services for tier:', hardwareTier);
      return ipcRenderer.invoke('setup:get-services', hardwareTier);
    },
    startDeployment: (setupData) => {
      console.log('[preload:setup:startDeployment] Starting deployment');
      return ipcRenderer.invoke('setup:start-deployment', setupData);
    },
    onDeploymentProgress: (callback) => {
      console.log('[preload:setup:onDeploymentProgress] Registered progress listener');
      const unsubscribe = ipcRenderer.on('deployment:progress', (event, data) => {
        callback({ type: 'progress', ...data });
      });
      ipcRenderer.on('deployment:complete', (event, data) => {
        callback({ type: 'complete', ...data });
      });
      ipcRenderer.on('deployment:error', (event, data) => {
        callback({ type: 'error', ...data });
      });
      return unsubscribe;
    },
    uninstall: () => {
      console.log('[preload:setup:uninstall] Starting uninstall');
      return ipcRenderer.invoke('setup:uninstall');
    },
    uninstallServices: (options) => {
      console.log('[preload:setup:uninstallServices] Selective uninstall:', options);
      return ipcRenderer.invoke('setup:uninstall-services', options);
    },
    getInstalledServices: () => {
      console.log('[preload:setup:getInstalledServices] Getting installed services');
      return ipcRenderer.invoke('setup:get-installed-services');
    },
    onUninstallProgress: (callback) => {
      ipcRenderer.on('uninstall:progress', (event, data) => {
        callback(data);
      });
    }
  },

  // ── Flat model API (used by Models.jsx) ──────────────────────────────────
  // Now handled by LM Studio (llama.cpp)
  listModels: () => ipcRenderer.invoke('llm:get-models'),
  pullModel: (model) => ipcRenderer.invoke('llm:pull-model', { modelId: model }),

  // ── AI Config read/write (used by AIConfig.jsx) ──────────────────────────
  readAIConfig: () => ipcRenderer.invoke('config:read-ai'),
  writeAIConfig: (config) => ipcRenderer.invoke('config:write-ai', config),

  // ── Service health & status (used by Dashboard.jsx, Services.jsx) ────────
  getHealth:        () => ipcRenderer.invoke('services:health'),
  getServices:      () => ipcRenderer.invoke('services:list'),
  getSystemMetrics: () => ipcRenderer.invoke('services:metrics'),
  startStack:       () => ipcRenderer.invoke('services:start-all'),
  stopStack:        () => ipcRenderer.invoke('services:stop-all'),
  restartService:   (service) => ipcRenderer.invoke('services:restart-one', service),
  getServiceLogs:   (service) => ipcRenderer.invoke('services:logs', service),

  // ── Local App (B4.4 + C3.1) ───────────────────────────────────────────────
  localApp: {
    // Read ~/.alloflow/local_config.json
    readConfig: () => ipcRenderer.invoke('local:read-config'),
    // Write ~/.alloflow/local_config.json
    writeConfig: (cfg) => ipcRenderer.invoke('local:write-config', cfg),
    // Get local app URL + SQLite backend URL + port info
    getUrl: () => ipcRenderer.invoke('local:get-url'),
    // Check if SQLite backend is running
    backendStatus: () => ipcRenderer.invoke('local:backend-status'),
    // Re-open local app in system browser to reload config (picks up new OAuth tokens)
    reload: () => ipcRenderer.invoke('localApp:reload'),
  },

  // ── Gemini OAuth (image generation via Google Sign-In) ──────────────────
  geminiOAuth: {
    // Start Google OAuth flow — opens system browser, returns { success, email } or { success: false, error }
    start:    () => ipcRenderer.invoke('oauth:gemini-start'),
    // Check current connection status — returns { connected, email?, expiry? }
    status:   () => ipcRenderer.invoke('oauth:gemini-status'),
    // Get a valid access token (auto-refreshed) — returns token string or null
    getToken: () => ipcRenderer.invoke('oauth:gemini-get-token'),
    // Revoke and clear stored credentials
    revoke:   () => ipcRenderer.invoke('oauth:gemini-revoke'),
  },

  // ── Log Streaming ──────────────────────────────────────────────────────────
  logs: {
    // Stream main process logs (deployment, service startup, etc.)
    onMainLogs: (callback) => {
      ipcRenderer.on('logs:main', (event, data) => callback(data));
    },
    // Stream LLM engine logs
    onLLMEngineLogs: (callback) => {
      ipcRenderer.on('logs:llm-engine', (event, data) => callback(data));
    },
    // Stream Piper logs
    onPiperLogs: (callback) => {
      ipcRenderer.on('logs:piper', (event, data) => callback(data));
    },
    // Stream Flux logs
    onFluxLogs: (callback) => {
      ipcRenderer.on('logs:flux', (event, data) => callback(data));
    },
    // Request recent logs from file (for log viewer)
    getRecentLogs: (service = 'main', lines = 100) => {
      return ipcRenderer.invoke('logs:get-recent', { service, lines });
    },
    // Clear logs for a service
    clearLogs: (service = 'main') => {
      return ipcRenderer.invoke('logs:clear', { service });
    }
  },
});
