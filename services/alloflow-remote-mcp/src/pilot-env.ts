export const PILOT_SCOPES = [
  "documents:upload",
  "documents:remediate",
  "documents:read",
  "documents:delete",
] as const;
export const REQUIRED_PILOT_ACCEPTANCE_VERSION =
  "institution-pilot-synthetic-v2";
export const PILOT_DATABASE_SCHEMA_VERSION = 5;
export const PILOT_CHECKPOINT_SCHEMA_VERSION = 1;
export const PILOT_RUNNER_PROTOCOL_VERSION = "remediation-run-v1";


export type PilotScope = (typeof PILOT_SCOPES)[number];

export type PilotPrincipal = {
  institutionId: string;
  ownerId: string;
  scopes: PilotScope[];
  upstreamSubject: string;
  upstreamRefreshToken?: string;
  upstreamTokenExpiresAt?: number;
};

export type RemediationWorkflowParams = {
  jobId: string;
};

export interface PilotEnv extends Partial<PilotDeploymentEnv> {
  PILOT_ACCEPTANCE_VERSION?: string;
  CHATGPT_REDIRECT_URI?: string;
  OAUTH_PROVIDER?: {
    parseAuthRequest(request: Request): Promise<OAuthAuthorizationRequest>;
    lookupClient(clientId: string): Promise<OAuthClientInfo | null>;
    completeAuthorization(options: {
      request: OAuthAuthorizationRequest;
      userId: string;
      metadata: unknown;
      scope: string[];
      props: PilotPrincipal;
      revokeExistingGrants?: boolean;
    }): Promise<{ redirectTo: string }>;
  };
}

export type OAuthAuthorizationRequest = {
  responseType: string;
  clientId: string;
  redirectUri: string;
  scope: string[];
  state: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  resource?: string | string[];
};

export type OAuthClientInfo = {
  clientId: string;
  redirectUris: string[];
  clientName?: string;
  clientUri?: string;
  logoUri?: string;
};

export type PilotConfig = {
  origin: string;
  institutionId: string;
  chatGptRedirectUri?: string;
  uploadMaxBytes: number;
  uploadTtlSeconds: number;
  unstartedInputTtlSeconds: number;
  outputTtlSeconds: number;
  downloadGraceSeconds: number;
  metadataTtlSeconds: number;
  remediationMaxRunMinutes: number;
  maxOpenUploadsPerOwner: number;
  maxUploadAttemptsPerOwner24h: number;
  maxUploadAttemptsPerInstitution24h: number;
  maxActiveJobsPerOwner: number;
  maxActiveJobsPerInstitution: number;
  maxJobsPerOwner24h: number;
  maxJobsPerInstitution24h: number;
};

const DEFAULTS = {
  uploadMaxBytes: 25 * 1024 * 1024,
  uploadTtlSeconds: 10 * 60,
  unstartedInputTtlSeconds: 2 * 60 * 60,
  outputTtlSeconds: 24 * 60 * 60,
  downloadGraceSeconds: 60 * 60,
  metadataTtlSeconds: 7 * 24 * 60 * 60,
  remediationMaxRunMinutes: 25,
  maxOpenUploadsPerOwner: 3,
  maxUploadAttemptsPerOwner24h: 20,
  maxUploadAttemptsPerInstitution24h: 100,
  maxActiveJobsPerOwner: 1,
  maxActiveJobsPerInstitution: 2,
  maxJobsPerOwner24h: 10,
  maxJobsPerInstitution24h: 50,
} as const;

function boundedInteger(
  raw: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error("invalid_pilot_configuration");
  }
  return parsed;
}

export function isPilotEnabled(env: PilotEnv): boolean {
  return env.PILOT_ENABLED === "true";
}

export function validateChatGptRedirectUri(
  value: string | undefined,
): string {
  if (
    !value ||
    value.includes("*") ||
    value.includes("?") ||
    value.includes("#")
  ) {
    throw new Error("invalid_pilot_configuration");
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("invalid_pilot_configuration");
  }

  if (
    value !== parsed.href ||
    parsed.protocol !== "https:" ||
    parsed.origin !== "https://chatgpt.com" ||
    parsed.username ||
    parsed.password ||
    !/^\/connector\/oauth\/[^/]+$/u.test(parsed.pathname)
  ) {
    throw new Error("invalid_pilot_configuration");
  }
  return value;
}

