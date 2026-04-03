import React, { useState, useEffect } from 'react';

const MODEL_PACKS = [
  {
    name: 'School Pack',
    description: 'DeepSeek R1 1.5B + Phi 3.5 + Qwen 2.5 3B (~4GB)',
    models: ['deepseek-r1:1.5b', 'phi3.5', 'qwen:3b'],
    size: '4GB'
  },
  {
    name: 'Extended Pack',
    description: 'Mistral, Llama 2 (~8GB)',
    models: ['mistral', 'llama2'],
    size: '8GB'
  }
];

export default function Models() {
  const [downloading, setDownloading] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [installedModels, setInstalledModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInstalledModels();
    const interval = setInterval(loadInstalledModels, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadInstalledModels = async () => {
    try {
      const result = await window.alloAPI.listModels();
      if (result.success) {
        // Models come as objects with {name, digest, size, modifiedAt}
        const modelNames = (result.models || []).map(m => typeof m === 'string' ? m : m.name || m.model || '');
        setInstalledModels(modelNames.filter(Boolean));
      } else {
        console.error('Failed to load models:', result.error);
      }
    } catch (err) {
      console.error('Error loading models:', err);
    } finally {
      setLoading(false);
    }
  };

  const isModelInstalled = (modelName) => {
    const searchName = modelName.split(':')[0].toLowerCase();
    return installedModels.some(installed => 
      installed.toLowerCase().includes(searchName)
    );
  };

  const isPackDownloaded = (packModels) => {
    return packModels.every(model => isModelInstalled(model));
  };

  const handleDownloadPack = async (packName, models) => {
    setDownloading(packName);
    setLastError(null);
    
    // First check if Ollama is running
    try {
      const status = await window.alloAPI.ollama.checkStatus();
      if (!status.success || !status.isRunning) {
        setLastError('Ollama is not running. Go to the Services tab and start it first.');
        alert('Ollama is not running. Start it from the Services tab first.');
        setDownloading(null);
        return;
      }
    } catch (err) {
      setLastError('Cannot connect to Ollama. Make sure it is running.');
      alert('Cannot connect to Ollama. Start it from the Services tab first.');
      setDownloading(null);
      return;
    }

    try {
      let pulled = 0;
      let skipped = 0;
      let failed = 0;

      for (const model of models) {
        // Skip if already installed
        if (isModelInstalled(model)) {
          console.log(`Model ${model} already installed, skipping`);
          skipped++;
          continue;
        }

        console.log(`Pulling model: ${model}`);
        try {
          const result = await window.alloAPI.pullModel(model);
          
          if (!result.success) {
            setLastError(`Failed to pull ${model}: ${result.error}`);
            console.error(`Error pulling ${model}:`, result.error);
            failed++;
            continue;
          }
          
          console.log(`Successfully pulled ${model}`);
          pulled++;
        } catch (err) {
          console.error(`Error pulling ${model}:`, err.message);
          setLastError(`Failed to pull ${model}: ${err.message}`);
          failed++;
        }
      }
      
      // Reload installed models
      await loadInstalledModels();
      
      if (failed > 0) {
        alert(`Pack "${packName}": ${pulled} downloaded, ${skipped} already installed, ${failed} failed. Check errors above.`);
      } else {
        alert(`Model pack "${packName}" complete! ${pulled} downloaded, ${skipped} already installed.`);
      }
    } catch (err) {
      setLastError(`Error downloading pack: ${err.message}`);
      alert(`Error downloading pack: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadFlux = async () => {
    setDownloading('flux');
    setLastError(null);
    
    // Flux is NOT an Ollama model — it requires separate installation via nativeProcessManager
    setLastError('Flux image generation requires separate installation. It will be installed automatically during initial setup if selected, or can be installed via the setup wizard.');
    alert('Flux requires a separate Python environment and GPU. It is installed during initial setup if you selected it. To add it later, re-run the setup wizard.');
    setDownloading(null);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>AI Models</h2>
        <p>Manage Ollama LLM models and Flux image generation</p>
      </div>

      {lastError && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderLeft: '4px solid var(--color-error)',
          borderRadius: '4px',
          marginBottom: '1rem',
          color: 'var(--color-error)'
        }}>
          ⚠ {lastError}
        </div>
      )}

      {/* LLM Models */}
      <div className="card">
        <div className="card-header">
          <h3>LLM Model Packs</h3>
        </div>
        <div className="grid grid-2">
          {MODEL_PACKS.map(pack => (
            <div key={pack.name} style={{
              padding: '1rem',
              backgroundColor: 'var(--color-bg)',
              borderRadius: '6px',
              border: `1px solid var(--color-border)`
            }}>
              <h4 style={{ marginBottom: '0.25rem' }}>{pack.name}</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                {pack.description}
              </p>
              <div style={{ marginBottom: '0.75rem' }}>
                {pack.models.map(model => (
                  <div key={model} style={{
                    fontSize: '0.8rem',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: isModelInstalled(model) ? 'rgba(16, 185, 129, 0.1)' : 'var(--color-border)',
                    borderRadius: '3px',
                    display: 'inline-block',
                    marginRight: '0.5rem',
                    marginBottom: '0.25rem',
                    color: isModelInstalled(model) ? 'var(--color-success)' : 'inherit'
                  }}>
                    {isModelInstalled(model) ? '✓ ' : ''}{model}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  {pack.size}
                </span>
                {isPackDownloaded(pack.models) ? (
                  <span style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-success)',
                    fontWeight: 600
                  }}>
                    ✓ Downloaded
                  </span>
                ) : (
                  <button 
                    className="btn btn-small btn-primary"
                    onClick={() => handleDownloadPack(pack.name, pack.models)}
                    disabled={downloading === pack.name}
                  >
                    {downloading === pack.name ? '⏳ Downloading...' : '⬇ Download'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flux Image Generation */}
      <div className="card">
        <div className="card-header">
          <h3>Image Generation</h3>
        </div>
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{
            padding: '2rem',
            backgroundColor: 'var(--color-bg)',
            borderRadius: '6px',
            border: '1px dashed var(--color-border)',
            marginBottom: '1rem'
          }}>
            <h4>Flux.1-schnell</h4>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Fast, high-quality image generation (requires GPU)
            </p>
            <div style={{
              fontSize: '0.875rem',
              color: isModelInstalled('flux-schnell') ? 'var(--color-success)' : 'var(--color-warning)',
              marginTop: '0.5rem'
            }}>
              {isModelInstalled('flux-schnell') 
                ? '✓ Installed' 
                : '⚠ Requires NVIDIA GPU with 8GB+ VRAM'}
            </div>
          </div>
          {!isModelInstalled('flux-schnell') && (
            <button 
              className="btn btn-primary"
              onClick={handleDownloadFlux}
              disabled={downloading === 'flux'}
            >
              <span style={{ marginRight: '0.5rem' }}>⬇</span> 
              {downloading === 'flux' ? 'Downloading Flux...' : 'Download Flux Model'}
            </button>
          )}
        </div>
      </div>

      {/* Downloaded models list */}
      <div className="card">
        <div className="card-header">
          <h3>Installed Models ({installedModels.length})</h3>
        </div>
        {loading ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading models...
          </div>
        ) : installedModels.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No models installed yet. Download a pack above to get started.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              fontSize: '0.95rem'
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Model</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {installedModels.map(model => (
                  <tr key={model} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem' }}>{model}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--color-success)' }}>✓ Installed</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
