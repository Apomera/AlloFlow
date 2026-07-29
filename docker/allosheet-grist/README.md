# Optional shared Grist server

This optional deployment recipe uses Docker Compose and is not required for the
normal AlloSheet desktop popup. AlloFlow Desktop uses a managed, verified Grist
Desktop v0.3.13
installation for its default local, single-user workflow.

Use this recipe only when a district administrator needs a persistent Grist
server for shared or centrally managed workflows. Docker is an operational
choice for that deployment, not an educator prerequisite.

## Local administrator evaluation

1. Install a Docker-compatible runtime on an administrator-managed system.
2. Copy `.env.example` to `.env` and replace the sample session secret with at
   least 32 random characters.
3. Run `docker compose up -d` from this directory.
4. Open `http://127.0.0.1:8484`, complete first-run setup, and generate an API
   key from the Grist profile/API settings.
5. Set these variables only in the AlloFlow Desktop runtime environment:

   ```text
   ALLOFLOW_GRIST_URL=http://127.0.0.1:8484
   ALLOFLOW_GRIST_API_KEY=<your Grist API key>
   ```

The compose file intentionally binds Grist to `127.0.0.1`, pins the FOSS-only
`gristlabs/grist-oss:1.7.13` image, uses the gVisor formula sandbox, disables
telemetry and upstream update checks, and stores data in a named volume. Review
and intentionally update the image pin rather than using `latest`.

Do not commit `.env`, expose the API key to browser code, or publish port 8484
directly to a school network.

## District/shared deployment requirements

The loopback compose file is only an evaluation baseline. Before allowing
multiple users or remote access, provide TLS, real SSO or forward
authentication, per-user authorization, encrypted backup and recovery, log and
retention policy, network controls, monitoring, and district privacy/security
approval. Set `ALLOFLOW_GRIST_ALLOW_REMOTE=1` only for the reviewed HTTPS
origin.

See [`allo_sheet/THIRD_PARTY_NOTICES.md`](../../allo_sheet/THIRD_PARTY_NOTICES.md)
for Grist attribution and licensing.