export function getPilotConfig(env: PilotEnv): PilotConfig {
  if (!env.PUBLIC_ORIGIN || !env.INSTITUTION_ID) {
    throw new Error("pilot_not_configured");
  }

  const parsedOrigin = new URL(env.PUBLIC_ORIGIN);
  const local =
    parsedOrigin.hostname === "localhost" ||
    parsedOrigin.hostname === "127.0.0.1";
  if (
    parsedOrigin.pathname !== "/" ||
    parsedOrigin.search ||
    parsedOrigin.hash ||
    parsedOrigin.username ||
    parsedOrigin.password ||
    (parsedOrigin.protocol !== "https:" && !local)
  ) {
    throw new Error("invalid_pilot_configuration");
  }

  if (!/^[A-Za-z0-9_-]{8,80}$/.test(env.INSTITUTION_ID)) {
    throw new Error("invalid_pilot_configuration");
  }

  const maxOpenUploadsPerOwner = boundedInteger(
    env.MAX_OPEN_UPLOADS_PER_OWNER,
    DEFAULTS.maxOpenUploadsPerOwner,
    1,
    20,
  );
  const maxUploadAttemptsPerOwner24h = boundedInteger(
    env.MAX_UPLOAD_ATTEMPTS_PER_OWNER_24H,
    DEFAULTS.maxUploadAttemptsPerOwner24h,
    1,
    1000,
  );
  const maxUploadAttemptsPerInstitution24h = boundedInteger(
    env.MAX_UPLOAD_ATTEMPTS_PER_INSTITUTION_24H,
    DEFAULTS.maxUploadAttemptsPerInstitution24h,
    1,
    10000,
  );
  const maxActiveJobsPerOwner = boundedInteger(
    env.MAX_ACTIVE_JOBS_PER_OWNER,
    DEFAULTS.maxActiveJobsPerOwner,
    1,
    2,
  );
  const maxActiveJobsPerInstitution = boundedInteger(
    env.MAX_ACTIVE_JOBS_PER_INSTITUTION,
    DEFAULTS.maxActiveJobsPerInstitution,
    1,
    2,
  );
  const maxJobsPerOwner24h = boundedInteger(
    env.MAX_JOBS_PER_OWNER_24H,
    DEFAULTS.maxJobsPerOwner24h,
    1,
    1000,
  );
  const maxJobsPerInstitution24h = boundedInteger(
    env.MAX_JOBS_PER_INSTITUTION_24H,
    DEFAULTS.maxJobsPerInstitution24h,
    1,
    10000,
  );
  if (
    maxUploadAttemptsPerInstitution24h <
      maxUploadAttemptsPerOwner24h ||
    maxActiveJobsPerInstitution < maxActiveJobsPerOwner ||
    maxJobsPerInstitution24h < maxJobsPerOwner24h
  ) {
    throw new Error("invalid_pilot_configuration");
  }

  return {
    origin: parsedOrigin.origin,
    institutionId: env.INSTITUTION_ID,
    chatGptRedirectUri: env.CHATGPT_REDIRECT_URI
      ? validateChatGptRedirectUri(env.CHATGPT_REDIRECT_URI)
      : undefined,
    uploadMaxBytes: boundedInteger(
      env.UPLOAD_MAX_BYTES,
      DEFAULTS.uploadMaxBytes,
      1024,
      25 * 1024 * 1024,
    ),
    uploadTtlSeconds: boundedInteger(
      env.UPLOAD_TTL_SECONDS,
      DEFAULTS.uploadTtlSeconds,
      60,
      30 * 60,
    ),
    unstartedInputTtlSeconds: boundedInteger(
      env.UNSTARTED_INPUT_TTL_SECONDS,
      DEFAULTS.unstartedInputTtlSeconds,
      // Queue admission is intentionally more patient than the five-minute
      // running idle lease; throttled active work must not consume this clock.
      10 * 60,
      24 * 60 * 60,
    ),
    outputTtlSeconds: boundedInteger(
      env.OUTPUT_TTL_SECONDS,
      DEFAULTS.outputTtlSeconds,
      10 * 60,
      7 * 24 * 60 * 60,
    ),
    downloadGraceSeconds: boundedInteger(
      env.DOWNLOAD_GRACE_SECONDS,
      DEFAULTS.downloadGraceSeconds,
      5 * 60,
      24 * 60 * 60,
    ),
    metadataTtlSeconds: boundedInteger(
      env.METADATA_TTL_SECONDS,
      DEFAULTS.metadataTtlSeconds,
      24 * 60 * 60,
      30 * 24 * 60 * 60,
    ),
    remediationMaxRunMinutes: boundedInteger(
      env.REMEDIATION_MAX_RUN_MINUTES,
      DEFAULTS.remediationMaxRunMinutes,
      1,
      25,
    ),
    maxOpenUploadsPerOwner,
    maxUploadAttemptsPerOwner24h,
    maxUploadAttemptsPerInstitution24h,
    maxActiveJobsPerOwner,
    maxActiveJobsPerInstitution,
    maxJobsPerOwner24h,
    maxJobsPerInstitution24h,
  };
}

