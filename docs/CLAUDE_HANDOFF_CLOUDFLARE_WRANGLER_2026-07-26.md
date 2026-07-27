# Claude handoff: deploying AlloFlow to Cloudflare Pages with Wrangler

Date: 2026-07-26
Last verified on this computer: 2026-07-27
Repository: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`
Cloudflare Pages project: `alloflow-cdn`
Production URL: <https://alloflow-cdn.pages.dev/app/>

## Read this first: there are three different release paths

Do not use “Cloudflare deploy” as if it were one interchangeable command:

| Goal | Correct path | What it changes |
| --- | --- | --- |
| Normal full AlloFlow release | `.\deploy.ps1 "message"` from PowerShell, which runs `deploy.sh` through Git Bash | Commits only the files already staged at Step 1, pushes GitHub, builds/mirrors the app, may deploy an explicitly configured school Firebase target, creates a post-build commit, pushes GitHub, and mirrors Codeberg. Cloudflare Pages normally rebuilds from the GitHub push. |
| Direct static-site recovery/fallback | x64 Node plus `wrangler pages deploy` against a commit-derived artifact | Publishes one complete immutable deployment to the existing `alloflow-cdn` Pages project. It does not build, test, commit, push, mirror, or deploy the catalog Worker. |
| Catalog/search submission Worker | Wrangler from `catalog/cloudflare-worker/` | Updates the separate `alloflow-catalog-submit` Worker and its bindings. This is not an app/Pages deployment. |

`deploy.sh` does **not** call Wrangler. Its Cloudflare path is the GitHub
integration: push `main`, then Cloudflare builds asynchronously. The direct
Wrangler Pages command documented below was the recovery path used when that
Cloudflare build was failing.

The direct command is currently a fallback, not the first choice. A read-only
Wrangler check on 2026-07-27 showed a newer successful production deployment
for Git source `01300ac`, which means the Git-integrated path had resumed
working after the 2026-07-26 incident.

## Current shared-worktree stop sign

This is a time-stamped diagnostic, not a deploy instruction. At the
2026-07-27 verification:

```text
local HEAD:  9f81bf0e87461be7491914e4cefca7af1ca5c06f
origin/main: 01300aca1e2bbee02b843ff6e04832ad4d390cfb
backup/main: 9f4f58962ec3a6690ce48d1074bbb5dec5198223
tracked edits: present
untracked files: present
```

Therefore the shared checkout was **not ready to deploy** at that moment.
Always rerun the checks below; do not assume these hashes or the dirty/clean
state are still current.

This matters even if `git diff --cached` is empty. `deploy.sh` builds from the
working tree and Step 6 deliberately stages broad generated areas, including
`desktop/web-app/public/` and `app/`. Running it while agents are editing can
accidentally absorb unfinished work into its post-build commit.

Never try to “make the tree clean” with another agent's files. In this shared
checkout, do not use:

```text
git add .
git add -A
git commit -a
git stash
git reset --hard
git clean
git checkout -- <path>
```

Wait until every active agent has finished its section. Review ownership, then
stage and commit exact paths for one coherent section at a time:

```powershell
git status --short
git diff --cached --name-status
git diff --name-status
git ls-files --others --exclude-standard

git add -- path/to/exact-file.js path/to/exact-test.js
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "scope: precise description"
```

Repeat for each finished section. Only start the release when
`git status --porcelain=v1 --untracked-files=no` prints nothing and the
remaining untracked files have been explicitly reviewed as non-release
artifacts. Do not broadly commit logs, caches, editor lock files, or unknown
files merely to make `git status` shorter.

## Outcome of the 2026-07-26 deployment

The repository's Git-integrated Cloudflare Pages builds were failing even though
the application build and test suite passed. A direct, authenticated Wrangler
Pages upload bypassed the broken Cloudflare build step and successfully
published the exact static files from Git commit:

```text
3ab2ea89f98a181df3e49074deb58080c93bf0ca
```

Successful Cloudflare deployment:

```text
Deployment ID: fa8dc62f-cce2-4b30-8089-c9bf48169bed
Preview URL:   https://fa8dc62f.alloflow-cdn.pages.dev
Environment:   Production
Branch:        main
Source:        3ab2ea8
```

Local `HEAD`, GitHub `origin/main`, and Codeberg `backup/main` all matched the
full commit above. There were no staged or unstaged tracked changes. Existing
untracked logs, caches, editor files, and historical duplicates were preserved
and were not included in the deployment.

## Do not split a Pages site into sequential uploads

Wrangler's Pages upload accepts one folder of prebuilt assets and creates one
deployment from that folder. Do not try to deploy “part 1” and then “part 2”:
the second command is another deployment, not an append to the first. Omitting
files from its folder risks producing an incomplete site.

Wrangler already hashes, batches, and deduplicates assets during one upload.
Let it handle the transfer. If the foreground process is too long for the
calling terminal, use the single background-process procedure in section 6;
do not launch duplicate or partial uploaders.

On 2026-07-27, both local `HEAD` and `origin/main` contained 7,930 tracked files
under `desktop/web-app/public`, so the actual commit-derived Pages artifact was
not an 11,022-file working-tree dump. Always count the exact selected commit:

```powershell
$Repo = 'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated'
$Commit = (git -C $Repo rev-parse HEAD).Trim()
git -C $Repo ls-tree -r --name-only $Commit -- desktop/web-app/public |
  Measure-Object
