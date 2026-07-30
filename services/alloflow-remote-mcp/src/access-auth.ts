import {
  OAuthError,
  type AuthRequest,
  type ClientRegistrationCallbackResult,
  type TokenExchangeCallbackOptions,
  type TokenExchangeCallbackResult,
} from "@cloudflare/workers-oauth-provider";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

import {
  PILOT_SCOPES,
  assertAccessConfiguration,
  getPilotConfig,
  type OAuthAuthorizationRequest,
  type PilotEnv,
  type PilotPrincipal,
  type PilotScope,
} from "./pilot-env";
import { principalIsBoundToEnvironment } from "./principal-binding";
import {
  PilotError,
  constantTimeEqual,
  escapeHtml,
  noStoreHeaders,
  randomToken,
  readBoundedText,
  readJson,
  sha256Base64Url,
} from "./security";

const AUTH_STATE_TTL_SECONDS = 10 * 60;
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_TRANSFER_TOKEN_AGE_SECONDS = 24 * 60 * 60;
const TRANSFER_ACCESS_HEADER = "Cf-Access-Jwt-Assertion";
const CONSENT_FORM_MAX_BYTES = 8 * 1024;
const CLAUDE_REDIRECT_URIS = new Set([
  "https://claude.ai/api/mcp/auth_callback",
]);

type TransferAccessEnv = PilotEnv & {
  TRANSFER_ACCESS_AUDIENCE?: string;
};

export type TransferPrincipal = {
  institutionId: string;
  ownerId: string;
};

type StoredConsent = {
  oauthRequest: OAuthAuthorizationRequest;
  clientName: string;
  csrfHash: string;
};

type StoredAccessState = {
  oauthRequest: OAuthAuthorizationRequest;
  verifier: string;
};

