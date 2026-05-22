#!/usr/bin/env node
/**
 * AlloFlow Docker GPU Auto-Setup
 * 
 * Detects GPU and generates appropriate docker-compose.override.yml
 * This allows a single universal docker-compose.yml to work with any GPU
 * 
 * Usage:
 *   node docker-gpu-setup.js
 *   docker compose up -d
 */

const fs = require('fs');
const path = require('path');
const { GPUDetector } = require('../gpu-detection');

const DOCKER_DIR = path.dirname(__filename);
const OVERRIDE_FILE = path.join(DOCKER_DIR, 'docker-compose.override.yml');
const ENV_FILE = path.join(DOCKER_DIR, '.env.gpu');

class DockerGPUSetup {
  constructor() {
    this.detector = new GPUDetector();
  }

  /**
   * Generate docker-compose.override.yml based on GPU type
   */
  generateOverride() {
    const gpu = this.detector.detectGPU();
    let override = this.getBaseOverride();

    console.log(`\n🔍 GPU Detection: ${gpu.type}`);
    console.log(`📍 Driver: ${gpu.driver}`);
    console.log(`✨ Details: ${gpu.details}\n`);

    // Update services based on GPU type
    if (gpu.driver === 'cuda') {
      override = this.addNVIDIAConfig(override);
      console.log('⚙️  Generating NVIDIA CUDA configuration...');
    } else if (gpu.driver === 'rocm') {
      override = this.addAMDConfig(override);
      console.log('⚙️  Generating AMD ROCm configuration...');
    } else if (gpu.driver === 'metal') {
      override = this.addAppleSiliconConfig(override);
      console.log('⚙️  Generating Apple Silicon (Metal) configuration...');
    } else {
      override = this.addCPUConfig(override);
      console.log('⚙️  No GPU detected, using CPU-only configuration...');
      console.log('⚠️  AI inference will be slow. Consider GPU upgrade or cloud fallback.');
    }

    return override;
  }

  /**
   * Base override structure (all services inheriting from universal)
   */
  getBaseOverride() {
    return {
      version: '3.8',
      services: {
        pocketbase: {},
        ollama: {},
        flux: {},
        piper: {},
        searxng: {},
      },
    };
  }

  /**
   * Add NVIDIA CUDA GPU configuration
   */
  addNVIDIAConfig(override) {
    override.services.ollama = {
      deploy: {
        resources: {
          reservations: {
            devices: [
              {
                driver: 'nvidia',
                count: 'all',
                capabilities: ['gpu'],
              },
            ],
          },
        },
      },
    };

    override.services.flux = {
      deploy: {
        resources: {
          reservations: {
            devices: [
              {
                driver: 'nvidia',
                count: 1,  // Flux gets 1 GPU (Ollama can share or use another)
                capabilities: ['gpu'],
              },
            ],
          },
        },
      },
    };

    return override;
  }

  /**
   * Add AMD ROCm configuration
   */
  addAMDConfig(override) {
    override.services.ollama = {
      environment: [
        'ROCM_VISIBLE_DEVICES=0',
      ],
      deploy: {
        resources: {
          reservations: {
            devices: [
              {
                driver: 'rocm',
                count: 'all',
                capabilities: ['gpu'],
              },
            ],
          },
        },
      },
    };

    override.services.flux = {
      environment: [
        'ROCM_VISIBLE_DEVICES=0',
      ],
      deploy: {
        resources: {
          reservations: {
            devices: [
              {
                driver: 'rocm',
                count: 1,
                capabilities: ['gpu'],
              },
            ],
          },
        },
      },
    };

    return override;
  }

  /**
   * Add Apple Silicon (Metal) configuration
   */
  addAppleSiliconConfig(override) {
    // Apple Silicon auto-detects Metal
    override.services.ollama = {
      environment: [
        'OLLAMA_GPU=1',
      ],
    };

    override.services.flux = {
      environment: [
        'TORCH_DEVICE=mps',  // Metal Performance Shaders
      ],
    };

    return override;
  }

  /**
   * Add CPU-only configuration (all GPU disabled)
   */
  addCPUConfig(override) {
    override.services.ollama = {
      environment: [
        'OLLAMA_GPU=0',
      ],
    };

    // Remove Flux service for CPU (too slow)
    // Cloud fallback will be used instead
    delete override.services.flux;

    return override;
  }

  /**
   * Convert to YAML and write file
   */
  writeOverride(overrideObj) {
    const yaml = this.toYAML(overrideObj);
    fs.writeFileSync(OVERRIDE_FILE, yaml);
    console.log(`✅ Generated: ${OVERRIDE_FILE}`);
    return OVERRIDE_FILE;
  }

