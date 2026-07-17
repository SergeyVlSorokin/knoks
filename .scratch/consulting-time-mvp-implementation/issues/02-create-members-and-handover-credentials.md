# 02 — Create Members and hand over credentials

**What to build:** An Administrator can create a permanent Member or Administrator account, securely hand over a generated initial password shown once, and leave the new person able to sign in and maintain their own password.

**Blocked by:** 01 — Provision and enter the Company Workspace.

**Status:** completed

- [x] An Administrator can create an account with a trimmed display name, workspace-unique username, and Member or Administrator role.
- [x] Account creation generates an initial password and displays it exactly once in a credential receipt.
- [x] Dismissing the credential receipt leaves the account created and never reveals the password again.
- [x] The new account can sign in with the generated password and can change its own password.
- [x] Member access is limited to active Clients needed for entry, the Member's profile, and that Member's own Time Entries and history.
- [x] An Administrator can access all account administration while retaining Member abilities.

## Implementation

- Commit: `e54c318` (`Implement member account credential handover`)
- Pull request: [#2](https://github.com/SergeyVlSorokin/knoks/pull/2)
- Acceptance seam: `tests/acceptance/create-members-and-handover-credentials.spec.ts`
- Access boundary: Members cannot navigate to or invoke Administration; Client and Time Entry capabilities remain the responsibility of their later tickets.
- Verification: production workflow run [29580664864](https://github.com/SergeyVlSorokin/knoks/actions/runs/29580664864) passed typechecking, production build, and all 8 browser acceptance tests.
- Production: [https://knoks.vercel.app](https://knoks.vercel.app)
