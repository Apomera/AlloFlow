# Principal-managed educator evaluation share helper

This is AlloFlow's **middle path** between a private browser-only workspace and a district portal.
A principal deploys it in their own **district-managed Google account**. It files an exported
educator packet in that principal's Drive and grants one deliberately reviewed Drive permission.
It does not send the packet to AlloFlow.

| Path | Owner | Best fit | Important boundary |
| --- | --- | --- | --- |
| Private on-device workspace | Individual evaluator | Drafting, simulation, local exports | Browser storage is not a district repository |
| Principal share helper (this package) | One principal's district account | A small, principal-managed Drive handoff | No roster, assignments, or district-wide role model |
| District portal (`../educator_evaluation`) | District Google Workspace | Shared live records, central roles and assignments | Requires district ownership and administration |

## Before setup

- Obtain district approval for Apps Script, Drive sharing of personnel records, retention, and
  account handoff. Do not deploy this in a personal Google account.
- Decide where the district's official record lives. `AlloFlow Evaluations` is a working folder,
  not an automatic records-management system.
- Know the educator email domain you expect. The helper blocks a recipient outside that domain.
- Drive previews raw HTML as markup/code. The educator must **download the `.html` packet and open
  it in a browser** to see the formatted report and use its response form.

## Copy-and-deploy walkthrough

The AlloFlow Evaluation workspace includes copy buttons for the same three files in this package:
`Code.gs`, `Index.html`, and `appsscript.json`. Its resumable checklist and this guide use the same
seven stages:

1. **Confirm approval and account.** Obtain district approval, sign in to the intended
   district-managed Google account, and verify it again before creating anything.
2. **Create the private project.** Open [script.new](https://script.new/), create a standalone
   project, and name it `AlloFlow evaluation share helper`.
3. **Replace `Code.gs`.** Select all starter code, copy this package's `Code.gs`, paste, and save.
4. **Add the Index page.** Use **+ > HTML**, name the file exactly `Index`, and paste `Index.html`.
5. **Enable Drive API v3.** In **Project Settings**, show the `appsscript.json` manifest file and
   replace it with this package's manifest.
6. **Deploy privately and save the link.** Choose **Deploy > New deployment > Web app**. Set
   **Execute as: Me** and **Who has access: Only myself**. Review the visible account and scopes,
   authorize only under district policy, then save the resulting `/exec` URL in Evaluation Setup.
7. **Run the deployment check.** Open that exact saved URL and select **Run deployment check**.
   Sharing remains locked unless the helper shows the expected managed account and Drive API v3.

For updates, replace all three files, save, then use **Deploy > Manage deployments > Edit > New
version**. Re-run the deployment check.

## Safe packet workflow

1. In AlloFlow, open **Reports & audit** and export **Educator packet (.html)**.
2. Choose the downloaded file in this helper. It rejects arbitrary HTML and response files, then
   parses an allowlisted educator-packet payload. The helper rebuilds the filed HTML itself; it
   never stores the caller's markup, styles, or scripts. Packet fields fill the folder labels
   automatically.
3. Enter the exact educator email, choose Viewer (recommended) or Commenter, and optionally choose
   an end date. The expected domain is locked to the verified deployer account.
4. Retype the email, confirm the policy statement, and select **Review; do not share yet**.
5. Read the complete disclosure review. Editing any field invalidates it. Only **Confirm and share
   this packet** submits the immutable reviewed request.
6. A success message means Drive was re-read and the exact recipient, role, and expiration were
   proved. Google Drive is asked to notify the educator. Tell them to download the `.html` file and
   open it in a browser; Drive's preview shows markup instead of the formatted packet.
7. Use **Filed packets and live access status** to recheck current Drive permissions. If anything
   is wrong, use the row's **Revoke this live access** control. Success is shown only after a second
   Drive read proves that every matching permission is absent.

## Safety and technical boundaries

- **Every permission fails closed.** Drive API v3 creates the permission, and the helper reads it
  back to prove the reviewed recipient, role, and exact expiration. A mismatch, unavailable API,
  or metadata-write failure triggers permission removal and trashes the failed copy. If cleanup
  cannot be proved, the error shows the exact Drive file that requires manual recovery.
- **Workspace rules still apply.** Expiration is limited to supported viewer/commenter permissions
  and Workspace editions, generally no more than one year ahead. The first real expiring share is
  the final confirmation that the district edition accepts it.
- **The helper is deployer-only.** Its manifest uses `MYSELF` and `USER_DEPLOYING`. It does not know
  evaluator assignments or district roles; use the district portal when those controls are needed.
- **Drive may notify the recipient.** The helper requests Google's Drive share notification. It has
  no Gmail scope and does not compose an independent message.
- **Finalized annual rationale and evidence provenance stays server-validated and passive.**
  A provenance block is accepted only when both annualRationales and annualEvidenceRefs are present
  on a finalized cycle. The helper accepts only canonical record tokens, re-resolves them against
  this educator's published walkthroughs, published observation evidence, and locked SPM / SLOs,
  and creates human-readable labels itself. Pre-final, malformed, unresolved, private, or unlocked
  references are rejected before a Drive file is created.

- **Packet content is validated and rebuilt.** Both the browser and `Code.gs` require an AlloFlow
  educator packet, version 1, with exactly one matching educator. `Code.gs` allowlists its fields,
  escapes every narrative, and renders a new self-contained document with the fixed offline
  response script. This limits active content; it does not cryptographically prove who authored
  the underlying evaluation data. Free text can still identify people even when profile names
  were withheld, so preview the packet before sharing.
- **Custody remains with the district.** Move or copy the year folder into the official repository
  under the applicable retention schedule.
