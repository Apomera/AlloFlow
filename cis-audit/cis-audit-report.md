# CIS Benchmark Assessment — Apomera/AlloFlow

## Scope and method

| | |
|---|---|
| Benchmarks | CIS Docker Benchmark v1.8.0; CIS NGINX Benchmark v3.0.0 |
| Profile | Level 1 primary. Level 2 controls assessed where the repository could answer them, labelled per finding. |
| Commit | `dcb39be6c` (synced from origin/main; previous pass was `2bfff494f`) |
| Date | 2026-09-08 |

**Evaluated.** Four Dockerfiles (`docker/Dockerfile`, `docker/edge-tts-server/Dockerfile`, `docker/flux-server/Dockerfile`, `services/alloflow-remote-mcp/runner/Dockerfile`), four Compose files (`docker-compose.yml`, `docker/docker-compose.yml`, `docker/allosheet-grist/docker-compose.yml`, `desktop/schoolbox/docker-compose.yml`), and two nginx configs (`docker/nginx.conf`, `desktop/schoolbox/nginx.conf`).

**Excluded, and why.** Docker sections 1 through 3 (62 controls) govern host partitioning, daemon flags and the ownership of files on the Docker host. A repository states intent, not host state, so scoring them would be fabrication. Section 6 (2 controls) covers image and container sprawl, an operational matter. Section 7 (9 controls) is Swarm, which this deployment does not use. On the NGINX side, both configs are `conf.d` server-block fragments mounted into a stock `nginx:alpine` image, so installation, service account, file ownership and module loading belong to the base image, and the whole of section 4.1 is not applicable because this listener is plain HTTP inside the container with no TLS material in the repository.

Copies of every in-scope file also exist under `.claude/worktrees/`. Those are agent scratch duplicates and were excluded; counting them would have tripled every finding.

**Denominator.** All counts below are stated against controls *evaluated*, never against the full benchmark. No compliance percentage is given, because the evaluated subset is not a meaningful fraction of either benchmark.

**Re-audit after sync.** This pass follows a sync of 435 commits from `origin/main`. None of those commits touched an audited file, and no new container, infrastructure-as-code or web-server artifact appeared, so the scope is identical to the previous pass. Every evidence line number was re-anchored against the current files, and each status was re-verified rather than carried forward. One count was corrected from the previous report: nineteen of twenty published port mappings bind to all interfaces, not twenty of twenty-one.

## Summary

Docker, of 117 controls, 44 were evaluated and 73 fell outside what a repository can express:

| Status | Count |
|---|---|
| Pass | 25 |
| Fail | 14 (11 Level 1, 3 Level 2) |
| Requires manual verification | 3 |
| Not applicable | 2 |

NGINX, of 44 controls, 22 were evaluated and 22 fell outside the fragment's reach:

| Status | Count |
|---|---|
| Pass | 9 |
| Fail | 10 (6 Level 1, 4 Level 2) |
| Requires manual verification | 3 |

The container configuration avoids every classic escape route. Nothing is privileged, no host namespace is shared, the Docker socket is never mounted, and no sensitive host path is bound in. What is missing is the second layer: resource bounds, capability restriction, non-root execution, and interface binding. The remote-MCP runner image is materially better hardened than the other three and is a usable in-repo template.

## Fixed in this session

Twelve controls were remediated directly, chosen because none of them changes what the
application serves or which clients can reach it. Counts above reflect the state
after these changes. Nothing in this section requires a decision to keep.

| Control | Change | Files |
|---|---|---|
| Docker 5.11 | Memory limit on all 20 services, tunable per deployment | all four compose files, four `.env.example` files |
| Docker 5.29 | PID limit on all 20 services | all four compose files |
| Docker 4.6 | HEALTHCHECK added to the frontend and edge-tts images | `docker/Dockerfile`, `docker/edge-tts-server/Dockerfile` |
| Docker 5.26 | `no-new-privileges` set on all 20 service definitions | all four compose files |
| Docker 4.10 | Root `.dockerignore` created, excluding `.git`, `node_modules` and every `.env` | `.dockerignore` |
| NGINX 5.3.1 | Security headers repeated inside the static-asset block | both configs |
| NGINX 2.5.1 | `server_tokens off` | both configs |
| NGINX 2.5.3 | Dot-prefixed paths denied, with a `/.well-known/` carve-out | both configs |
| NGINX 2.5.4 | `proxy_hide_header` on every proxied location | both configs |
| NGINX 3.4 | `X-Real-IP` and `X-Forwarded-For` on the flux, tts and piper proxies | both configs |
| NGINX 5.3.3 | `Referrer-Policy` header added | both configs |
| NGINX 2.4.3 | `keepalive_timeout 10s` | both configs |

