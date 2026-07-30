import {
  requireTransferPrincipal,
  type TransferPrincipal,
} from "./access-auth";
import {
  claimUploadGrant,
  completeUpload,
  consumeDownloadGrant,
  getJobForOwner,
  getUploadForOwner,
  noteDownload,
  rejectUpload,
  releaseUploadGrant,
  type JobRow,
} from "./job-store";
import {
  assertPilotBindings,
  pilotReadiness,
  type PilotConfig,
  type PilotEnv,
  type PilotPrincipal,
} from "./pilot-env";
import {
  PilotError,
  escapeHtml,
  isOpaqueId,
  jsonError,
  noStoreHeaders,
  parseBearer,
  randomToken,
  sha256Base64Url,
} from "./security";

function htmlResponse(body: string, nonce: string): Response {
  return new Response(body, {
    headers: noStoreHeaders({
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": [
        "default-src 'none'",
        `script-src 'nonce-${nonce}'`,
        `style-src 'nonce-${nonce}'`,
        "connect-src 'self'",
        "img-src 'self' data:",
        "base-uri 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
      ].join("; "),
      "Permissions-Policy":
        "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    }),
  });
}

function transferPageShell(
  title: string,
  body: string,
  script: string,
): Response {
  const nonce = randomToken(18);
  return htmlResponse(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style nonce="${nonce}">
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f6fb; color: #17213a; }
    main { width: min(38rem, calc(100% - 2rem)); padding: 2rem; border: 1px solid #d8deeb; border-radius: 1rem; background: white; box-shadow: 0 1rem 3rem rgba(27, 42, 80, .08); }
    h1 { margin-top: 0; font-size: 1.5rem; }
    p { line-height: 1.55; }
    label { display: block; margin: 1.25rem 0 .5rem; font-weight: 650; }
    input { width: 100%; box-sizing: border-box; padding: .75rem; border: 1px solid #9aa6bd; border-radius: .5rem; }
    button { margin-top: 1rem; padding: .75rem 1rem; border: 0; border-radius: .55rem; background: #3157c8; color: white; font: inherit; font-weight: 700; cursor: pointer; }
    button[disabled] { opacity: .55; cursor: wait; }
    #status { min-height: 1.5rem; font-weight: 650; }
    .privacy { color: #4e5b74; font-size: .92rem; }
  </style>
</head>
<body>
  <main>${body}</main>
  <script nonce="${nonce}">${script}</script>
</body>
</html>`,
    nonce,
  );
}

function uploadPage(uploadId: string, config: PilotConfig): Response {
  const id = JSON.stringify(uploadId);
  const maximum = JSON.stringify(config.uploadMaxBytes);
  return transferPageShell(
    "Upload a PDF to AlloFlow",
    `<h1>Upload a PDF for remediation</h1>
<p>This one-time link accepts one PDF of up to ${Math.floor(
      config.uploadMaxBytes / (1024 * 1024),
    )} MiB. The original filename is not retained.</p>
<label for="document">PDF document</label>
<input id="document" type="file" accept="application/pdf,.pdf">
<button id="upload" type="button">Upload securely</button>
<p id="status" role="status" aria-live="polite"></p>
<p class="privacy">The link expires quickly and can be used once. Return to Claude after the upload completes.</p>`,
    `
const uploadId = ${id};
const maximumBytes = ${maximum};
const fragment = new URLSearchParams(location.hash.slice(1));
const grant = fragment.get("grant") || "";
history.replaceState(null, "", location.pathname);
const picker = document.getElementById("document");
const button = document.getElementById("upload");
const status = document.getElementById("status");
if (!/^[A-Za-z0-9_-]{43}$/.test(grant)) {
  button.disabled = true;
  status.textContent = "This upload link is missing or invalid. Ask Claude for a new one.";
}
button.addEventListener("click", async () => {
  const file = picker.files && picker.files[0];
  if (!file) {
    status.textContent = "Choose a PDF first.";
    return;
  }
  if (file.type !== "application/pdf" || file.size < 5 || file.size > maximumBytes) {
    status.textContent = "Choose a valid PDF within the size limit.";
    return;
  }
  button.disabled = true;
  status.textContent = "Uploading…";
  try {
    const response = await fetch("/upload/" + encodeURIComponent(uploadId) + "/content", {
      method: "POST",
      headers: {
        "Authorization": "Upload " + grant,
        "Content-Type": "application/pdf"
      },
      body: file,
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error"
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "upload_failed");
    status.textContent = "Upload complete. You can close this page and return to Claude.";
    picker.disabled = true;
  } catch {
    status.textContent = "The upload did not complete. Ask Claude for a new upload link.";
    button.disabled = false;
  }
});`,
  );
}

function downloadPage(jobId: string): Response {
  const id = JSON.stringify(jobId);
  return transferPageShell(
    "Download the remediated PDF",
    `<h1>Download your remediated PDF</h1>
<p>This one-time link downloads the result directly from the institution’s private storage.</p>
<button id="download" type="button">Download PDF</button>
<p id="status" role="status" aria-live="polite"></p>
<p class="privacy">The result is scheduled for deletion after the pilot retention window.</p>`,
    `
const jobId = ${id};
const fragment = new URLSearchParams(location.hash.slice(1));
const grant = fragment.get("grant") || "";
history.replaceState(null, "", location.pathname);
const button = document.getElementById("download");
const status = document.getElementById("status");
if (!/^[A-Za-z0-9_-]{43}$/.test(grant)) {
  button.disabled = true;
  status.textContent = "This download link is missing or invalid. Ask Claude for a new one.";
}
button.addEventListener("click", async () => {
  button.disabled = true;
  status.textContent = "Preparing download…";
  try {
    const response = await fetch("/result/" + encodeURIComponent(jobId) + "/download", {
      headers: { "Authorization": "Download " + grant },
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error"
    });
    if (!response.ok) throw new Error("download_failed");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "alloflow-remediated.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    status.textContent = "Download started.";
  } catch {
    status.textContent = "The download link could not be used. Ask Claude for a new one.";
    button.disabled = false;
  }
});`,
  );
}

function assertSameOriginIfPresent(
  request: Request,
  config: PilotConfig,
): void {
  const origin = request.headers.get("Origin");
  if (origin && origin !== config.origin) {
    throw new PilotError("origin_not_allowed", 403);
  }
}

function ownerPrincipal(identity: TransferPrincipal): PilotPrincipal {
  return {
    institutionId: identity.institutionId,
    ownerId: identity.ownerId,
    scopes: [],
    upstreamSubject: "verified-transfer-access",
  };
}

async function requireUploadOwner(
  request: Request,
  env: PilotEnv,
  uploadId: string,
): Promise<TransferPrincipal> {
  const identity = await requireTransferPrincipal(request, env);
  await getUploadForOwner(env, uploadId, ownerPrincipal(identity));
  return identity;
}

async function requireJobOwner(
  request: Request,
  env: PilotEnv,
  jobId: string,
): Promise<{ identity: TransferPrincipal; job: JobRow }> {
  const identity = await requireTransferPrincipal(request, env);
  const job = await getJobForOwner(
    env,
    jobId,
    ownerPrincipal(identity),
  );
  return { identity, job };
}

function checksumHex(value: ArrayBuffer | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return Array.from(new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function resultObjectMatchesJob(
  job: Pick<
    JobRow,
    "result_size_bytes" | "result_sha256"
  >,
  object: {
    size: number;
    httpMetadata?: { contentType?: string };
    checksums: { sha256?: ArrayBuffer };
  },
): boolean {
  return (
    Number.isSafeInteger(job.result_size_bytes) &&
    (job.result_size_bytes as number) >= 5 &&
    typeof job.result_sha256 === "string" &&
    /^[0-9a-f]{64}$/u.test(job.result_sha256) &&
    object.size === job.result_size_bytes &&
    object.httpMetadata?.contentType === "application/pdf" &&
    checksumHex(object.checksums.sha256) === job.result_sha256
  );
}

async function uploadDocument(
  request: Request,
  env: PilotEnv,
  uploadId: string,
): Promise<Response> {
  const config = assertPilotBindings(env);
  assertSameOriginIfPresent(request, config);
  if (request.method !== "POST") {
    throw new PilotError("method_not_allowed", 405);
  }
  if (!isOpaqueId(uploadId, "upl")) {
    throw new PilotError("not_found", 404);
  }
  const identity = await requireUploadOwner(request, env, uploadId);
  if (request.headers.get("Content-Type") !== "application/pdf") {
    throw new PilotError("unsupported_media_type", 415);
  }
  const lengthValue = request.headers.get("Content-Length");
  if (!lengthValue || !/^[0-9]+$/u.test(lengthValue)) {
    throw new PilotError("content_length_required", 411);
  }
  const sizeBytes = Number(lengthValue);
  if (
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes < 5 ||
    sizeBytes > config.uploadMaxBytes
  ) {
    throw new PilotError("document_size_not_allowed", 413);
  }
  if (!request.body || !env.DOCUMENTS) {
    throw new PilotError("empty_document", 400);
  }

  const token = parseBearer(request, "Upload");
  const upload = await claimUploadGrant(
    env,
    uploadId,
    await sha256Base64Url(token),
  );
  if (
    upload.institution_id !== identity.institutionId ||
    upload.owner_id !== identity.ownerId
  ) {
    await releaseUploadGrant(env, uploadId).catch(() => undefined);
    throw new PilotError("not_found", 404);
  }
  let rejected = false;

  try {
    const stored = await env.DOCUMENTS.put(upload.object_key, request.body, {
      httpMetadata: {
        contentType: "application/pdf",
        cacheControl: "no-store",
      },
      onlyIf: {
        etagDoesNotMatch: "*",
      },
    });
    if (!stored || stored.size !== sizeBytes) {
      throw new PilotError("upload_state_conflict", 409);
    }

    const prefixObject = await env.DOCUMENTS.get(upload.object_key, {
      range: { offset: 0, length: 5 },
    });
    if (!prefixObject) {
      throw new PilotError("upload_failed", 502);
    }
    const prefix = new Uint8Array(await prefixObject.arrayBuffer());
    const pdfSignature =
      prefix.length === 5 &&
      prefix[0] === 0x25 &&
      prefix[1] === 0x50 &&
      prefix[2] === 0x44 &&
      prefix[3] === 0x46 &&
      prefix[4] === 0x2d;
    if (!pdfSignature) {
      rejected = true;
      await env.DOCUMENTS.delete(upload.object_key);
      await rejectUpload(env, uploadId);
      throw new PilotError("invalid_pdf_signature", 415);
    }

    await completeUpload(env, uploadId, sizeBytes);
    return Response.json(
      {
        ok: true,
        uploadId,
        sizeBytes,
        contentType: "application/pdf",
      },
      {
        status: 201,
        headers: noStoreHeaders(),
      },
    );
  } catch (error) {
    if (!rejected) {
      await env.DOCUMENTS.delete(upload.object_key).catch(() => undefined);
      await rejectUpload(env, uploadId).catch(() => undefined);
    }
    throw error;
  }
}

async function downloadDocument(
  request: Request,
  env: PilotEnv,
  jobId: string,
): Promise<Response> {
  const config = assertPilotBindings(env);
  assertSameOriginIfPresent(request, config);
  if (request.method !== "GET") {
    throw new PilotError("method_not_allowed", 405);
  }
  if (!isOpaqueId(jobId, "job")) {
    throw new PilotError("not_found", 404);
  }
  const { identity, job: ownedJob } =
    await requireJobOwner(request, env, jobId);
  if (!env.DOCUMENTS) {
    throw new PilotError("pilot_not_configured", 503);
  }

  if (!ownedJob.result_key) {
    throw new PilotError("result_not_ready", 409);
  }
  const token = parseBearer(request, "Download");
  const object = await env.DOCUMENTS.get(ownedJob.result_key);
  if (!object) {
    throw new PilotError("result_missing", 410);
  }
  if (!resultObjectMatchesJob(ownedJob, object)) {
    throw new PilotError("result_integrity_failed", 502);
  }

  const job = await consumeDownloadGrant(
    env,
    jobId,
    await sha256Base64Url(token),
  );
  if (
    job.institution_id !== identity.institutionId ||
    job.owner_id !== identity.ownerId ||
    job.result_key !== ownedJob.result_key ||
    job.result_size_bytes !== ownedJob.result_size_bytes ||
    job.result_sha256 !== ownedJob.result_sha256
  ) {
    throw new PilotError("result_integrity_failed", 502);
  }

  await noteDownload(env, config, jobId);
  return new Response(object.body, {
    headers: noStoreHeaders({
      "Content-Type": "application/pdf",
      "Content-Length": String(object.size),
      "Content-Disposition":
        'attachment; filename="alloflow-remediated.pdf"',
      "Content-Security-Policy": "default-src 'none'; sandbox",
    }),
  });
}

export async function handleDocumentTransfer(
  request: Request,
  env: PilotEnv,
): Promise<Response | undefined> {
  const url = new URL(request.url);
  const uploadPageMatch = /^\/upload\/(upl_[0-9a-f]{32})$/u.exec(
    url.pathname,
  );
  const uploadApiMatch =
    /^\/upload\/(upl_[0-9a-f]{32})\/content$/u.exec(url.pathname);
  const downloadPageMatch = /^\/result\/(job_[0-9a-f]{32})$/u.exec(
    url.pathname,
  );
  const downloadApiMatch =
    /^\/result\/(job_[0-9a-f]{32})\/download$/u.exec(url.pathname);

  if (
    (uploadPageMatch ||
      uploadApiMatch ||
      downloadPageMatch ||
      downloadApiMatch) &&
    !pilotReadiness(env).ready
  ) {
    return Response.json(
      { ok: false, error: "pilot_acceptance_required" },
      { status: 503, headers: noStoreHeaders() },
    );
  }

  try {
    if (request.method === "GET" && uploadPageMatch) {
      const config = assertPilotBindings(env);
      await requireUploadOwner(request, env, uploadPageMatch[1]);
      return uploadPage(uploadPageMatch[1], config);
    }
    if (uploadApiMatch) {
      return await uploadDocument(request, env, uploadApiMatch[1]);
    }
    if (request.method === "GET" && downloadPageMatch) {
      assertPilotBindings(env);
      await requireJobOwner(request, env, downloadPageMatch[1]);
      return downloadPage(downloadPageMatch[1]);
    }
    if (downloadApiMatch) {
      return await downloadDocument(request, env, downloadApiMatch[1]);
    }
  } catch (error) {
    return jsonError(error);
  }
  return undefined;
}

