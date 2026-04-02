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
  pocketbase: {
    checkAdmin: () => {
      console.log('[preload:pocketbase:checkAdmin] Checking if admin is configured');
      return ipcRenderer.invoke('pocketbase:check-admin');
    }
  },
  ollama: {
    getInstalledModels: () => {
      return ipcRenderer.invoke('ollama:get-installed-models');
    },
    getAvailableModels: () => {
      return ipcRenderer.invoke('ollama:get-available-models');
    },
    pullModel: (modelId) => {
      return ipcRenderer.invoke('ollama:pull-model', { modelId });
    },
    checkStatus: () => {
      return ipcRenderer.invoke('ollama:check-status');
    },
    checkUpdates: () => {
      return ipcRenderer.invoke('ollama:check-updates');
    },
    onPullProgress: (callback) => {
      ipcRenderer.on('ollama:pull-progress', (event, data) => {
        callback(data);
      });
    },
    onUpdateAvailable: (callback) => {
      ipcRenderer.on('ollama:update-available', (event, data) => {
        callback(data);
      });
    }
  }
});
