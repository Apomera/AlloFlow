# AlloFlow's Google connections: shared platform, separate authority

School Store and Educator Evaluation use the same district-owned Google Apps Script deployment pattern. The Classroom importer uses a different Google authorization mechanism. They can share a familiar managed-account experience without sharing every permission, token or database.

Voice-award follow-up: [dedicated on-device Store dictation](school_store_voice_awards.md) now fills an editable recognition draft, followed by the existing explicit review and final award confirmation. Browser microphone/local-speech permission is a fourth, separate permission boundary. It does not add Google OAuth scopes or connect Store records to Classroom or Educator Evaluation. Ordinary Allobot microphone settings are not the Store's local-only speech gate.

| Pathway | Authorization | Purpose and records |
| --- | --- | --- |
| Classroom import helper | Teacher grants the approved OAuth client course/roster read access; district app-access policy also applies | Read classes and a selected roster. Names and temporary token stay in tab memory. Download a codename-only roster for a new AlloFlow class. No helper database. |
| School Store district portal | District owner authorizes the Apps Script service; domain access and server-owned role membership restrict visitors | Award/spend points and manage approved store/printing workflows. Official records live in the school's protected Sheets/Drive repository. |
| Educator Evaluation district portal | District owner authorizes its separate Apps Script service; membership and educator/evaluator assignments restrict access | Authorized personnel evaluation workflows in their own protected district repository. |

The last two rows refer to managed portals, not local practice or preview modes.

## Three separate questions

1. Identity: Which managed Google account is present?
2. Google API permission: Has this application been authorized to read Classroom or use the owner's repository resources?
3. AlloFlow permission: Is this account allowed to award points, administer this store, or evaluate this educator?

Answering one does not answer the other two. A Classroom token must not become a Store admin credential. Importing a class must not grant personnel-record access. Signing into Gemini does not authorize the separate Classroom helper.

## Current product configuration

- classroom_import_config.js contains public OAuth client/deployment settings, disabled by default. A client ID is public; no client secret belongs here.
- classroom_import_service.js requests only course/roster read scopes. It pins the account within the session and checks selected-course teacher membership.
- apps_script/school_rewards/appsscript.json declares domain-only access and deploying-user execution, with email identity, Sheets, Drive, mail and trigger-management scopes. Server roles limit visitors.
- apps_script/educator_evaluation/appsscript.json independently declares domain-only, deploying-user execution with identity, Sheets, Drive and mail scopes. Personnel access remains separate.
- The AlloFlow Store panel keeps setup/launcher information locally, not the official points ledger.

The Apps Script owner's powerful tokens must remain server-side, never distributed to visitors.

## What we can reuse

Managed Google accounts, deployment ownership conventions, review checklists, update processes and the AlloFlow launcher can be shared. A future connections screen could show each connection's configured state, purpose and outstanding review.

Do not collapse everything into one all-purpose consent request just to save a click. This pass does not change either district portal's OAuth scopes or deployment permissions.

## What is not automatically connected

Classroom membership does not establish a Store student identity or an evaluator role. The importer generates new AlloFlow identities and discards the raw Google-ID mapping. Re-running it is not ongoing synchronization.

AlloFlow now includes a default-off [reviewed class-link workflow](school_store_class_links.md). A teacher exports existing stable lesson IDs and codenames; a Store administrator manually matches them to existing Store students, reviews staff grants and confirms the binding. Authorized staff can then resolve a linked codename inside the Store and review the recipient before filling the existing award form. This is not automatic Classroom synchronization or an OAuth permission bridge. No first-name-only matching, automatic role grants, student-history resets or automatic awards.

## Deployment checks

The [typed recognition follow-up](school_store_typed_recognition.md) adds a local Allobot Store-launch boundary and reviewed typed requests inside the signed-in Store. No new OAuth scopes, tokens, cross-origin student-data transfer or automatic awards are involved. Teachers re-enter the request in the Store and confirm the canonical recipient before awarding.

For Classroom, review the OAuth client, publishing/audience choice, exact JavaScript origins, minimal scopes and district app-access settings. Configuration flags record an operator decision; they do not replace Google-side restrictions.

For each Apps Script portal, review source/manifest, durable owner, domain-only access, server membership/assignments, private storage, retention, recovery and operational ownership. Test in the actual school tenant before official use.

Mocked tests verify application behavior, not the live district's identity availability, Google policies, consent screens or approval.

## Primary references

- [Google Identity Services token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [Apps Script web-app execution and authorization](https://developers.google.com/apps-script/guides/web)
- [Apps Script manifest access settings](https://developers.google.com/apps-script/manifest/web-app-api-executable)
- [Workspace app access control](https://support.google.com/a/answer/7281227)
