# Google Classroom roster import

This feature is part of the AlloFlow source tree. The teacher roster panel opens the standalone `classroom-import.html` helper; `classroom_import_service.js` implements the read-only acquisition and codename-only export. The helper starts unconfigured. No live Google account, credential, or student record was used to develop or test this change. Deployment and a real-data pilot remain unverified.

## Teacher workflow

After an administrator approves and configures the deployment, a teacher explicitly connects their school account, selects an active class they teach, reads its complete roster, reviews names beside newly assigned codenames, confirms the assignments, and downloads a v4 AlloFlow roster. The separate preview remains private in the helper's memory. The downloaded JSON contains codenames, fresh random class/learner identifiers, and empty/default AlloFlow state. It contains no Google account/course/student IDs, names, emails, profiles, access tokens, or association table.

This is initialization for a new or empty AlloFlow class. The standalone helper cannot inspect an AlloFlow destination and cannot prove that the teacher later chooses an empty one. Its acknowledgement is a user workflow guard; the actual import destination must apply its own safeguards. Re-running the helper creates different class and learner IDs and is not synchronization. Do not use it to refresh an established class. AlloFlow's reviewed same-class update pathway requires existing stable learner IDs; this importer does not establish that persistent relationship.

Student accounts are not created or required. Classroom membership does not specify instructional support needs or AlloFlow groups, so all imported learners begin unassigned. The helper does not read grades, assignments, guardian records or Drive folders and does not write to Classroom. No School Store identity association or award is created.

## Public deployment configuration

`classroom_import_config.js` is public non-secret administrator configuration. Keep the shipped defaults empty/disabled until the deployment has been reviewed. The helper requires `enabled: true`, `reviewedDeployment: true`, a Google OAuth client ID and an exact approved origin in `allowedOrigins`. The OAuth client ID is public; never put a client secret, refresh token, bearer token, identity map, or student record in this file. The helper does not accept these settings through query strings, fragments, uploads, or token textboxes.