Two latent bugs were found and fixed while applying the above. They are not CIS
findings; both healthchecks were simply broken.

- `docker/flux-server/Dockerfile` ran `curl -f` against an image that installs only
  python3 and git. The container would have reported unhealthy forever. It now
  probes with python3, against the `/health` route at `flux_server.py:158`.
- `docker/docker-compose.yml` had the same `curl` mistake in the flux and edge-tts
  service healthchecks, the latter against a `python:3.11-slim` image. Both now use
  the interpreter each image actually ships.

Both nginx configs were checked for balanced blocks and terminated directives after
editing. A full `nginx -t` was not run, because Docker is not installed on the
machine this audit ran on. Run it once before deploying.


## Failures

### Level 1 — Docker

**5.14 Ensure that incoming container traffic is bound to a specific host interface.** Nineteen of twenty published port mappings bind to every host interface. That places an unauthenticated Ollama API at [docker-compose.yml:63](docker-compose.yml:63) and the PocketBase student database at [docker-compose.yml:42](docker-compose.yml:42) on the entire network. The Grist service at [docker/allosheet-grist/docker-compose.yml:11](docker/allosheet-grist/docker-compose.yml:11) is the one mapping that binds to loopback and shows the intended pattern. Bind the backing services to `127.0.0.1` and let only the frontend reach the LAN. The nginx config already proxies all of them, so the in-app path is unaffected. Behavior risk is high for anything that talks to those services directly rather than through the proxy.

**4.10 Ensure secrets are not stored in Dockerfiles.** Fixed in this session. `docker/.dockerignore` was inert. Docker reads that file from the build context root, and both compose files set the context to the repository root ([docker-compose.yml:20](docker-compose.yml:20), [docker/docker-compose.yml:28](docker/docker-compose.yml:28)). Meanwhile [docker/Dockerfile:21](docker/Dockerfile:21) copies all of `desktop/web-app/`, and [.gitignore:18](.gitignore:18) shows a local `.env` lives at exactly that path holding Firebase and Gemini keys. A developer building locally bakes their own keys into the image, and because these are `REACT_APP_*` variables they are compiled into the client bundle. Move `.dockerignore` to the repository root and exclude `.env`.

**4.1 Ensure that a user for the container has been created.** Three of four images run as root: [docker/Dockerfile:73](docker/Dockerfile:73), [docker/edge-tts-server/Dockerfile:11](docker/edge-tts-server/Dockerfile:11), [docker/flux-server/Dockerfile:38](docker/flux-server/Dockerfile:38). The runner image at [services/alloflow-remote-mcp/runner/Dockerfile:28](services/alloflow-remote-mcp/runner/Dockerfile:28) does it correctly. Behavior risk is medium for the nginx image, which binds port 80 as root and needs either `nginx-unprivileged` or a high port.

**5.4 Ensure that Linux kernel capabilities are restricted within containers.** No `cap_drop` on any service in any compose file. Drop `ALL` and add back per service. The frontend will need `CAP_NET_BIND_SERVICE`.

