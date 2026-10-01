// response_format:{type:'json_object'} only guarantees SYNTACTIC JSON, so a
// 3B/4B model returns well-formed output with the wrong keys. llama.cpp and
// LM Studio both compile a json_schema to a GBNF grammar, which makes the wrong
// shape impossible to emit. These tests pin the request shape, the opt-in gate,
// and — most importantly — that each schema matches the LOCAL prompt the
// dispatcher actually sends. A schema that disagrees with its prompt is worse
// than none: under constrained decoding the model cannot deviate, so real
// fields vanish with no error anywhere.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadAlloModule } from './setup.js';

let AIProvider;
let AIBackendLocal;

beforeAll(() => {
  loadAlloModule('ai_backend_module.js');
  AIProvider = window.AIProvider;
  AIBackendLocal = window.AIBackendLocal;
  if (!AIProvider || !AIBackendLocal) throw new Error('ai_backend_module failed to register');
});

afterEach(() => {
  try { window.localStorage.removeItem('alloflow_local_json_schema'); } catch (_) {}
  delete window.__alloLocalJsonSchema;
});

function createProvider(backend, fetchWithRetry) {
  return new AIProvider({
    backend,
    apiKey: '',
    baseUrl: 'http://127.0.0.1:32173',
    models: { default: 'local-model' },
    fetchWithRetry,
    debugLog: () => {},
    warnLog: () => {},
    localModelProfile: { modelId: 'test', contextWindow: 8192, jsonOutputTokenLimit: 2000, reserveTokens: 384 },
  });
}

function recorder(content = '{"terms":[]}') {
  const calls = [];
  const fetchWithRetry = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return { json: async () => ({ choices: [{ message: { content }, finish_reason: 'stop' }] }) };
  };
  return { calls, fetchWithRetry };
}

describe('constrained decoding opt-in gate', () => {
  it('returns no schema until the device opts in', () => {
    expect(AIBackendLocal.resourceSchemaFor('glossary')).toBeNull();
    window.localStorage.setItem('alloflow_local_json_schema', '1');
    expect(AIBackendLocal.resourceSchemaFor('glossary')).toBeTruthy();
  });

  it('returns no schema for a type that has not been verified', () => {
    window.localStorage.setItem('alloflow_local_json_schema', '1');
    // anchor-chart, dbq and note-taking reuse the shared CLOUD prompt on the
    // local path, so their shape has not been transcribed and must stay absent
    // rather than be guessed at.
    expect(AIBackendLocal.resourceSchemaFor('anchor-chart')).toBeNull();
    expect(AIBackendLocal.resourceSchemaFor('dbq')).toBeNull();
    expect(AIBackendLocal.resourceSchemaFor('note-taking')).toBeNull();
  });
});

