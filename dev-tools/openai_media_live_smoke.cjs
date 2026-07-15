#!/usr/bin/env node
'use strict';

/**
 * Explicitly opted-in paid smoke test for the guarded OpenAI media adapter.
 * This file is never invoked by a normal build or test command.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REQUIRED_CONFIRMATION = 'I_UNDERSTAND_THIS_MAKES_A_PAID_API_CALL';

function refuse(message) {
  console.error(`REFUSED: ${message}`);
  process.exitCode = 2;
}

async function main() {
  if (process.env.ALLOFLOW_OPENAI_MEDIA_LIVE_TEST !== REQUIRED_CONFIRMATION) {
    refuse(`Set ALLOFLOW_OPENAI_MEDIA_LIVE_TEST=${REQUIRED_CONFIRMATION} to opt in.`);
    return;
  }
  const apiKey = process.env.OPENAI_API_KEY;
  const prompt = process.env.ALLOFLOW_OPENAI_MEDIA_PROMPT;
  const policyPathInput = process.env.ALLOFLOW_OPENAI_MEDIA_PRICE_POLICY;
  const outputPathInput = process.env.ALLOFLOW_OPENAI_MEDIA_OUTPUT;
  const maxCostUsd = Number(process.env.ALLOFLOW_OPENAI_MEDIA_MAX_COST_USD);
  if (!apiKey) return refuse('OPENAI_API_KEY is required and is never accepted through an MCP or model argument.');
  if (!prompt || prompt.trim().length < 8) return refuse('ALLOFLOW_OPENAI_MEDIA_PROMPT is required.');
  if (!policyPathInput) return refuse('ALLOFLOW_OPENAI_MEDIA_PRICE_POLICY must name a trusted local CommonJS pricing policy.');
  if (!outputPathInput) return refuse('ALLOFLOW_OPENAI_MEDIA_OUTPUT is required.');
  if (!Number.isFinite(maxCostUsd) || maxCostUsd <= 0) return refuse('ALLOFLOW_OPENAI_MEDIA_MAX_COST_USD must be a positive number.');

  const policyPath = path.resolve(policyPathInput);
  const outputPath = path.resolve(outputPathInput);
  if (!fs.existsSync(policyPath)) return refuse(`Pricing policy does not exist: ${policyPath}`);
  if (fs.existsSync(outputPath) && process.env.ALLOFLOW_OPENAI_MEDIA_OVERWRITE !== '1') {
    return refuse('Output already exists; set ALLOFLOW_OPENAI_MEDIA_OVERWRITE=1 to replace it deliberately.');
  }

  const Contracts = require('../agent_core_media_contracts_module.js');
  const StoreModule = require('../agent_core_managed_asset_store_module.js');
  const Security = require('../agent_core_media_security_module.js');
  const AdapterModule = require('../agent_core_openai_media_adapter_module.js');
  const Runtime = require('../agent_core_openai_media_runtime_module.js');
  const ProductionGuard = require('../agent_core_openai_media_production_guard_module.js');
  const pricingPolicy = require(policyPath);

  const store = Security.createManagedAssetStore({
    createId: () => `asset_${crypto.randomBytes(12).toString('hex')}`,
    authorizeByteRead: ({ purpose }) => purpose === 'live-smoke-save-output',
  }, { assetStore: StoreModule });

  const fetchAuthorized = async (url, request) => {
    const headers = new Headers(request.headers || {});
    headers.set('Authorization', `Bearer ${apiKey}`);
    return fetch(url, { ...request, headers, signal: AbortSignal.timeout(120000) });
  };

  const guarded = ProductionGuard.createProductionOpenAIMediaAdapter({
    executionEnabled: true,
    contracts: Contracts,
    assetStore: store,
    adapterModule: AdapterModule,
    fetchAuthorized,
    authorizeExecution: () => true,
    authorizeProductionExecution: ({ estimate }) => estimate.upperBoundUsd <= maxCostUsd,
    pricingPolicy,
    now: () => new Date(),
    maxImageAttempts: 1,
    maxDecodedBytes: 25 * 1024 * 1024,
  }, Runtime);

  const request = {
    schemaVersion: '1.0',
    requestId: `live-openai-${Date.now()}`,
    operation: 'generate',
    prompt: prompt.trim(),
    purpose: 'operator-approved-live-smoke-test',
    output: { width: 1024, height: 1024, mimeType: 'image/png', quality: 'standard' },
    accessibility: { altTextRequired: false },
    providerPolicy: {
      mode: 'allow-listed',
      allowedProviders: ['openai-api'],
      allowedModels: [pricingPolicy.model],
      preferredProvider: 'openai-api',
      preferredModel: pricingPolicy.model,
      allowMeteredUsage: true,
      maxCostUsd,
      maxOperations: 1,
    },
  };

  const plan = guarded.prepare(request);
  if (!plan.ready) return refuse(`Preflight failed: ${plan.code}`);
  console.log(`AUTHORIZED PLAN: <= $${plan.estimate.upperBoundUsd.toFixed(4)} USD; ${plan.operationUpperBound} operation.`);
  const result = await guarded.execute(request);
  const bytes = store.readBytesForAdapter(result.asset.handle, { purpose: 'live-smoke-save-output' });
  fs.writeFileSync(outputPath, bytes, { flag: process.env.ALLOFLOW_OPENAI_MEDIA_OVERWRITE === '1' ? 'w' : 'wx' });
  console.log(`COMPLETED: ${outputPath}`);
  console.log(`ACCOUNTED USAGE: $${result.usage.actualCostUsd.toFixed(4)} USD; ${result.usage.operations} operation.`);
}

main().catch((error) => {
  console.error(`FAILED: ${error && error.code ? `${error.code}: ` : ''}${error && error.message ? error.message : 'unknown error'}`);
  process.exitCode = 1;
});