```

Cloudflare's current documented Wrangler limit is 20,000 files and 25 MiB per
file on the Free plan; qualifying paid plans can allow 100,000 files. Verify
the current limits before a future large upload:

- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)

If the commit-derived artifact exceeds a limit, stop and redesign the asset
layout or move appropriate large assets to R2. Do not “solve” the limit by
publishing an incomplete sequence of directories.

## Local helper-script status

At the 2026-07-27 snapshot, `dev-tools/wrangler.cjs` and
`dev-tools/cf_worker.cjs` existed only as untracked files in the shared
checkout. They may belong to another agent's unfinished Worker work. Do not
stage, commit, or rely on either helper for production until its owner has
finished it and it has been reviewed and committed.

The Pages procedure in this handoff intentionally calls the known x64 Node and
Wrangler installations directly, so it does not depend on those helpers. If a
later commit adopts a wrapper, inspect that committed version and its history
before substituting it for the commands here.

## The Windows ARM64 issue

This computer reports native Node.js as Windows ARM64. Wrangler's local
`workerd` dependency did not provide a usable `win32-arm64` executable, so
Wrangler could not run normally under the native Node installation.

The successful workaround was to run the official Windows x64 Node build under
Windows emulation and install Wrangler with that x64 Node runtime.

The working temporary paths are:

```powershell
$Node = 'C:\tmp\alloflow-node22-x64\node-v22.16.0-win-x64\node.exe'
$Wrangler = 'C:\tmp\alloflow-wrangler-x64\node_modules\wrangler\bin\wrangler.js'
```

Confirm the workaround before using it:

```powershell
& $Node -p "'Node ' + process.version + ' ' + process.arch + ' ' + process.platform"
& $Node $Wrangler --version
```

Expected architecture and known working versions:

```text
Node v22.16.0 x64 win32
Wrangler 4.114.0
```

`C:\tmp` is temporary storage. If these files disappear, recreate them using
the instructions below. Do not copy a Node or Wrangler installation from an
unknown source.

## Recreating the x64 Node and Wrangler installation

Download the official Node v22.16.0 Windows x64 ZIP:

```powershell
$NodeZip = 'C:\tmp\node-v22.16.0-win-x64.zip'
$NodeRoot = 'C:\tmp\alloflow-node22-x64'

Invoke-WebRequest `
  -Uri 'https://nodejs.org/dist/v22.16.0/node-v22.16.0-win-x64.zip' `
  -OutFile $NodeZip

(Get-FileHash -LiteralPath $NodeZip -Algorithm SHA256).Hash
```

The SHA-256 verified on 2026-07-26 was:

```text
21C2D9735C80B8F86DAB19305AA6A9F6F59BBC808F68DE3EEF09D5832E3BFBBD
```

Hash comparison is case-insensitive. If the downloaded file does not match,
stop and verify the current checksum against Node.js's official
`SHASUMS256.txt`; do not extract or execute it.

Extract Node and install the known working Wrangler version:

```powershell
Expand-Archive -LiteralPath $NodeZip -DestinationPath $NodeRoot -Force

$Node = Join-Path $NodeRoot 'node-v22.16.0-win-x64\node.exe'
$Npm = Join-Path $NodeRoot 'node-v22.16.0-win-x64\node_modules\npm\bin\npm-cli.js'
$WranglerRoot = 'C:\tmp\alloflow-wrangler-x64'

New-Item -ItemType Directory -Path $WranglerRoot -Force | Out-Null
& $Node $Npm install --prefix $WranglerRoot wrangler@4.114.0

