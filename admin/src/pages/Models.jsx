import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';

const MODEL_PACKS = [
  {
    name: 'School Pack',
    description: 'DeepSeek R1 1.5B + Phi 3.5 + Qwen 2.5 3B (~4GB)',
    models: ['deepseek-r1:1.5b', 'phi3.5', 'qwen:3b'],
    size: '4GB',
    downloaded: true
  },
  {
    name: 'Extended Pack',
    description: 'Mistral, Llama 2, CrewAI (~8GB)',
    models: ['mistral', 'llama2', 'crewai'],
    size: '8GB',
    downloaded: false
  }
];

export default function Models() {
  const [downloading, setDownloading] = useState(null);

  const handleDownload = (packName) => {
    setDownloading(packName);
    setTimeout(() => setDownloading(null), 2000);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>AI Models</h2>
        <p>Manage Ollama LLM models and Flux image generation</p>
      </div>

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
                    backgroundColor: 'var(--color-border)',
                    borderRadius: '3px',
                    display: 'inline-block',
                    marginRight: '0.5rem',
                    marginBottom: '0.25rem'
                  }}>
                    {model}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  {pack.size}
                </span>
                {pack.downloaded ? (
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
                    onClick={() => handleDownload(pack.name)}
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
              color: 'var(--color-warning)',
              marginTop: '0.5rem'
            }}>
              ⚠ Requires NVIDIA GPU with 8GB+ VRAM
            </div>
          </div>
          <button className="btn btn-primary">
            <span style={{ marginRight: '0.5rem' }}>⬇</span> Download Flux Model
          </button>
        </div>
      </div>

      {/* Downloaded models list */}
      <div className="card">
        <div className="card-header">
          <h3>Installed Models</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            fontSize: '0.95rem'
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Model</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Size</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Downloaded</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {['deepseek-r1:1.5b', 'phi3.5', 'qwen:3b'].map(model => (
                <tr key={model} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem' }}>{model}</td>
                  <td style={{ padding: '0.75rem' }}>~1.5GB</td>
                  <td style={{ padding: '0.75rem', color: 'var(--color-success)' }}>✓</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button className="btn btn-small btn-error">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