  /**
   * Simple YAML generator
   */
  toYAML(obj, indent = 0) {
    const spaces = ' '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        continue;
      }
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        yaml += `${spaces}${key}: ${value}\n`;
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            yaml += `${spaces}  -\n${this.toYAML(item, indent + 4)}`;
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        }
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n${this.toYAML(value, indent + 2)}`;
      }
    }

    return yaml;
  }

  /**
   * Generate .env file for Docker
   */
  generateEnvFile() {
    const gpu = this.detector.detectGPU();
    const docker = this.detector.checkDocker();

    const env = `# AlloFlow GPU Configuration
# Auto-generated: ${new Date().toISOString()}
# 
# This file is auto-loaded by docker compose
# Edit only if manual adjustment needed

# GPU Detection
DOCKER_GPU_SUPPORT=${gpu.dockerConfig.gpuSupport ? 'true' : 'false'}
GPU_DRIVER=${gpu.driver}
GPU_TYPE=${gpu.type}
${gpu.model ? `GPU_MODEL=${gpu.model}` : ''}
${gpu.vram ? `GPU_VRAM=${gpu.vram}` : ''}

# Environment Variables (per OS)
${gpu.driver === 'rocm' ? 'ROCM_VISIBLE_DEVICES=0' : ''}
${gpu.driver === 'cuda' ? 'CUDA_VISIBLE_DEVICES=' : ''}
${gpu.driver === 'metal' ? 'OLLAMA_GPU=1' : ''}

# Ollama Configuration
OLLAMA_GPU=${gpu.driver === 'cpu' ? '0' : '1'}
${gpu.driver === 'rocm' ? 'OLLAMA_ROCM_SUPPORTED=true' : ''}

# Flux Configuration
FLUX_MODEL=black-forest-labs/FLUX.1-schnell
MAX_IMAGE_SIZE=1024

# SearXNG Configuration
SEARXNG_SECRET_KEY=ChangeMe_Min32Chars_required!

# Docker Status
DOCKER_INSTALLED=${docker.installed ? 'true' : 'false'}
DOCKER_VERSION=${docker.version || 'unknown'}

# Detected At
DETECTION_TIME=${new Date().toISOString()}
`;

    fs.writeFileSync(ENV_FILE, env);
    console.log(`✅ Generated: ${ENV_FILE}`);
    return ENV_FILE;
  }

  /**
   * Print setup summary
   */
  printSummary() {
    const gpu = this.detector.detectGPU();
    const docker = this.detector.checkDocker();

    console.log('\n' + '='.repeat(60));
    console.log('📋 AlloFlow Docker GPU Setup Summary');
    console.log('='.repeat(60));
    console.log(`\nGPU Status:`);
    console.log(`  Type: ${gpu.type}`);
    console.log(`  Driver: ${gpu.driver}`);
    console.log(`  Supported: ${gpu.supported ? '✅' : '❌'}`);
    if (gpu.model) console.log(`  Model: ${gpu.model}`);
    if (gpu.vram) console.log(`  VRAM: ${gpu.vram}`);

    console.log(`\nDocker Status:`);
    console.log(`  Installed: ${docker.installed ? '✅' : '❌'}`);
    if (docker.version) console.log(`  Version: ${docker.version}`);

    console.log(`\nFiles Generated:`);
    console.log(`  ✅ docker-compose.override.yml`);
    console.log(`  ✅ .env.gpu`);

    console.log(`\nNext Steps:`);
    console.log(`  1. Review the generated files above`);
    console.log(`  2. Run: docker compose up -d`);
    console.log(`  3. Watch: docker logs -f ollama`);

    if (gpu.driver === 'cuda') {
      console.log(`\nNVIDIA Setup Verification:`);
      console.log(`  nvidia-smi                                # Should show GPU`);
      console.log(`  docker run --rm --gpus all nvidia/cuda:11.8.0 nvidia-smi  # Test Docker GPU`);
    } else if (gpu.driver === 'rocm') {
      console.log(`\nAMD Setup Verification:`);
      console.log(`  rocm-smi                                  # Should show GPU`);
      console.log(`  docker run --rm --device=/dev/kfd rocm/rocm rocm-smi`);
    } else if (gpu.driver === 'metal') {
      console.log(`\nApple Silicon Setup Verification:`);
      console.log(`  system_profiler SPDisplaysDataType        # Should show M1/M2/M3/etc`);
      console.log(`  Ollama will auto-use Metal on arm64 macOS`);
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }

  /**
   * Main entry point
   */
  run() {
    console.log('🚀 AlloFlow Docker GPU Auto-Setup\n');

    // Generate override configuration
    const override = this.generateOverride();
    this.writeOverride(override);

    // Generate .env file
    this.generateEnvFile();

    // Print summary
    this.printSummary();
  }
}

/**
 * Execute if run directly
 */
if (require.main === module) {
  const setup = new DockerGPUSetup();
  try {
    setup.run();
  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    process.exit(1);
  }
}

module.exports = { DockerGPUSetup };
