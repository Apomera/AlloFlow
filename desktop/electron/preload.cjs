'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('alloflowDesktop', {
  getRuntimeInfo: () => ipcRenderer.invoke('alloflow-desktop:runtime-info'),
  getUpdateStatus: () => ipcRenderer.invoke('alloflow-desktop:update-status'),
  setUpdateChannel: (channel) => ipcRenderer.invoke('alloflow-desktop:set-update-channel', channel),
  checkForUpdates: () => ipcRenderer.invoke('alloflow-desktop:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('alloflow-desktop:download-update'),
  installUpdate: () => ipcRenderer.invoke('alloflow-desktop:install-update'),
  setFullScreen: (enabled) => ipcRenderer.invoke('alloflow-desktop:set-full-screen', Boolean(enabled)),
  isFullScreen: () => ipcRenderer.invoke('alloflow-desktop:is-full-screen'),
  onFullScreenChange: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, enabled) => callback(Boolean(enabled));
    ipcRenderer.on('alloflow-desktop:full-screen-changed', listener);
    return () => ipcRenderer.removeListener('alloflow-desktop:full-screen-changed', listener);
  },
  onUpdateStatus: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('alloflow-desktop:update-status', listener);
    return () => ipcRenderer.removeListener('alloflow-desktop:update-status', listener);
  },
});
