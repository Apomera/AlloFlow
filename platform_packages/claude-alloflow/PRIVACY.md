# AlloFlow portable remediation privacy notice

Last updated: 2026-07-29

This package is a local Agent Skill. Its bundled scripts do not implement an
AlloFlow network client, call a remote AlloFlow MCP server, call a model API, or
send document content to AlloFlow or Cloudflare.

The user-selected host—such as Claude or ChatGPT—still receives and processes
files attached in that product. The host's privacy, retention, training, data
residency, and account terms apply independently. The Skill's privacy receipt
does not audit or certify the host, operating system, filesystem synchronization
software, or optional locally installed executables.

The scripts read the selected source PDF and repair-plan files and write new
artifacts into the requested output directory. Reports contain the source
basename, byte length, and SHA-256 fingerprint, but not extracted document text
or an absolute source path. The scripts do not implement telemetry or analytics.
The optional Chromium renderer blocks document page requests and rejects
external resources; the receipt reports only that scoped control and does not
claim system-wide network observation.

Do not use identifiable education records unless the responsible institution
has approved the host workspace, the user's access, applicable data agreements,
retention settings, and this workflow. Cloud-synced input or output directories
may be transmitted by the user's own synchronization software outside the
scope of this package.

The remote AlloFlow MCP/Cloudflare service is not part of this package. If a
user separately chooses a remote workflow, that service has a different data
path and requires its own privacy and institutional review.

Source and support: <https://github.com/Apomera/AlloFlow>
