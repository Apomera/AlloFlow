const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC methods to the renderer process
contextBridge.exposeInMainWorld('clientAPI', {
  // Configuration
  getConfig: () => ipcRenderer.invoke('app:get-config'),
  getServerUrl: () => ipcRenderer.invoke('app:get-server-url'),
  getRole: () => ipcRenderer.invoke('app:get-role'),

  // Updates
  configureUpdates: (config) => ipcRenderer.invoke('app:configure-updates', config),
  installUpdate: () => ipcRenderer.invoke('app:install-update'),

  // Update events
  onUpdateAvailable: (callback) => ipcRenderer.on('update:available', (event, data) => callback(data)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', (event, data) => callback(data)),
  onUpdateError: (callback) => ipcRenderer.on('update:error', (event, data) => callback(data)),

  // GPU Detection & Docker Setup API
  detectGPU: () =>
    ipcRenderer.invoke('setup:detect-gpu'),
  setupDocker: () =>
    ipcRenderer.invoke('docker-setup:run'),
  startServices: () =>
    ipcRenderer.invoke('docker:start-services'),
  stopServices: () =>
    ipcRenderer.invoke('docker:stop-services'),
  
  // GPU events
  onGPUDetected: (callback) =>
    ipcRenderer.on('docker:gpu-detected', (event, data) => callback(data)),
  onDockerSetupComplete: (callback) =>
    ipcRenderer.on('docker:setup-complete', (event, data) => callback(data)),
  onServicesStarted: (callback) =>
    ipcRenderer.on('docker:services-started', (event, data) => callback(data)),
  onServicesStopped: (callback) =>
    ipcRenderer.on('docker:services-stopped', (event, data) => callback(data)),
});
