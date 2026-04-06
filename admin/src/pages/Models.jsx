import React, { useState, useEffect } from 'react';

// Model recommendations based on VRAM and AlloFlow's educational use case
const MODEL_RECOMMENDATIONS = {
  // AlloFlow needs: content generation, reading comprehension, math word problems,
  // student feedback, lesson planning — instruction-following models work best
  low: { // ≤8GB VRAM or no GPU
    primary: { id: 'gemma-3-4b-it', name: 'Google Gemma 3 4B', size: '~3 GB', why: 'Best quality at small size. Great for lesson generation and student feedback.' },
    alt: { id: 'phi-4-mini', name: 'Microsoft Phi-4 Mini', size: '~2.5 GB', why: 'Very fast, good at math and reasoning tasks.' },
  },
  mid: { // 12GB VRAM
    primary: { id: 'gemma-3-12b-it', name: 'Google Gemma 3 12B', size: '~8 GB', why: 'Excellent balance of speed and quality for all AlloFlow features.' },
    alt: { id: 'mistral-7b-instruct', name: 'Mistral 7B Instruct', size: '~4.5 GB', why: 'Fast and reliable for content generation.' },
  },
  high: { // ≥16GB VRAM
    primary: { id: 'gemma-3-27b-it', name: 'Google Gemma 3 27B', size: '~17 GB', why: 'Top quality for content generation, detailed feedback, and complex lesson planning.' },
    alt: { id: 'gemma-3-12b-it', name: 'Google Gemma 3 12B', size: '~8 GB', why: 'Faster alternative — excellent quality with quicker responses.' },
  }
};

function getRecommendationTier(hardware) {
  if (!hardware?.gpu || hardware.gpu.vramGB === 'unknown') return 'low';
  const vram = typeof hardware.gpu.vramGB === 'number' ? hardware.gpu.vramGB : 0;
  if (vram >= 16) return 'high';
  if (vram >= 10) return 'mid';
  return 'low';
}

