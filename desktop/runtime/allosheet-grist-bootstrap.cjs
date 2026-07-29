'use strict';

const AUTH_MESSAGE_TYPE = 'alloflow-allosheet-grist-auth-v1';
const ELECTRON_KEY_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

function fail(message) {
  throw new Error(`AlloSheet Grist bootstrap: ${message}`);
}

async function main() {
  const serverEntrypoint = String(process.env.ALLOFLOW_GRIST_SERVER_ENTRYPOINT || '');
  if (!serverEntrypoint) fail('the pinned server entrypoint is missing.');
  if (typeof process.send !== 'function') fail('a private parent IPC channel is required.');

  // This is Grist Desktop's native strict-mode credential. Instantiating the
  // singleton here guarantees that the server and the parent receive the same
  // in-memory key without placing it in argv, an environment variable, a URL,
  // stdout, or a renderer-visible response.
  const { ElectronLoginSystem } = require('app/electron/LoginSystem');
  const loginSystem = ElectronLoginSystem.instance;
  const authenticatedUrl = loginSystem.authenticateURL(new URL(process.env.APP_HOME_URL));
  const electronKey = String(authenticatedUrl.searchParams.get('electron_key') || '');
  if (!ELECTRON_KEY_PATTERN.test(electronKey)) {
    fail('Grist did not provide a valid strict-mode credential.');
  }

  // Install IPC failure handling before sending the secret. The channel stays
  // open for the lifetime of Grist, so a parent crash also closes the child.
  process.once('disconnect', () => process.exit(0));
  process.once('error', () => process.exit(1));
  await new Promise((resolve, reject) => {
    try {
      process.send({
        type: AUTH_MESSAGE_TYPE,
        version: 1,
        electronKey,
      }, (error) => error ? reject(error) : resolve());
    } catch (error) {
      reject(error);
    }
  });

  const server = require(serverEntrypoint);
  if (!server || typeof server.main !== 'function') {
    fail('the pinned server module does not export main().');
  }
  await server.main();
}

main().catch((error) => {
  // The credential is never interpolated into errors or logs.
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});