describe('json_schema request shape', () => {
  it('sends json_schema to alloflow-local when a schema is supplied', async () => {
    const { calls, fetchWithRetry } = recorder();
    const provider = createProvider('alloflow-local', fetchWithRetry);
    const schema = { type: 'object', properties: { terms: { type: 'array' } } };

    await provider.generateText('Extract vocabulary.', { json: true, schema });

    expect(calls[0].response_format.type).toBe('json_schema');
    expect(calls[0].response_format.json_schema.schema).toEqual(schema);
  });

  it('gives LM Studio a schema, which is the object form it demanded', async () => {
    // LM Studio 400'd every jsonMode call because json_object is not accepted
    // and this layer had no schema to send. With one in hand it can be served.
    const { calls, fetchWithRetry } = recorder();
    const provider = createProvider('lmstudio', fetchWithRetry);

    await provider.generateText('Extract vocabulary.', { json: true, schema: { type: 'object' } });

    expect(calls[0].response_format.type).toBe('json_schema');
  });

  it('still sends LM Studio nothing when there is no schema', async () => {
    const { calls, fetchWithRetry } = recorder();
    const provider = createProvider('lmstudio', fetchWithRetry);

    await provider.generateText('Extract vocabulary.', { json: true });

    expect(calls[0].response_format).toBeUndefined();
  });

  it('leaves servers we do not control on json_object', async () => {
    for (const backend of ['custom', 'localai']) {
      const { calls, fetchWithRetry } = recorder();
      const provider = createProvider(backend, fetchWithRetry);
      await provider.generateText('Extract vocabulary.', { json: true, schema: { type: 'object' } });
      expect(calls[0].response_format).toEqual({ type: 'json_object' });
    }
  });

  it('passes the schema to Ollama through its format field', async () => {
    const calls = [];
    const provider = createProvider('ollama', async (_url, options) => {
      calls.push(JSON.parse(options.body));
      return { json: async () => ({ message: { content: '{"terms":[]}' }, done_reason: 'stop' }) };
    });
    const schema = { type: 'object', properties: { terms: { type: 'array' } } };

    await provider.generateText('Extract vocabulary.', { json: true, schema });

    expect(calls[0].format).toEqual(schema);
  });

  it('keeps the grammar constraint on the truncation retry', async () => {
    // A retry that dropped the schema would hand back the unconstrained shape
    // precisely when the model is already struggling.
    const calls = [];
    const provider = createProvider('alloflow-local', async (_url, options) => {
      calls.push(JSON.parse(options.body));
      return {
        json: async () => ({
          choices: [{
            message: { content: calls.length === 1 ? '{"terms":[' : '{"terms":[]}' },
            finish_reason: calls.length === 1 ? 'length' : 'stop',
          }],
        }),
      };
    });
    const schema = { type: 'object', properties: { terms: { type: 'array' } } };

    await provider.generateText('Extract vocabulary.', { json: true, schema });

    expect(calls).toHaveLength(2);
    expect(calls[1].response_format.json_schema.schema).toEqual(schema);
  });
});

describe('schemas agree with the dispatcher prompts they constrain', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'generate_dispatcher_source.jsx'),
    'utf8',
  );

  it('wires exactly the types that have a schema, and no others', () => {
    window.localStorage.setItem('alloflow_local_json_schema', '1');
    const wired = [...source.matchAll(/localSchemaArg\('([^']+)'\)/g)].map((m) => m[1]).sort();
    const registered = Object.keys(AIBackendLocal.LOCAL_RESOURCE_SCHEMAS).sort();
    expect(wired).toEqual(registered);
  });

  it.each([
    ['glossary', ['"terms"', '"term"', '"def"', '"tier"']],
    ['faq', ['"faqs"', '"question"', '"answer"']],
    ['brainstorm', ['"ideas"', '"title"', '"description"', '"connection"']],
    ['lesson-plan', ['"essentialQuestion"', '"objectives"', '"closure"', '"extensions"']],
  ])('the %s local prompt asks for the keys its schema requires', (type, expectedKeys) => {
    window.localStorage.setItem('alloflow_local_json_schema', '1');
    const schema = AIBackendLocal.resourceSchemaFor(type);
    expect(schema).toBeTruthy();

    // Every top-level property in the schema must appear as a quoted key in the
    // dispatcher source — that is what catches a schema drifting from a prompt.
    const props = schema.type === 'object' ? Object.keys(schema.properties) : [];
    const nested = props.flatMap((key) => {
      const child = schema.properties[key];
      const items = child && child.type === 'array' ? child.items : null;
      return items && items.properties ? Object.keys(items.properties) : [];
    });
    for (const key of [...props, ...nested]) {
      expect(source, `${type} schema key "${key}" is absent from the dispatcher prompt`)
        .toContain(`"${key}"`);
    }
    for (const key of expectedKeys) expect(source).toContain(key);
  });

  it('never marks a field required that the prompt only offers conditionally', () => {
    window.localStorage.setItem('alloflow_local_json_schema', '1');
    // The glossary prompt adds "translations" ONLY when languages are requested,
    // so requiring it would force the model to invent one on every other run.
    const glossary = AIBackendLocal.resourceSchemaFor('glossary');
    const item = glossary.properties.terms.items;
    expect(item.properties).toHaveProperty('translations');
    expect(item.required).not.toContain('translations');

    // brainstorm's "connection" is likewise optional in the normalizer.
    const brainstorm = AIBackendLocal.resourceSchemaFor('brainstorm');
    expect(brainstorm.properties.ideas.items.required).not.toContain('connection');
  });
});