$Wrangler = Join-Path $WranglerRoot 'node_modules\wrangler\bin\wrangler.js'
& $Node $Wrangler --version
```

## Authentication

Wrangler was already authenticated through Cloudflare OAuth to the correct
account. Check this without exposing credentials:

```powershell
& $Node $Wrangler whoami
```

The account shown by `whoami` must contain the existing `alloflow-cdn` Pages
project. If authentication has expired:

```powershell
& $Node $Wrangler login
```

Complete the browser OAuth flow as the repository owner. Never print, copy,
commit, or include Wrangler's cached OAuth token in a handoff or log. Do not
read its credential file merely to confirm authentication; `whoami` is enough.

## Safe deployment model

Use `deploy.sh` for the normal AlloFlow build, test, mirroring, commit, and push
workflow. Use direct Wrangler Pages upload only when:

1. the owner has authorized a production deployment;
2. all finished tracked work has been reviewed and committed;
3. the intended commit has been pushed to GitHub and Codeberg;
4. tests/builds have passed; and
5. Cloudflare's Git-integrated build is failing or a direct Pages upload is
   otherwise intentionally required.

The direct upload must be made from a new artifact reconstructed from the Git
commit. Never point Wrangler at the shared working tree. This prevents
untracked caches, logs, ignored media, or another agent's in-progress files
from entering the deployment.

## 1. Verify the commit and remotes

From the repository:

```powershell
$Repo = 'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated'

git -C $Repo status --porcelain=v1 --untracked-files=no
git -C $Repo rev-parse HEAD
git -C $Repo rev-parse origin/main
git -C $Repo rev-parse backup/main
```

The first command must produce no output. The three commit hashes must be
identical.

Untracked files may be present in this shared workspace. Inspect them, but do
not delete or commit them indiscriminately:

```powershell
git -C $Repo status --short
git -C $Repo ls-files --others --exclude-standard
```

If any staged or modified tracked file exists, stop. Determine which agent owns
it and whether it is finished before committing. Never use `git reset --hard`,
`git clean`, or checkout-based cleanup in this shared workspace.

## 2. Reconstruct an exact commit artifact

Create a unique ZIP and extraction directory so no prior artifact is
overwritten:

```powershell
$Commit = (git -C $Repo rev-parse HEAD).Trim()
$ShortCommit = $Commit.Substring(0, 10)
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$ArtifactZip = "C:\tmp\alloflow-public-$ShortCommit-$Stamp.zip"
$ArtifactRoot = "C:\tmp\alloflow-public-$ShortCommit-$Stamp"

git -C $Repo archive `
  --format=zip `
  --output=$ArtifactZip `
  $Commit `
  -- desktop/web-app/public

if ($LASTEXITCODE -ne 0) {
  throw 'git archive failed'
}

Expand-Archive -LiteralPath $ArtifactZip -DestinationPath $ArtifactRoot
$Artifact = Join-Path $ArtifactRoot 'desktop\web-app\public'
```

This artifact contains only files tracked by the selected commit. It cannot
contain untracked files from the shared workspace.

## 3. Validate the artifact before upload

Check that the directory exists, count its files, and reject any file at or
above Cloudflare's 25 MiB per-file threshold:

```powershell
if (-not (Test-Path -LiteralPath $Artifact -PathType Container)) {
  throw "Artifact directory is missing: $Artifact"
}

$ArtifactFiles = @(Get-ChildItem -LiteralPath $Artifact -Recurse -File)
$ArtifactBytes = ($ArtifactFiles | Measure-Object -Property Length -Sum).Sum
$Oversized = @($ArtifactFiles | Where-Object Length -GE 25MB)

[pscustomobject]@{
  Files = $ArtifactFiles.Count
  Bytes = $ArtifactBytes
  OversizedFiles = $Oversized.Count
}

$Oversized | Select-Object FullName, Length

if ($Oversized.Count -ne 0) {
  throw 'Cloudflare artifact contains one or more files at or above 25 MiB'
}
```

For commit `3ab2ea89f`, the commit-derived public directory contained 7,930
files and 733,528,099 bytes, with no file at or above 25 MiB.

Do not validate or deploy `desktop\web-app\public` directly from the working
tree. A local ignored `alloflow_intro_family.mp4` was present there and was
about 36.3 MiB. It was not tracked, referenced, or deployed, but it demonstrates
why the clean Git artifact is required.

## 4. Optional non-mutating Wrangler asset validation

Wrangler Pages does not expose a Pages-specific `--dry-run`. The following
Workers command was used only to validate the static asset set locally:

```powershell
$DryRunOut = "C:\tmp\alloflow-wrangler-dry-$ShortCommit-$Stamp"
$CompatibilityDate = Get-Date -Format 'yyyy-MM-dd'

