'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const isMainFrame = typeof window !== 'undefined' && window === window.top;
const isTrustedLoopbackFrame = (() => {
  try {
    if (typeof window === 'undefined' || !window.location) return false;
    const proto = String(window.location.protocol || '');
    const host = String(window.location.hostname || '').toLowerCase();
    return (proto === 'http:' || proto === 'https:') && (host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '[::1]');
  } catch (_) {
    return false;
  }
})();

if (isMainFrame) {
  contextBridge.exposeInMainWorld('alloflowDesktop', {
    getRuntimeInfo: () => ipcRenderer.invoke('alloflow-desktop:runtime-info'),
    getUpdateStatus: () => ipcRenderer.invoke('alloflow-desktop:update-status'),
    setUpdateChannel: (channel) => ipcRenderer.invoke('alloflow-desktop:set-update-channel', channel),
    checkForUpdates: () => ipcRenderer.invoke('alloflow-desktop:check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('alloflow-desktop:download-update'),
    installUpdate: () => ipcRenderer.invoke('alloflow-desktop:install-update'),
    setFullScreen: (enabled) => ipcRenderer.invoke('alloflow-desktop:set-full-screen', Boolean(enabled)),
    isFullScreen: () => ipcRenderer.invoke('alloflow-desktop:is-full-screen'),
    updateCoachOverlay: (payload) => ipcRenderer.invoke('alloflow-desktop:coach-overlay-update', payload),
    hideCoachOverlay: () => ipcRenderer.invoke('alloflow-desktop:coach-overlay-hide'),
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
} else if (isTrustedLoopbackFrame) {
  // Embedded app subframes only need the video coach overlay controls, never updater or shell IPC.
  contextBridge.exposeInMainWorld('alloflowDesktop', {
    updateCoachOverlay: (payload) => ipcRenderer.invoke('alloflow-desktop:coach-overlay-update', payload),
    hideCoachOverlay: () => ipcRenderer.invoke('alloflow-desktop:coach-overlay-hide'),
  });
}

// Ported from the AlloFlow Admin app: the doc pipeline's batch export checks
// window.alloAPI.remediation.saveFiles and, when present, saves the artifact
// set to a user-chosen local folder instead of a browser ZIP download.
// Runs in the same-origin #app-frame too (nodeIntegrationInSubFrames), never in opaque/cross-origin subframes.
if (isMainFrame || isTrustedLoopbackFrame) {
  contextBridge.exposeInMainWorld('alloAPI', {
    remediation: {
      saveFiles: (payload) => ipcRenderer.invoke('remediation:save-files', payload),
      revealPath: (p) => ipcRenderer.invoke('remediation:reveal-path', p),
      // Folder ingestion for the batch screen's "Scan Folder" button (used by
      // the remediation install choice, but available to every desktop build).
      selectFolder: () => ipcRenderer.invoke('remediation:select-folder'),
      readFileBase64: (p) => ipcRenderer.invoke('remediation:read-file-base64', p),
    },
  });
}