Google Identity Services is loaded only for a configured helper. Authorization starts from an explicit user gesture, and the returned token must grant both required scopes. The two requested scopes are `https://www.googleapis.com/auth/classroom.courses.readonly` and `https://www.googleapis.com/auth/classroom.rosters.readonly`. No email/photo scopes are needed for the implemented course, teacher, account-ID and student-name reads. [Classroom scopes](https://developers.google.com/workspace/classroom/guides/auth), [Google token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model).

An origin allowlist limits where this helper runs; it does not restrict the Google account's organization. An email suffix or Google account chooser hint is not proof of domain authorization. Use a district-controlled internal OAuth application and appropriate school third-party application restrictions. A separately approved `allowedAccountIds` list can constrain this service to exact Classroom user IDs verified by `/userProfiles/me`; it does not infer a district from an ID. Publicly publishing such an allowlist also exposes those teacher identifiers and needs review. The service never requests email access merely to guess domain membership.

Before enabling real access, confirm Google project/client ownership, authorized JavaScript origins, OAuth consent/publishing and applicable verification, district allowlisting, teacher access, where the helper is hosted, token expiry/revocation behavior, retention/printing policy for the name preview, and a new-class pilot with the real AlloFlow deployment. Configuration flags record a deployment decision; they do not themselves prove district approval. No persistent digital mapping or background sync is implemented. [Google authorization API reference](https://developers.google.com/identity/oauth2/web/reference/js-reference).

## Service API and trust boundary

The browser module registers `window.AlloModules.GoogleClassroomImport`; CommonJS tests can require the same source. It has no default fetch, default token, network activity at load time, or external package dependency.

```js
const service = window.AlloModules.GoogleClassroomImport;
const connector = service.createConnector({
  fetchImpl: window.fetch.bind(window),
  getAccessToken: ({ signal }) => trustedMemoryOnlyTokenProvider(signal),
  // Optional approved exact teacher IDs; never inferred from course/student fields.
  // allowedAccountIds: approvedTeacherIds,
});
const listing = await connector.listTeacherCourses({ signal });
// Explicit teacher choice from listing.courses, without putting IDs in page URLs.
const snapshot = await connector.readSelectedCourse({ courseId: selectedId, signal });
const prepared = service.convertSnapshot(snapshot, { destinationRoster: null });
// Render prepared.preview in the restricted teacher helper using textContent.
// Only after explicit teacher review and new-class acknowledgement:
// download prepared.json, NEVER JSON.stringify(prepared) or snapshot.
```

`listTeacherCourses` returns `{ status: 'complete', courses }`, where each course has `id`, `name`, `courseState`, and optional `section`. The service privately pins the account ID from the first completed listing. Changing accounts requires discarding the connector and starting a new reviewed session. Returned course objects do not control the internal selection allowlist.

`readSelectedCourse` accepts only an ID from that connector's completed listing. One memory-only bearer token is obtained for each operation and reused for the entire operation, so it cannot switch accounts mid-chain through token refresh. The service checks `/userProfiles/me` again, reads every teacher page and verifies the pinned teacher remains a member, then reads every student page. A failed operation invalidates old course selections. `cancel()` aborts active work, `dispose()` aborts and permanently closes the connector, and `getStatus()` returns only a fixed phase and redacted code. Calling a second operation during active work returns `BUSY`.

Only a complete operation returns a snapshot:

```js
{
  status: 'complete',
  selectedCourseId: 'private-source-course-id',
  expectedStudentCount: 2,
  consistency: 'PAGINATED_MEMBERSHIP_CAN_CHANGE',
  pages: [{
    status: 'success', courseId: 'private-source-course-id', requestPageToken: '',
    response: { students: [/* validated private source records */], nextPageToken: '' }
  }]
}
```

`expectedStudentCount` is this adapter's derived assertion after the successful terminal page. It is **not a Google response field** or an independent server count. Pagination completion means the service followed the entire returned token chain; Google does not provide an atomic membership snapshot through these list methods. Students and teachers can change during acquisition. Duplicate identities cause refusal, but changes that do not produce a detectable duplicate may still affect the resulting roster. The teacher must compare the completed preview with the intended class before exporting.

The snapshot and names are private inputs to the trusted helper, not a safe download or general app state object. `convertSnapshot` returns `{ roster, json, studentCount, preview }`; each preview row is `{ fullName, codename, learnerId }`. That preview is an identity association and must never be serialized into shared output, browser storage, telemetry, AI context, URLs, or ordinary AlloFlow roster state. Only `json` is the download payload. Missing names stay blank in the service preview; the actual helper visibly identifies those rows as unavailable and blocks download until the teacher resolves the identities in Classroom and reads the roster again. Identical or Unicode-equivalent names remain separate rows because source user IDs, not names, distinguish membership while held in memory.

The converter revalidates successful page status, course equality, exact token chain, terminal page, unique source user IDs, and count agreement. It requires `destinationRoster: null` or exactly `{ groups: {}, students: {} }`. Secure `crypto.randomUUID()` creates all identifiers; no names/emails/Google IDs are hashed into them. Random collision retries are bounded. The resulting identifiers are pseudonymous, not anonymous.

## Pinned Google API contract

Official documentation was checked September 8, 2026. Requests use only `GET` and the fixed HTTPS origin `https://classroom.googleapis.com`. Field masks deliberately exclude unneeded personal data. Unknown keys under these masks, unknown states, malformed values and identity mismatches fail closed instead of silently broadening acquisition.

| Method | Request restriction / selected fields | Response |
| --- | --- | --- |
| `/v1/userProfiles/me` | `fields=id` | Required `id`; verified against the pinned account and optional approved account list. |
| `/v1/courses` | `teacherId=me`, `courseStates=ACTIVE`, `courses(id,name,section,courseState),nextPageToken` | `courses` array may be omitted when empty. Includes classes the teacher owns or co-teaches; it does not list all administrator-visible courses. |
| `/v1/courses/{id}/teachers` | `teachers(courseId,userId),nextPageToken` | Validate every teacher's course ID and unique user ID; require the pinned account in the completed collection. |
| `/v1/courses/{id}/students` | `students(courseId,userId,profile(id,name(fullName,givenName,familyName))),nextPageToken` | Validate unique student IDs and course IDs; profile ID, when present, must equal the student ID. |

The returned `nextPageToken` is passed as the next request's `pageToken`; other list parameters remain identical. Omitted/empty terminal tokens end the chain. An omitted array is an empty page, including intermediate pages with a continuation token. Never infer completion from a page shorter than the requested size. [courses.list](https://developers.google.com/workspace/classroom/reference/rest/v1/courses/list), [teachers.list](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.teachers/list), [students.list](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.students/list).

Student records have `courseId`, `userId`, optional `profile`, and other Google fields excluded by the requested mask. User profiles expose `id` and name components with the roster scope; email and photo fields require their own scopes, which this helper does not request. [Student resource](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.students), [UserProfile resource](https://developers.google.com/workspace/classroom/reference/rest/v1/userProfiles), [userProfiles.get](https://developers.google.com/workspace/classroom/reference/rest/v1/userProfiles/get).

## Failure, limits and credential handling

Defaults are 30 seconds per entire operation (including token provider and body reads), 100 requested records per page, 50 pages per collection, 250 courses, 100 teachers, 500 students, 256 KiB per response and 2 MiB total response bytes per operation. Trusted test/deployment seams may lower limits; they cannot raise the hard defaults. Streams are counted while reading even without `Content-Length`. The JSON export is independently bounded below AlloFlow's 2 MiB import limit.

Every fetch explicitly uses `redirect: 'error'`, `credentials: 'omit'`, `cache: 'no-store'`, and `referrerPolicy: 'no-referrer'`. Returned redirects and changed response URLs are rejected. Bearer credentials appear only in the request `Authorization` header. Reflected credentials, including JSON-escaped values, are rejected before source strings can become pagination URLs or preview output. No user-supplied endpoint or generic proxy exists. Injected transport/token providers must themselves honor the no-logging and memory-only contract; tests use fictional implementations exclusively.

HTTP error response bodies are never read or surfaced. `401` maps to `AUTH_REQUIRED`, `403` to `ACCESS_DENIED`, `404` to `NOT_FOUND`, `429` to `RATE_LIMITED`, and server failures to `SERVICE_UNAVAILABLE`. Network errors, malformed data, repeated tokens, duplicates, count/page/byte limits, cancellation and timeouts expose fixed codes without source values or nested causes. There is no automatic partial-page retry or partial export. After a failure, re-list and restart acquisition after the teacher resolves access/rate conditions. A timeout/cancel race returns promptly even when an injected dependency ignores its abort signal.

Disposal drops service-held account/selection state; the helper must also clear its token, name preview, raw snapshot and download URL. Clearing JavaScript references is not a secure-erasure guarantee. Disconnecting local state and revoking the Google grant are different operations; deployment review must verify the helper's explicit revoke behavior.

## Verification

From the repository root, using existing dependencies:

```powershell
node node_modules/vitest/vitest.mjs run tests/classroom_import_service.test.js tests/classroom_import_app.test.js --maxWorkers=1
```

The service tests execute the actual shipped service with fabricated Google-format JSON, streaming responses and injected token/fetch functions. They cover account pinning/allowlisting, teachers and selected-course pagination, empty pages, denied/revoked access, later-page failures, 429 responses, duplicate/mismatched IDs, unknown data, response/count/page bounds, redirects, invalid UTF-8/JSON, cancellation/concurrency/timeouts, credential reflection/leakage, 500-learner conversion, empty-destination enforcement and private-preview/export separation. The UI tests execute the shipped HTML and app script in isolated DOM instances with fake Google authorization and connector/converter seams: disabled deployment, exact consent scopes, denial, confirmation/download separation, literal name rendering, unavailable names, duplicate/late callbacks, cancellation, expiry/revocation, and cleanup. On September 8, 2026 these suites passed 67 tests (38 service, 29 UI). Broader integration verification checks actual AlloFlow import compatibility and the browser helper with fictional API responses. These checks cannot certify live Google OAuth, school policy, production hosting, membership consistency, or the actual Gemini Canvas pilot.

See [Google connections across Classroom, School Store, and Educator Evaluation](google_workspace_connections.md) for the separate account, permission, hosting, and storage boundaries.