type AccessTokenResponse = {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

function oauthHelpers(env: PilotEnv): NonNullable<PilotEnv["OAUTH_PROVIDER"]> {
  if (!env.OAUTH_PROVIDER || !env.OAUTH_KV) {
    throw new PilotError("pilot_identity_not_configured", 503);
  }
  return env.OAUTH_PROVIDER;
}

function stateKey(kind: "consent" | "access", id: string): string {
  return `alloflow:${kind}:${id}`;
}

function cookieValue(request: Request, name: string): string | undefined {
  const cookie = request.headers.get("Cookie");
  if (!cookie) {
    return undefined;
  }
  for (const part of cookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) {
      continue;
    }
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return undefined;
}

function authHtml(body: string, nonce: string, cookie?: string): Response {
  const headers = noStoreHeaders({
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": [
      "default-src 'none'",
      `style-src 'nonce-${nonce}'`,
      "form-action 'self'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ].join("; "),
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  });
  if (cookie) {
    headers.append("Set-Cookie", cookie);
  }
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connect AlloFlow</title>
  <style nonce="${nonce}">
    :root { font-family: ui-sans-serif, system-ui, sans-serif; color-scheme: light; }
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; color: #17213a; background: #f4f6fb; }
    main { width: min(38rem, calc(100% - 2rem)); padding: 2rem; border: 1px solid #d8deeb; border-radius: 1rem; background: white; box-shadow: 0 1rem 3rem rgba(27, 42, 80, .08); }
    h1 { margin-top: 0; font-size: 1.55rem; }
    p, li { line-height: 1.55; }
    button { padding: .78rem 1rem; border: 0; border-radius: .55rem; background: #3157c8; color: white; font: inherit; font-weight: 700; cursor: pointer; }
    .privacy { color: #4e5b74; font-size: .92rem; }
  </style>
</head>
<body><main>${body}</main></body>
</html>`,
    { headers },
  );
}

function validateAuthRequest(
  request: OAuthAuthorizationRequest,
  origin: string,
): PilotScope[] {
  if (
    request.responseType !== "code" ||
    !request.codeChallenge ||
    request.codeChallengeMethod !== "S256"
  ) {
    throw new PilotError("pkce_s256_required", 400);
  }
  if (
    request.scope.length === 0 ||
    request.scope.some(
      (scope) => !PILOT_SCOPES.includes(scope as PilotScope),
    )
  ) {
    throw new PilotError("invalid_scope", 400);
  }
  const resources = Array.isArray(request.resource)
    ? request.resource
    : request.resource
      ? [request.resource]
      : [];
  if (
    resources.length > 0 &&
    (resources.length !== 1 || resources[0] !== `${origin}/mcp`)
  ) {
    throw new PilotError("invalid_resource", 400);
  }
  return request.scope as PilotScope[];
}

function consentPage(
  consentId: string,
  csrf: string,
  clientName: string,
  scopes: PilotScope[],
): Response {
  const nonce = randomToken(18);
  const scopeLabels: Record<PilotScope, string> = {
    "documents:upload": "Create a private one-time PDF upload",
    "documents:remediate": "Start and cancel remediation jobs",
    "documents:read": "Read job status and download completed results",
    "documents:delete": "Delete uploaded documents and results",
  };
  const list = scopes
    .map((scope) => `<li>${escapeHtml(scopeLabels[scope])}</li>`)
    .join("");
  return authHtml(
    `<h1>Connect ${escapeHtml(clientName)} to AlloFlow</h1>
<p>Continue to your institution’s sign-in page. If permitted, this connector will be able to:</p>
<ul>${list}</ul>
<form method="post" action="/authorize">
  <input type="hidden" name="consent_id" value="${escapeHtml(consentId)}">
  <button type="submit">Continue with institution sign-in</button>
</form>
<p class="privacy">AlloFlow stores a pseudonymous account identifier. It does not store your email address in document-job metadata.</p>`,
    nonce,
    `alloflow_consent=${csrf}; Max-Age=${AUTH_STATE_TTL_SECONDS}; Path=/authorize; Secure; HttpOnly; SameSite=Lax`,
  );
}

async function beginAuthorization(
  request: Request,
  env: PilotEnv,
): Promise<Response> {
  assertAccessConfiguration(env);
  const config = getPilotConfig(env);
  const helpers = oauthHelpers(env);
  const oauthRequest = (await helpers.parseAuthRequest(
    request,
  )) as AuthRequest as OAuthAuthorizationRequest;
  const scopes = validateAuthRequest(oauthRequest, config.origin);
  const client = await helpers.lookupClient(oauthRequest.clientId);
  if (!client || !env.OAUTH_KV) {
    throw new PilotError("invalid_client", 400);
  }

  const consentId = randomToken();
  const csrf = randomToken();
  const stored: StoredConsent = {
    oauthRequest,
    clientName: client.clientName || "Claude",
    csrfHash: await sha256Base64Url(csrf),
  };
  await env.OAUTH_KV.put(
    stateKey("consent", consentId),
    JSON.stringify(stored),
    { expirationTtl: AUTH_STATE_TTL_SECONDS },
  );
  return consentPage(consentId, csrf, stored.clientName, scopes);
}

async function continueAuthorization(
  request: Request,
  env: PilotEnv,
): Promise<Response> {
  assertAccessConfiguration(env);
  const config = getPilotConfig(env);
  if (!env.OAUTH_KV) {
    throw new PilotError("pilot_identity_not_configured", 503);
  }
  const contentType = request.headers.get("Content-Type") || "";
  if (
    contentType.split(";", 1)[0]?.trim().toLowerCase() !==
    "application/x-www-form-urlencoded"
  ) {
    throw new PilotError("invalid_request", 400);
  }
  const formText = await readBoundedText(
    request,
    CONSENT_FORM_MAX_BYTES,
    new PilotError("invalid_request", 413),
  );
  const form = new URLSearchParams(formText);
  const consentId = form.get("consent_id");
  const csrf = cookieValue(request, "alloflow_consent");
  if (
    typeof consentId !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/u.test(consentId) ||
    !csrf
  ) {
    throw new PilotError("authorization_state_invalid", 400);
  }

  const stored = await env.OAUTH_KV.get<StoredConsent>(
    stateKey("consent", consentId),
    "json",
  );
  await env.OAUTH_KV.delete(stateKey("consent", consentId));
  if (
    !stored ||
    !constantTimeEqual(
      stored.csrfHash,
      await sha256Base64Url(csrf),
    )
  ) {
    throw new PilotError("authorization_state_invalid", 400);
  }
  validateAuthRequest(stored.oauthRequest, config.origin);

  const state = randomToken();
  const verifier = randomToken(48);
  const challenge = await sha256Base64Url(verifier);
  const accessState: StoredAccessState = {
    oauthRequest: stored.oauthRequest,
    verifier,
  };
  await env.OAUTH_KV.put(
    stateKey("access", state),
    JSON.stringify(accessState),
    { expirationTtl: AUTH_STATE_TTL_SECONDS },
  );

  const destination = new URL(env.ACCESS_AUTHORIZATION_URL as string);
  destination.searchParams.set("client_id", env.ACCESS_CLIENT_ID as string);
  destination.searchParams.set("redirect_uri", `${config.origin}/oauth/callback`);
  destination.searchParams.set("response_type", "code");
  destination.searchParams.set("scope", "openid profile offline_access");
  destination.searchParams.set("state", state);
  destination.searchParams.set("code_challenge", challenge);
  destination.searchParams.set("code_challenge_method", "S256");
  return new Response(null, {
    status: 302,
    headers: noStoreHeaders({
      Location: destination.toString(),
      "Set-Cookie":
        "alloflow_consent=; Max-Age=0; Path=/authorize; Secure; HttpOnly; SameSite=Lax",
    }),
  });
}

async function exchangeAccessCode(
  env: PilotEnv,
  code: string,
  verifier: string,
): Promise<AccessTokenResponse> {
  const config = getPilotConfig(env);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: env.ACCESS_CLIENT_ID as string,
    client_secret: env.ACCESS_CLIENT_SECRET as string,
    redirect_uri: `${config.origin}/oauth/callback`,
    code_verifier: verifier,
  });
  const response = await fetch(env.ACCESS_TOKEN_URL as string, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    redirect: "error",
  });
  if (!response.ok) {
    throw new PilotError("institution_login_failed", 401);
  }
  return readJson<AccessTokenResponse>(response);
}

function subjectFromClaims(env: PilotEnv, claims: JWTPayload): string {
  const claimName = env.ACCESS_SUBJECT_CLAIM || "sub";
  const subject = claims[claimName];
  if (
    typeof subject !== "string" ||
    subject.length === 0 ||
    subject.length > 512
  ) {
    throw new PilotError("institution_identity_invalid", 401);
  }
  return subject;
}

async function ownerIdFromSubject(
  env: PilotEnv,
  subject: string,
): Promise<string> {
  const config = getPilotConfig(env);
  return sha256Base64Url(`${config.institutionId}\u0000${subject}`);
}

export function assertTransferAccessConfiguration(env: PilotEnv): string {
  assertAccessConfiguration(env);
  const audience = (env as TransferAccessEnv).TRANSFER_ACCESS_AUDIENCE;
  if (!audience || !/^[A-Fa-f0-9]{64}$/u.test(audience)) {
    throw new PilotError("pilot_transfer_identity_not_configured", 503);
  }
  return audience;
}

export function isTransferAccessConfigured(env: PilotEnv): boolean {
  try {
    assertTransferAccessConfiguration(env);
    return true;
  } catch {
    return false;
  }
}

export async function requireTransferPrincipal(
  request: Request,
  env: PilotEnv,
): Promise<TransferPrincipal> {
  const config = getPilotConfig(env);
  if (new URL(request.url).origin !== config.origin) {
    throw new PilotError("transfer_identity_invalid", 403);
  }
  const audience = assertTransferAccessConfiguration(env);
  const assertion = request.headers.get(TRANSFER_ACCESS_HEADER);
  if (
    !assertion ||
    assertion.length > 16 * 1024 ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(assertion)
  ) {
    throw new PilotError("transfer_identity_required", 401);
  }

  let claims: JWTPayload;
  try {
    const verified = await jwtVerify(
      assertion,
      createRemoteJWKSet(new URL(env.ACCESS_JWKS_URL as string)),
      {
        issuer: env.ACCESS_ISSUER,
        audience,
        algorithms: ["RS256"],
        clockTolerance: 60,
        maxTokenAge: `${MAX_TRANSFER_TOKEN_AGE_SECONDS}s`,
        requiredClaims: ["iss", "aud", "sub", "iat", "nbf", "exp"],
      },
    );
    claims = verified.payload;
  } catch {
    throw new PilotError("transfer_identity_invalid", 403);
  }

  if (
    claims.type !== "app" ||
    typeof claims.iat !== "number" ||
    typeof claims.exp !== "number" ||
    claims.exp <= claims.iat ||
    claims.exp - claims.iat > MAX_TRANSFER_TOKEN_AGE_SECONDS
  ) {
    throw new PilotError("transfer_identity_invalid", 403);
  }
  const subject = subjectFromClaims(env, claims);
  return {
    institutionId: config.institutionId,
    ownerId: await ownerIdFromSubject(env, subject),
  };
}

async function verifyAccessIdToken(
  env: PilotEnv,
  idToken: string | undefined,
): Promise<{ claims: JWTPayload; subject: string }> {
  if (!idToken) {
    throw new PilotError("institution_identity_invalid", 401);
  }
  const keySet = createRemoteJWKSet(new URL(env.ACCESS_JWKS_URL as string));
  let claims: JWTPayload;
  try {
    const verified = await jwtVerify(idToken, keySet, {
      issuer: env.ACCESS_ISSUER,
      audience: env.ACCESS_CLIENT_ID,
      algorithms: ["RS256"],
      clockTolerance: 60,
      maxTokenAge: "1h",
    });
    claims = verified.payload;
  } catch {
    throw new PilotError("institution_identity_invalid", 401);
  }
  return {
    claims,
    subject: subjectFromClaims(env, claims),
  };
}

function safeExpiresIn(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 60
  ) {
    return ACCESS_TOKEN_TTL_SECONDS;
  }
  return Math.min(Math.floor(value), ACCESS_TOKEN_TTL_SECONDS);
}

async function finishAuthorization(
  request: Request,
  env: PilotEnv,
): Promise<Response> {
  assertAccessConfiguration(env);
  const config = getPilotConfig(env);
  if (!env.OAUTH_KV) {
    throw new PilotError("pilot_identity_not_configured", 503);
  }
  const url = new URL(request.url);
  if (url.searchParams.has("error")) {
    throw new PilotError("institution_login_denied", 403);
  }
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (
    !state ||
    !code ||
    !/^[A-Za-z0-9_-]{43}$/u.test(state) ||
    code.length > 4096
  ) {
    throw new PilotError("authorization_state_invalid", 400);
  }
  const stored = await env.OAUTH_KV.get<StoredAccessState>(
    stateKey("access", state),
    "json",
  );
  await env.OAUTH_KV.delete(stateKey("access", state));
  if (!stored) {
    throw new PilotError("authorization_state_invalid", 400);
  }
  const scopes = validateAuthRequest(stored.oauthRequest, config.origin);
  const token = await exchangeAccessCode(env, code, stored.verifier);
  const { subject } = await verifyAccessIdToken(env, token.id_token);
  const ownerId = await ownerIdFromSubject(env, subject);
  const expiresIn = safeExpiresIn(token.expires_in);
  const principal: PilotPrincipal = {
    institutionId: config.institutionId,
    ownerId,
    scopes,
    upstreamSubject: subject,
    upstreamRefreshToken: token.refresh_token,
    upstreamTokenExpiresAt: Math.floor(Date.now() / 1000) + expiresIn,
  };
  const { redirectTo } = await oauthHelpers(env).completeAuthorization({
    request: stored.oauthRequest,
    userId: ownerId,
    metadata: {
      institutionId: config.institutionId,
      principalId: ownerId,
    },
    scope: scopes,
    props: principal,
    revokeExistingGrants: true,
  });
  return new Response(null, {
    status: 302,
    headers: noStoreHeaders({ Location: redirectTo }),
  });
}

export async function handleAuthorizationRequest(
  request: Request,
  env: PilotEnv,
): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (url.pathname === "/authorize" && request.method === "GET") {
    return beginAuthorization(request, env);
  }
  if (url.pathname === "/authorize" && request.method === "POST") {
    return continueAuthorization(request, env);
  }
  if (url.pathname === "/oauth/callback" && request.method === "GET") {
    return finishAuthorization(request, env);
  }
  return undefined;
}

function isLocalRedirect(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

export function validateClientRegistration(
  metadata: Record<string, unknown>,
  env: PilotEnv,
): ClientRegistrationCallbackResult | undefined {
  const redirectUris = metadata.redirect_uris;
  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length === 0 ||
    redirectUris.length > 4 ||
    redirectUris.some((value) => typeof value !== "string")
  ) {
    return { description: "A supported redirect URI is required." };
  }
  const allowLocal = env.ALLOW_LOCAL_OAUTH === "true";
  const chatGptRedirectUri =
    getPilotConfig(env).chatGptRedirectUri;
  const allowedRedirectUris = new Set([
    ...CLAUDE_REDIRECT_URIS,
    ...(chatGptRedirectUri
      ? [chatGptRedirectUri]
      : []),
  ]);
  if (
    redirectUris.some(
      (value) =>
        !allowedRedirectUris.has(value as string) &&
        !(allowLocal && isLocalRedirect(value as string)),
    )
  ) {
    return { description: "The redirect URI is not allowed." };
  }
  if (metadata.token_endpoint_auth_method !== "none") {
    return {
      description: "The institution pilot accepts public PKCE clients only.",
    };
  }
  if (metadata.software_statement !== undefined) {
    return { description: "Software statements are not accepted." };
  }
  const grantTypes = metadata.grant_types;
  if (
    grantTypes !== undefined &&
    (!Array.isArray(grantTypes) ||
      grantTypes.some(
        (value) =>
          value !== "authorization_code" && value !== "refresh_token",
      ))
  ) {
    return { description: "The requested grant type is not supported." };
  }
  const responseTypes = metadata.response_types;
  if (
    responseTypes !== undefined &&
    (!Array.isArray(responseTypes) ||
      responseTypes.some((value) => value !== "code"))
  ) {
    return { description: "The requested response type is not supported." };
  }
  return undefined;
}

function principalFromProps(value: unknown): PilotPrincipal {
  if (!value || typeof value !== "object") {
    throw new OAuthError("invalid_grant", {
      description: "Institution authorization must be renewed.",
    });
  }
  const candidate = value as Partial<PilotPrincipal>;
  if (
    typeof candidate.institutionId !== "string" ||
    typeof candidate.ownerId !== "string" ||
    typeof candidate.upstreamSubject !== "string" ||
    !Array.isArray(candidate.scopes) ||
    candidate.scopes.some(
      (scope) => !PILOT_SCOPES.includes(scope as PilotScope),
    )
  ) {
    throw new OAuthError("invalid_grant", {
      description: "Institution authorization must be renewed.",
    });
  }
  return candidate as PilotPrincipal;
}

async function refreshAccessToken(
  env: PilotEnv,
  principal: PilotPrincipal,
): Promise<PilotPrincipal> {
  if (!principal.upstreamRefreshToken) {
    throw new OAuthError("invalid_grant", {
      description: "Institution authorization must be renewed.",
    });
  }
  const response = await fetch(env.ACCESS_TOKEN_URL as string, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: principal.upstreamRefreshToken,
      client_id: env.ACCESS_CLIENT_ID as string,
      client_secret: env.ACCESS_CLIENT_SECRET as string,
    }),
    redirect: "error",
  });
  if (!response.ok) {
    if (response.status === 400 || response.status === 401) {
      throw new OAuthError("invalid_grant", {
        description: "Institution authorization must be renewed.",
      });
    }
    throw new OAuthError("temporarily_unavailable", {
      description: "Institution identity service is temporarily unavailable.",
      statusCode: 503,
    });
  }
  const token = await readJson<AccessTokenResponse>(response);
  const { subject } = await verifyAccessIdToken(env, token.id_token);
  if (!constantTimeEqual(subject, principal.upstreamSubject)) {
    throw new OAuthError("invalid_grant", {
      description: "Institution authorization must be renewed.",
    });
  }
  const expiresIn = safeExpiresIn(token.expires_in);
  return {
    ...principal,
    upstreamRefreshToken:
      token.refresh_token || principal.upstreamRefreshToken,
    upstreamTokenExpiresAt: Math.floor(Date.now() / 1000) + expiresIn,
  };
}

export async function revalidateAccessGrant(
  options: TokenExchangeCallbackOptions,
  env: PilotEnv,
): Promise<TokenExchangeCallbackResult> {
  assertAccessConfiguration(env);
  const principal = principalFromProps(options.props);
  if (!(await principalIsBoundToEnvironment(principal, env))) {
    throw new OAuthError("invalid_grant", {
      description: "Institution authorization must be renewed.",
    });
  }
  if (options.grantType === "authorization_code") {
    return {
      newProps: principal,
      accessTokenProps: {
        ...principal,
        scopes: options.requestedScope as PilotScope[],
      },
      accessTokenTTL: Math.min(
        ACCESS_TOKEN_TTL_SECONDS,
        Math.max(
          60,
          (principal.upstreamTokenExpiresAt || 0) -
            Math.floor(Date.now() / 1000),
        ),
      ),
      refreshTokenTTL: principal.upstreamRefreshToken
        ? REFRESH_TOKEN_TTL_SECONDS
        : 0,
      accessTokenScope: options.requestedScope,
    };
  }
  const refreshed = await refreshAccessToken(env, principal);
  return {
    newProps: refreshed,
    accessTokenProps: {
      ...refreshed,
      scopes: options.requestedScope as PilotScope[],
    },
    accessTokenTTL: Math.min(
      ACCESS_TOKEN_TTL_SECONDS,
      Math.max(
        60,
        (refreshed.upstreamTokenExpiresAt || 0) -
          Math.floor(Date.now() / 1000),
      ),
    ),
    accessTokenScope: options.requestedScope,
  };
}