& $Node $Wrangler deploy `
  --dry-run `
  --name alloflow-cdn `
  --compatibility-date $CompatibilityDate `
  --assets $Artifact `
  --outdir $DryRunOut

if ($LASTEXITCODE -ne 0) {
  throw 'Wrangler asset dry-run failed'
}
```

This is validation only. Do not remove `--dry-run`.

Important distinction:

- `wrangler pages deploy` publishes to the existing Cloudflare Pages project.
- Plain `wrangler deploy --assets` targets a Workers service.

Never substitute plain `wrangler deploy` for the production Pages command
below.

## 5. Deploy to the existing Pages production project

This is an external production write and requires the owner's authorization.
Run it from the commit-derived artifact directory:

```powershell
$CommitMessage = "Deploy-$ShortCommit"

Push-Location $Artifact
try {
  & $Node $Wrangler pages deploy . `
    --project-name alloflow-cdn `
    --branch main `
    --commit-hash $Commit `
    --commit-message=$CommitMessage `
    --commit-dirty=false

  if ($LASTEXITCODE -ne 0) {
    throw 'Cloudflare Pages deployment failed'
  }
}
finally {
  Pop-Location
}
```

Keep the commit message a single command-line token on Windows. A spaced
message passed through `Start-Process -ArgumentList` was split into unknown
arguments. `--commit-message=Deploy-<short-sha>` avoids that problem.

Cloudflare deduplicates assets already present in the project. The successful
upload reported:

```text
Uploaded 3838 files (4092 already uploaded)
Deployment complete
```

## 6. Run a long upload without a terminal timeout

If the calling environment terminates foreground commands after about one
minute, launch exactly one hidden uploader with dedicated logs:

```powershell
$Stdout = "C:\tmp\alloflow-pages-$ShortCommit-$Stamp.stdout.log"
$Stderr = "C:\tmp\alloflow-pages-$ShortCommit-$Stamp.stderr.log"
$WranglerArgs = @(
  $Wrangler,
  'pages',
  'deploy',
  '.',
  '--project-name',
  'alloflow-cdn',
  '--branch',
  'main',
  '--commit-hash',
  $Commit,
  "--commit-message=Deploy-$ShortCommit",
  '--commit-dirty=false'
)

$Process = Start-Process `
  -FilePath $Node `
  -ArgumentList $WranglerArgs `
  -WorkingDirectory $Artifact `
  -WindowStyle Hidden `
  -RedirectStandardOutput $Stdout `
  -RedirectStandardError $Stderr `
  -PassThru

[pscustomobject]@{
  ProcessId = $Process.Id
  Stdout = $Stdout
  Stderr = $Stderr
}
```

Monitor it without starting another uploader:

```powershell
Get-CimInstance Win32_Process |
  Where-Object {
    $_.ExecutablePath -eq $Node -and
    $_.CommandLine -like '*wrangler*pages*deploy*'
  } |
  Select-Object ProcessId, ParentProcessId, CreationDate, CommandLine

Get-Content -LiteralPath $Stdout -Raw -ErrorAction SilentlyContinue
Get-Content -LiteralPath $Stderr -Raw -ErrorAction SilentlyContinue
```

Wrangler may have a parent Node process and a child Node process. That is one
deployment, not two. Do not restart while either process is active.

Success is explicit in stdout:

```text
Success! Uploaded ...
Deploying...
Deployment complete! Take a peek over at https://....alloflow-cdn.pages.dev
```

If no matching process remains and that success text is absent, treat the
deployment as failed and inspect stderr before retrying.

## 7. Confirm Cloudflare selected the correct production deployment

```powershell
& $Node $Wrangler pages deployment list --project-name alloflow-cdn
```

The newest row must show:

- `Environment`: `Production`
- `Branch`: `main`
- `Source`: the intended commit prefix
- a deployment URL
- no `Failure` status

The 2026-07-26 successful row was:

```text
fa8dc62f-cce2-4b30-8089-c9bf48169bed
Production
main
3ab2ea8
https://fa8dc62f.alloflow-cdn.pages.dev
```

## 8. Compare live files byte-for-byte

Cloudflare redirects clean HTML URLs with HTTP 308, so use `curl.exe -L`.
The following downloads each live file to its own new temporary file, compares
SHA-256 hashes, and removes only that temporary download:

```powershell
$Production = 'https://alloflow-cdn.pages.dev'
$Checks = @(
  'doc_pipeline_module.js',
  'view_pdf_audit_module.js',
  'gemini_api_module.js',
  'app/index.html',
  'app/sw.js',
  'lame.min.js',
  'verapdf/verapdf_validator.html',
  'verapdf/verapdf-cli.jar'
)

$Results = foreach ($RelativePath in $Checks) {
  $LocalFile = Join-Path $Artifact $RelativePath
  $Download = Join-Path `
    'C:\tmp' `
    ("alloflow-live-" + [guid]::NewGuid().ToString('N') + '.bin')
  $CacheBust = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $Url = "$Production/$RelativePath`?verify=$ShortCommit-$CacheBust"

  try {
    & curl.exe `
      --fail `
      --silent `
      --show-error `
      --location `
      --max-time 120 `
      --output $Download `
      $Url

    if ($LASTEXITCODE -ne 0) {
      throw "Download failed: $Url"
    }

    $LocalHash = (Get-FileHash -LiteralPath $LocalFile -Algorithm SHA256).Hash
    $LiveHash = (Get-FileHash -LiteralPath $Download -Algorithm SHA256).Hash

    [pscustomobject]@{
      Path = $RelativePath
      LocalBytes = (Get-Item -LiteralPath $LocalFile).Length
      LiveBytes = (Get-Item -LiteralPath $Download).Length
      HashMatch = $LocalHash -eq $LiveHash
    }
  }
  finally {
    if (Test-Path -LiteralPath $Download) {
      Remove-Item -LiteralPath $Download -Force
    }
  }
}

$Results | Format-Table -AutoSize

if ($Results.HashMatch -contains $false) {
  throw 'One or more production files do not match the deployed artifact'
}
```

Also verify the hashed JavaScript and CSS files referenced by
`app/index.html`. Their names change when the React build changes, so derive
them from that committed HTML instead of hard-coding an old hash.

On 2026-07-26, twelve representative production files matched the committed
artifact byte-for-byte, including:

- `app/static/js/main.b5c21532.js`
- `app/static/css/main.74e71ec1.css`
- the application index and service worker
- the AI backend and desktop bridge modules
- the document pipeline and PDF audit modules
- the 16,038,834-byte veraPDF JAR

The veraPDF JAR returned `application/java-archive`, not an HTML fallback page.

## 9. Final repository safety check

A direct Pages upload should not modify the Git worktree:

```powershell
git -C $Repo status --porcelain=v1 --untracked-files=no
git -C $Repo rev-parse HEAD
git -C $Repo rev-parse origin/main
git -C $Repo rev-parse backup/main
```

The status command must remain empty and all three hashes must still match.
Do not delete the user's untracked files after deployment.

## What this direct deployment does and does not do

It does:

- publish the commit-derived static `desktop/web-app/public` tree;
- update the existing `alloflow-cdn` Cloudflare Pages production project;
- attach the selected Git commit and `main` branch metadata; and
- bypass Cloudflare's failing Git-integrated npm/build stage.

It does not:

- build the React app;
- run tests;
- commit or push Git changes;
- deploy Firebase;
- deploy Cloudflare Workers;
- include untracked workspace files; or
- repair the underlying Cloudflare Git build configuration.

Run the repository's build/test/commit workflow first. On 2026-07-26 Firebase
was intentionally skipped because no school-owned Firebase project was
configured.

## Recovery and rollback

Do not delete deployments or rewrite Git history to recover.

To restore an earlier known-good commit:

1. identify the exact earlier commit;
2. reconstruct a fresh artifact from that commit with `git archive`;
3. validate it;
4. obtain authorization to change production; and
5. deploy that artifact as a new Pages production deployment with the earlier
   commit hash attached.

This creates an auditable forward deployment and leaves the failed or replaced
deployment available in Cloudflare's history.

## Short operational checklist

1. Confirm explicit production-deploy authorization.
2. Confirm no staged or modified tracked files.
3. Confirm local, GitHub, and Codeberg commit hashes match.
4. Run/confirm the appropriate tests and build.
5. Create a unique artifact with `git archive`.
6. Reject oversized files.
7. Confirm Wrangler OAuth with `whoami`.
8. Use `wrangler pages deploy`, never plain `wrangler deploy`, for production.
9. Do not start a duplicate uploader.
10. Confirm the newest Pages deployment is Production/main/the intended commit.
11. Compare live assets byte-for-byte.
12. Reconfirm Git state and preserve all unrelated untracked files.