export function assertPilotBindings(env: PilotEnv): PilotConfig {
  if (
    !isPilotEnabled(env) ||
    !env.OAUTH_KV ||
    !env.PILOT_DB ||
    !env.DOCUMENTS ||
    !env.REMEDIATION_WORKFLOW ||
    !env.REMEDIATION_CONTAINER ||
    !env.DCR_RATE_LIMITER
  ) {
    throw new Error("pilot_not_configured");
  }
  return getPilotConfig(env);
}

export function assertAccessConfiguration(env: PilotEnv): void {
  const values = [
    env.ACCESS_AUTHORIZATION_URL,
    env.ACCESS_TOKEN_URL,
    env.ACCESS_JWKS_URL,
    env.ACCESS_ISSUER,
    env.ACCESS_CLIENT_ID,
    env.ACCESS_CLIENT_SECRET,
  ];
  if (values.some((value) => !value)) {
    throw new Error("pilot_identity_not_configured");
  }
  for (const value of values.slice(0, 4)) {
    if (new URL(value as string).protocol !== "https:") {
      throw new Error("invalid_pilot_configuration");
    }
  }
}

export function pilotReadiness(env: PilotEnv): {
  enabled: boolean;
  configured: boolean;
  accepted: boolean;
  ready: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!isPilotEnabled(env)) {
    return {
      enabled: false,
      configured: false,
      accepted: false,
      ready: false,
      missing: ["PILOT_ENABLED"],
    };
  }
  const required: Array<[string, unknown]> = [
    ["PUBLIC_ORIGIN", env.PUBLIC_ORIGIN],
    ["INSTITUTION_ID", env.INSTITUTION_ID],
    ["ACCESS_AUTHORIZATION_URL", env.ACCESS_AUTHORIZATION_URL],
    ["ACCESS_TOKEN_URL", env.ACCESS_TOKEN_URL],
    ["ACCESS_JWKS_URL", env.ACCESS_JWKS_URL],
    ["ACCESS_ISSUER", env.ACCESS_ISSUER],
    ["ACCESS_CLIENT_ID", env.ACCESS_CLIENT_ID],
    ["ACCESS_CLIENT_SECRET", env.ACCESS_CLIENT_SECRET],
    ["TRANSFER_ACCESS_AUDIENCE", env.TRANSFER_ACCESS_AUDIENCE],
    ["OAUTH_KV", env.OAUTH_KV],
    ["PILOT_DB", env.PILOT_DB],
    ["DOCUMENTS", env.DOCUMENTS],
    ["REMEDIATION_WORKFLOW", env.REMEDIATION_WORKFLOW],
    ["REMEDIATION_CONTAINER", env.REMEDIATION_CONTAINER],
    ["DCR_RATE_LIMITER", env.DCR_RATE_LIMITER],
    ["GEMINI_API_KEY", env.GEMINI_API_KEY],
    ["GEMINI_MODEL", env.GEMINI_MODEL],
    ["RELEASE_CANARY_SECRET", env.RELEASE_CANARY_SECRET],
    ["RUNNER_AUTH_SECRET", env.RUNNER_AUTH_SECRET],
  ];
  for (const [name, value] of required) {
    if (!value) {
      missing.push(name);
    }
  }
  if (missing.length === 0) {
    try {
      getPilotConfig(env);
      assertAccessConfiguration(env);
      if (
        (env.RUNNER_AUTH_SECRET as string).length < 32 ||
        (env.GEMINI_API_KEY as string).length < 16 ||
        (env.ACCESS_CLIENT_SECRET as string).length < 16 ||
        (env.RELEASE_CANARY_SECRET as string).length < 32 ||
        !/^[a-f0-9]{64}$/iu.test(
          env.TRANSFER_ACCESS_AUDIENCE as string,
        ) ||
        !/^[A-Za-z0-9._-]{2,100}$/u.test(env.GEMINI_MODEL as string)
      ) {
        throw new Error("invalid_pilot_configuration");
      }
    } catch {
      missing.push("INVALID_CONFIGURATION");
    }
  }

  const configured = missing.length === 0;
  const accepted =
    configured &&
    env.PILOT_ACCEPTANCE_VERSION ===
      REQUIRED_PILOT_ACCEPTANCE_VERSION;
  if (configured && !accepted) {
    missing.push("PILOT_ACCEPTANCE_VERSION");
  }
  return {
    enabled: true,
    configured,
    accepted,
    ready: accepted,
    missing,
  };
}
