# Local web development

Use Node 20.19 or newer (CI uses Node 24). From this directory, install the locked dependencies with
`npm ci --ignore-scripts`, then run `npm start`. The preview listens on
`http://127.0.0.1:3000` by default. `PORT` selects another port and `BROWSER=none`
disables automatic browser opening. Environment values can be placed in your
local `.env` file using CRA's existing environment-file precedence.

The launcher retains React Scripts 5.0.1's compiler, React Fast Refresh, error
overlay, environment handling, public assets, history fallback, package.json
`proxy`, and `src/setupProxy.js` route registration. It uses webpack-dev-server
5.2.7 through its current API. Production build and packaging commands are unchanged.

## Preview access

Local access is the default. For a preview on a trusted LAN, explicitly set
`HOST=0.0.0.0` (IPv4), or a specific interface address. Other devices then use
that computer's LAN address and selected port. This is a development server
with source maps and debugging endpoints; use the production deployment for
student or public access. No firewall settings are changed by the launcher.

For a reverse proxy using a custom hostname, set
`ALLOFLOW_DEV_ALLOWED_HOSTS=preview.example.test`. Multiple exact hostnames can be
comma-separated; schemes, ports and wildcard domains are rejected. The former
`DANGEROUSLY_DISABLE_HOST_CHECK=true` setting now produces an actionable error.

Requests from another browser origin are rejected by default. If a trusted
preview frontend needs cross-origin access, set an exact origin such as
`ALLOFLOW_DEV_ALLOWED_ORIGINS=https://preview.example.test`. This also supports
a TLS-terminating reverse proxy forwarding an HTTPS browser origin to HTTP.
Include the hostname in `ALLOFLOW_DEV_ALLOWED_HOSTS` for WebSocket access, and
forward the Host/Origin headers consistently. Approved HTTP origins receive an
exact Access-Control-Allow-Origin value. The server handles their preflight
requests for standard API methods and valid requested header names, including
JSON content types and Authorization. Wildcard CORS and cross-origin cookies
remain disabled. Ordinary OPTIONS requests still reach custom API handlers.

`WDS_SOCKET_HOST`, `WDS_SOCKET_PORT` and `WDS_SOCKET_PATH` configure the hot-reload
socket behind a reverse proxy. Forward WebSocket upgrades on that path. Normal
same-origin API WebSocket requests are supported by the package.json proxy.
Custom `src/setupProxy.js` code runs in the local Node process and remains trusted
application code. It receives an Express app with settings, locals, and routing
methods. Its HTTP routes run after the host/origin checks and error-overlay
source middleware, so catch-all proxies cannot intercept overlay source requests.

## HTTPS

Set `HTTPS=true` to use a generated development certificate. Browsers will ask
you to trust that certificate; the launcher does not install a system trust root.
For an existing certificate, set both `SSL_CRT_FILE` and `SSL_KEY_FILE` to paths
relative to this directory (absolute paths also work). Keep private keys out of Git.

## Security checks

From the repository root, run:

```sh
node --test dev-tools/security/test-dev-server.cjs
node --test dev-tools/security/test-build-tooling.cjs
npm audit --prefix desktop/web-app --package-lock-only --ignore-scripts --audit-level=high
```

The server tests use isolated fixtures in the dependency cache and ephemeral
loopback ports. They check hostile hosts/origins, source maps, path traversal,
SPA routes, stale service-worker reset, hot reload, HTTP/WebSocket proxying,
generated/custom HTTPS certificates, the actual React launcher and shutdown,
custom Express settings, catch-all proxies and trusted-origin preflight requests.
The required CI check runs these tests and blocks new high or critical web
dependency findings. Lower-severity findings remain visible in full audits.

The preview rules follow the browser's [CORS preflight protocol](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
and preserve the [Express application API](https://expressjs.com/en/4x/api/).
