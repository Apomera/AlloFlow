'use strict';

const readline = require('readline');

function send(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const message = JSON.parse(line);
  if (message.method === 'initialize') {
    send(message.id, {
      protocolVersion: message.params.protocolVersion,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'mcp-echo-fixture', version: '1' },
    });
    return;
  }
  if (message.method === 'tools/list') {
    send(message.id, {
      tools: [{
        name: 'echo',
        description: 'Echo arguments.',
        inputSchema: { type: 'object', additionalProperties: true },
      }],
    });
    return;
  }
  if (message.method === 'tools/call') {
    send(message.id, {
      content: [{ type: 'text', text: JSON.stringify(message.params.arguments) }],
      structuredContent: message.params.arguments,
      isError: false,
    });
  }
});