**5.12 CPU priority.** Still open: no CPU share or quota on any service. (5.11 memory limits and 5.29 PID limits were fixed in this session. Ollama and Flux default to an 8g ceiling, overridable per deployment; a ceiling below a loaded model's working set gets the container OOM-killed, so raise it before serving larger models.)

**5.13 Ensure that the container's root filesystem is mounted as read only.** No `read_only` anywhere. Behavior risk is high: every service that writes to its root filesystem fails to start until its writable paths are given tmpfs. Roll this out one service at a time.

**5.26 Ensure that the container is restricted from acquiring additional privileges.** Fixed in this session; set on all 20 service definitions.

**5.15 Ensure that the 'on-failure' container restart policy is set to '5'.** All twenty-one service definitions use `restart: unless-stopped`, which retries forever and hides a crash loop. Note that `unless-stopped` also restarts after a host reboot and `on-failure` does not, which for an appliance-style classroom box may be the behavior you want. If so, document the deviation rather than changing it.

**5.27 Ensure that container health is checked at runtime.** The frontend has no healthcheck in either compose file, yet [docker-compose.yml:28](docker-compose.yml:28) has other services declare a dependency on it. The `docker/` compose covers three services; the root compose covers only PocketBase.

**4.2 Ensure that containers use only trusted base images.** Three services run community images on mutable `:latest` tags, including [docker-compose.yml:39](docker-compose.yml:39), a personal GHCR namespace holding the student database. Grist at [docker/allosheet-grist/docker-compose.yml:4](docker/allosheet-grist/docker-compose.yml:4) is pinned to an explicit version with a comment demanding intentional updates. Apply that pattern everywhere.

**4.4, 4.12 Supply chain.** No image scanning in any of the seven CI workflows, and no base image pinned by digest.

**4.3 Ensure that unnecessary packages are not installed in the container.** `git` is installed at [docker/flux-server/Dockerfile:13](docker/flux-server/Dockerfile:13) but no requirement is fetched from a git remote. Confidence is medium, since a transitive source build could need it.

**4.6 Ensure that HEALTHCHECK instructions have been added to container images.** Fixed in this session; all four images now carry one.

### Level 2 — Docker

**4.5 Content trust**, **4.8 setuid and setgid removal**, and **4.11 verified packages**. On 4.11, the Python installs at [docker/edge-tts-server/Dockerfile:3](docker/edge-tts-server/Dockerfile:3) and [docker/flux-server/Dockerfile:19](docker/flux-server/Dockerfile:19) are entirely unpinned, while the Node side at [services/alloflow-remote-mcp/runner/Dockerfile:20](services/alloflow-remote-mcp/runner/Dockerfile:20) installs from a committed lockfile and is compliant.

### Level 1 — NGINX

**5.3.1 Ensure X-Content-Type-Options header is configured and enabled.** Fixed in this session. The three security headers were set at server level ([docker/nginx.conf:136](docker/nginx.conf:136)), but the static-asset block at [docker/nginx.conf:120](docker/nginx.conf:120) defines its own `add_header` for caching. Nginx does not inherit `add_header` from an outer level once the inner level sets any, so every JavaScript, CSS, image and font response is served with no security headers at all. The same defect is in [desktop/schoolbox/nginx.conf:82](desktop/schoolbox/nginx.conf:82). Repeating the headers inside that block is additive and carries no behavior risk. This is the highest-value nginx fix.

**2.4.2 Ensure requests for unknown host names are rejected.** The single server block becomes the default server, so it answers for any `Host` header.

**2.5.1 Ensure server_tokens directive is set to `off`.** Fixed in this session.

**2.5.4 and 3.4 Proxy hygiene.** Both fixed in this session. Upstream identity headers are now hidden on every proxied location, and source IP is passed consistently.

**5.1.2 Ensure only approved HTTP methods are allowed.** No method filtering; every method including DELETE is forwarded to the PocketBase API. Behavior risk is high, because the data layer needs more than GET and POST. Enumerate the methods it issues before applying.

**2.4.4, 5.2.1, 5.2.3 Timeouts and buffers.** `send_timeout`, `client_header_timeout`, `client_body_timeout` and `large_client_header_buffers` remain unset. (`keepalive_timeout` was fixed in this session.) Note the interaction with [docker/nginx.conf:130](docker/nginx.conf:130), which deliberately allows 50M uploads: a 10s body timeout will abort those over a slow link, so scope the body timeout separately.

**2.5.2.** No custom error pages. (2.5.3, hidden file serving, was fixed in this session.)

### Level 2 — NGINX

**5.1.1, 5.2.4, 5.2.5** — no IP filtering, connection limits or rate limits on the proxied API endpoints. **5.3.2 Content Security Policy** is absent, and adding one carries high behavior risk because this application loads modules dynamically and pulls libraries from CDNs. Start in report-only mode. **5.3.3 Referrer-Policy** was absent and was fixed in this session.

## Requires manual verification

| Control | Where the authoritative state lives |
|---|---|
| Docker 5.2 AppArmor | The host. Nothing in the repo disables it, so `docker-default` would apply on an AppArmor-enabled host. Confirm on the target. |
| Docker 5.3 SELinux (L2) | The host's enforcing mode. |
| Docker 5.28 Latest image version | Whether a running deployment has pulled current images. Pair with a scheduled rebuild once 4.2 pinning lands. |
| NGINX 3.1, 3.2, 3.3 Logging | The base image's main `nginx.conf`, not this fragment. Confirm logs are active and shipped somewhere durable. |

## Passes

### Docker

| ID | Title | Evidence |
|---|---|---|
| 4.7 | Update instructions not used alone | docker/flux-server/Dockerfile:12 |
| 4.9 | COPY used instead of ADD | docker/Dockerfile:17 |
| 5.1 | Swarm mode not enabled | docker-compose.yml:16 |
| 5.5 | Privileged containers not used | docker-compose.yml:16 |
| 5.6 | Sensitive host directories not mounted | docker-compose.yml:41 |
| 5.7 | sshd not run within containers | docker/edge-tts-server/Dockerfile:6 |
| 5.8 | Privileged ports not mapped | docker-compose.yml:27 |
| 5.9 | Only needed ports open | docker/Dockerfile:71 |
| 5.10 | Host network namespace not shared | docker-compose.yml:16 |
| 5.16 | Host process namespace not shared | docker-compose.yml:16 |
| 5.17 | Host IPC namespace not shared | docker-compose.yml:16 |
| 5.18 | Host devices not directly exposed | docker-compose.yml:61 |
| 5.19 | Default ulimit not overridden | docker-compose.yml:16 |
| 5.20 | Mount propagation not shared | docker-compose.yml:39 |
| 5.21 | Host UTS namespace not shared | docker-compose.yml:16 |
| 5.22 | Default seccomp profile not disabled | docker-compose.yml:16 |
| 5.25 | cgroup usage confirmed | docker-compose.yml:16 |
| 5.30 | Default docker0 bridge not used (L2) | docker-compose.yml:16 |
| 5.31 | Host user namespaces not shared | docker-compose.yml:16 |
| 5.32 | Docker socket not mounted in containers | docker-compose.yml:39 |

### NGINX

| ID | Title | Evidence |
|---|---|---|
| 2.4.1 | Listens only on authorized ports | docker/nginx.conf:25 |
| 5.2.2 | Maximum request body size set correctly | docker/nginx.conf:96 |

## Outside the benchmark

Auditor observations. No control in either loaded benchmark covers these.

- **Cleartext HTTP throughout.** Both nginx configs listen on port 80 only, and no TLS material exists in the repository. On a school LAN, student work and PocketBase session tokens cross the wire in the clear. CIS NGINX section 4.1 would cover this if TLS terminated here; as configured it does not terminate anywhere in the repo.
- **CI supply chain.** Two of seven GitHub Actions workflows declare no `permissions:` block, so they inherit the repository default. All third-party actions are pinned to mutable tags such as `actions/checkout@v4` rather than commit SHAs. No CIS benchmark covers GitHub Actions.
- **`X-XSS-Protection` is set** at [docker/nginx.conf:137](docker/nginx.conf:137). The header is deprecated and can introduce vulnerabilities in older browsers. Modern guidance is to remove it and rely on a Content Security Policy.
- **Firestore rules** (399 lines) and the Cloudflare Worker secret handling sit outside both benchmarks and would need a separate review.
- **Electron hardening** for the desktop app, such as context isolation and sandbox flags, has no CIS benchmark.

## Not applicable

- **Docker sections 1 through 3** (62 controls) — host partitioning, daemon configuration and daemon file ownership. Host state, not repository state.
- **Docker section 6** (2 controls) — image and container sprawl. Operational.
- **Docker section 7** (9 controls) — Swarm. Not used by this deployment.
- **Docker 5.23, 5.24** — `docker exec` flags. Operator behavior at runtime; no invocation appears in the repo's scripts.
- **NGINX 1.1, 1.2, 2.1, 2.2, 2.3** (10 controls) — installation, dynamic modules, service account and file ownership. Properties of the stock `nginx:alpine` base image and the host.
- **NGINX 4.1** (12 controls) — TLS. No TLS terminates at this listener and no certificate material is in the repository.

## Method note on the benchmark data

Both benchmark PDFs were converted to structured control sets before the audit. The extractor's PDF path had been reading each document's table of contents rather than its body, which yielded control titles carrying page numbers and empty audit text for 116 of 122 controls. It was rewritten to anchor on the `Profile Applicability` block that every real control body carries, which also excludes the per-control CIS Controls mapping tables that otherwise register as spurious controls. Both extractions now pass the bundled `--verify` check with no reported problems: 117 Docker controls (86 Level 1, 31 Level 2) and 44 NGINX controls (37 Level 1, 7 Level 2). The original script is preserved at `scripts/extract_controls.py.bak` in the skill directory.
