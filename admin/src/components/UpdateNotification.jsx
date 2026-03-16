import React, { useState, useEffect } from 'react';
import { Download, AlertCircle, CheckCircle, X, RefreshCw } from 'lucide-react';

export default function UpdateNotification() {
  const [updateState, setUpdateState] = useState({
    checking: false,
    available: false,
    downloading: false,
    downloaded: false,
    error: null,
    version: null,
    releaseNotes: null,
    downloadProgress: 0,
    currentVersion: null
  });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.alloAPI) return;

    // Get current version on mount
    window.alloAPI.getVersion().then(versionInfo => {
      setUpdateState(prev => ({
        ...prev,
        currentVersion: versionInfo.current,
        available: versionInfo.updateAvailable,
        downloaded: versionInfo.updateDownloaded
      }));
    });

    // Listen for update events
    window.alloAPI.onUpdateChecking(() => {
      setUpdateState(prev => ({ ...prev, checking: true }));
    });

    window.alloAPI.onUpdateAvailable((info) => {
      setUpdateState(prev => ({
        ...prev,
        checking: false,
        available: true,
        version: info.version,
        releaseNotes: info.releaseNotes,
        error: null
      }));
      setDismissed(false); // Show notification
    });

    window.alloAPI.onUpdateNotAvailable(() => {
      setUpdateState(prev => ({
        ...prev,
        checking: false,
        available: false
      }));
    });

    window.alloAPI.onUpdateDownloadProgress((progress) => {
      setUpdateState(prev => ({
        ...prev,
        downloading: true,
        downloadProgress: progress.percent
      }));
    });

    window.alloAPI.onUpdateDownloaded((info) => {
      setUpdateState(prev => ({
        ...prev,
        downloading: false,
        downloaded: true,
        version: info.version,
        releaseNotes: info.releaseNotes
      }));
      setDismissed(false); // Show notification
    });

    window.alloAPI.onUpdateError((error) => {
      setUpdateState(prev => ({
        ...prev,
        checking: false,
        downloading: false,
        error: error.message
      }));
    });
  }, []);

  const handleCheckForUpdates = async () => {
    if (!window.alloAPI) return;
    
    setUpdateState(prev => ({ ...prev, checking: true, error: null }));
    const result = await window.alloAPI.checkForUpdates();
    
    if (result.error) {
      setUpdateState(prev => ({
        ...prev,
        checking: false,
        error: result.error
      }));
    }
  };

  const handleDownload = async () => {
    if (!window.alloAPI) return;
    
    setUpdateState(prev => ({ ...prev, downloading: true, error: null }));
    const result = await window.alloAPI.downloadUpdate();
    
    if (!result.success) {
      setUpdateState(prev => ({
        ...prev,
        downloading: false,
        error: result.error || result.message
      }));
    }
  };

  const handleInstall = async () => {
    if (!window.alloAPI) return;
    
    const confirmed = window.confirm(
      'The application will restart to install the update. Any unsaved changes will be lost. Continue?'
    );
    
    if (confirmed) {
      await window.alloAPI.installUpdate();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Don't show if dismissed or no update available
  if (dismissed || (!updateState.available && !updateState.downloaded && !updateState.error)) {
    return null;
  }

  // Error state
  if (updateState.error) {
    return (
      <div style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        maxWidth: '400px',
        backgroundColor: 'rgba(239, 68, 68, 0.95)',
        color: 'white',
        padding: '1rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 9999,
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start'
      }}>
        <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Update Error</div>
          <div style={{ fontSize: '0.875rem', opacity: 0.95 }}>{updateState.error}</div>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '0.25rem',
            opacity: 0.8
          }}
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  // Update downloaded - ready to install
  if (updateState.downloaded) {
    return (
      <div style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        maxWidth: '400px',
        backgroundColor: 'rgba(16, 185, 129, 0.95)',
        color: 'white',
        padding: '1rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 9999,
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start'
      }}>
        <CheckCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
            Update Ready: v{updateState.version}
          </div>
          <div style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
            Update downloaded. Restart to install.
          </div>
          <button
            onClick={handleInstall}
            style={{
              backgroundColor: 'white',
              color: 'rgb(16, 185, 129)',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Restart & Install
          </button>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '0.25rem',
            opacity: 0.8
          }}
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  // Downloading update
  if (updateState.downloading) {
    return (
      <div style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        maxWidth: '400px',
        backgroundColor: 'rgba(59, 130, 246, 0.95)',
        color: 'white',
        padding: '1rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 9999
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
          <Download size={20} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600 }}>Downloading Update</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>v{updateState.version}</div>
          </div>
        </div>
        <div style={{
          height: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div
            style={{
              height: '100%',
              backgroundColor: 'white',
              width: `${updateState.downloadProgress}%`,
              transition: 'width 0.3s'
            }}
          />
        </div>
        <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.9 }}>
          {updateState.downloadProgress}% complete
        </div>
      </div>
    );
  }

  // Update available - not downloaded yet
  if (updateState.available) {
    return (
      <div style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        maxWidth: '400px',
        backgroundColor: 'rgba(59, 130, 246, 0.95)',
        color: 'white',
        padding: '1rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 9999,
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start'
      }}>
        <Download size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
            Update Available: v{updateState.version}
          </div>
          <div style={{ fontSize: '0.875rem', marginBottom: '0.75rem', opacity: 0.95 }}>
            Current: v{updateState.currentVersion}
          </div>
          {updateState.releaseNotes && (
            <div style={{
              fontSize: '0.75rem',
              marginBottom: '0.75rem',
              padding: '0.5rem',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '4px',
              maxHeight: '100px',
              overflow: 'auto'
            }}>
              {updateState.releaseNotes}
            </div>
          )}
          <button
            onClick={handleDownload}
            style={{
              backgroundColor: 'white',
              color: 'rgb(59, 130, 246)',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Download Update
          </button>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '0.25rem',
            opacity: 0.8
          }}
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return null;
}