export default function Models() {
  const [hardware, setHardware] = useState(null);
  const [installedModels, setInstalledModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lmStudioRunning, setLmStudioRunning] = useState(false);
  const [fluxStatus, setFluxStatus] = useState(null); // null | 'checking' | { running, gpu_accelerated, device, model }

  useEffect(() => {
    detectHardware();
    loadInstalledModels();
    checkFluxStatus();
    const interval = setInterval(() => {
      loadInstalledModels();
      checkFluxStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const detectHardware = async () => {
    try {
      const result = await window.alloAPI.setup.detectHardware();
      if (result.success) {
        setHardware(result.hardware);
      }
    } catch (err) {
      console.error('Hardware detection failed:', err);
    }
  };

  const loadInstalledModels = async () => {
    try {
      const result = await window.alloAPI.listModels();
      if (result.success) {
        setLmStudioRunning(true);
        const models = (result.models || []).map(m => typeof m === 'string' ? m : m.id || m.name || '');
        setInstalledModels(models.filter(Boolean));
      } else {
        setLmStudioRunning(false);
      }
    } catch (err) {
      setLmStudioRunning(false);
    } finally {
      setLoading(false);
    }
  };

  const checkFluxStatus = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('http://localhost:7860/health', { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        setFluxStatus({ running: true, ...data });
      } else {
        setFluxStatus({ running: false });
      }
    } catch {
      setFluxStatus({ running: false });
    }
  };

  const tier = getRecommendationTier(hardware);
  const rec = MODEL_RECOMMENDATIONS[tier];
  const gpuName = hardware?.gpu?.name || 'No GPU detected';
  const vramGB = hardware?.gpu?.vramGB;
  const vramLabel = typeof vramGB === 'number' ? `${vramGB} GB VRAM` : 'Unknown VRAM';

  return (
    <div className="page">
      <div className="page-header">
        <h2>AI Models</h2>
        <p>AlloFlow uses LM Studio to run AI models locally on your machine</p>
      </div>

      {/* Hardware Info */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🖥️</span>
          <div>
            <strong>{gpuName}</strong>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {hardware ? `${hardware.ramGB} GB RAM • ${vramLabel}` : 'Detecting hardware...'}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: lmStudioRunning ? 'var(--color-success)' : 'var(--color-error)',
              display: 'inline-block'
            }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              LM Studio {lmStudioRunning ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        </div>
      </div>

      {/* Recommended Model */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-header">
          <h3>Recommended for Your Hardware</h3>
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{
            padding: '1rem',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>⭐</span>
              <strong style={{ fontSize: '1.1rem' }}>{rec.primary.name}</strong>
              <span style={{
                fontSize: '0.75rem',
                padding: '0.15rem 0.5rem',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                borderRadius: '10px',
                color: 'var(--color-primary)'
              }}>Best Pick</span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0.25rem 0' }}>
              {rec.primary.why}
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              Download size: {rec.primary.size} • Search for <code style={{ 
                backgroundColor: 'var(--color-bg)', padding: '0.1rem 0.4rem', borderRadius: '3px',
                fontFamily: 'monospace', fontSize: '0.85rem'
              }}>{rec.primary.id}</code> in LM Studio
            </div>
          </div>

          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.9rem' }}>🔄</span>
              <strong>{rec.alt.name}</strong>
              <span style={{
                fontSize: '0.7rem', padding: '0.1rem 0.4rem',
                backgroundColor: 'var(--color-border)', borderRadius: '10px'
              }}>Alternative</span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.25rem 0' }}>
              {rec.alt.why}
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Download size: {rec.alt.size} • Search for <code style={{
                backgroundColor: 'var(--color-bg-alt, var(--color-border))', padding: '0.1rem 0.4rem', borderRadius: '3px',
                fontFamily: 'monospace', fontSize: '0.85rem'
              }}>{rec.alt.id}</code> in LM Studio
            </div>
          </div>
        </div>
      </div>

      {/* How to Download a Model */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-header">
          <h3>How to Download a Model in LM Studio</h3>
        </div>
        <div style={{ padding: '1rem' }}>
          <ol style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '2' }}>
            <li>Open <strong>LM Studio</strong> on your computer (it should already be installed)</li>
            <li>Click the <strong>Search</strong> icon (magnifying glass) in the left sidebar</li>
            <li>Search for the recommended model: <code style={{
              backgroundColor: 'var(--color-bg)', padding: '0.15rem 0.5rem', borderRadius: '3px',
              fontFamily: 'monospace'
            }}>{rec.primary.id}</code></li>
            <li>Click <strong>Download</strong> on the model (choose a <strong>Q4_K_M</strong> quantization for best balance of speed and quality)</li>
            <li>Once downloaded, click the model to <strong>Load</strong> it</li>
            <li>Return here — AlloFlow will automatically detect and use the loaded model</li>
          </ol>
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(234, 179, 8, 0.08)',
            border: '1px solid rgba(234, 179, 8, 0.2)',
            borderRadius: '6px',
            fontSize: '0.85rem',
            color: 'var(--color-text-muted)'
          }}>
            💡 <strong>Tip:</strong> Make sure to load a model in LM Studio before using AI features in AlloFlow.
            The model must be actively loaded (not just downloaded) for AlloFlow to use it.
          </div>
        </div>
      </div>

      {/* Currently Loaded Models */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-header">
          <h3>Loaded Models {lmStudioRunning && `(${installedModels.length})`}</h3>
        </div>
        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Checking LM Studio...
          </div>
        ) : !lmStudioRunning ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
            <p>LM Studio is not running. Start it from the <strong>Services</strong> tab or open LM Studio directly.</p>
          </div>
        ) : installedModels.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
            <p>No models loaded in LM Studio. Follow the instructions above to download and load a model.</p>
          </div>
        ) : (
          <div style={{ padding: '0.5rem 1rem' }}>
            {installedModels.map(model => (
              <div key={model} style={{
                padding: '0.6rem 0',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ color: 'var(--color-success)' }}>✓</span>
                <span>{model}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Flux Image Generation */}
      <div className="card">
        <div className="card-header">
          <h3>🎨 Image Generation (Flux)</h3>
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: fluxStatus?.running ? 'var(--color-success)' : 'var(--color-error)',
              display: 'inline-block'
            }} />
            <span style={{ fontSize: '0.9rem' }}>
              {fluxStatus?.running ? 'Flux server running' : 'Flux server not running'}
            </span>
            {fluxStatus?.running && fluxStatus?.device && (
              <span style={{
                fontSize: '0.75rem', padding: '0.1rem 0.5rem',
                backgroundColor: fluxStatus.device !== 'cpu' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                borderRadius: '10px',
                color: fluxStatus.device !== 'cpu' ? 'var(--color-success)' : 'inherit'
              }}>
                {fluxStatus.gpu_accelerated ? '⚡ GPU Accelerated' : '🐢 CPU (slow)'}
              </span>
            )}
          </div>

          {fluxStatus?.running ? (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: '6px',
              fontSize: '0.85rem'
            }}>
              <strong>Model:</strong> {fluxStatus.model || 'segmind/SSD-1B'}<br />
              <strong>Device:</strong> {fluxStatus.device || 'unknown'}
              {fluxStatus.fallback_reason && (
                <div style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
                  ⚠️ {fluxStatus.fallback_reason}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(234, 179, 8, 0.08)',
              border: '1px solid rgba(234, 179, 8, 0.2)',
              borderRadius: '6px',
              fontSize: '0.85rem',
              color: 'var(--color-text-muted)'
            }}>
              The Flux image generation model downloads automatically when the service starts for the first time (~5 GB download).
              Start it from the <strong>Services</strong> tab. The first launch takes several minutes while the model downloads.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
