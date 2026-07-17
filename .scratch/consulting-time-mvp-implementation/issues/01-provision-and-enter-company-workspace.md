# 01 — Provision and enter the Company Workspace

**What to build:** A deployment operator can provision the single Company Workspace and first Administrator. That Administrator can sign in to the normal desktop-web Administration home without registration or a bootstrap wizard, explicitly sign out, and rely on the session ending when the browser closes.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] A deployment-provisioned Company Workspace and first Administrator can sign in with a workspace-unique username and password.
- [x] First sign-in opens the ordinary Administration home; the product exposes no public registration, workspace creation, or bootstrap wizard.
- [x] The Administrator has both Administrator and Member abilities from the first session.
- [x] Explicit sign-out invalidates the session and returns to sign-in.
- [x] Closing the browser ends the session; reopening the product requires sign-in.
- [x] The runnable desktop-web product has a browser-level acceptance seam that later tickets can extend.

## Implementation

- Commit: `bd30c24` (`Implement ticket 01 workspace access`)
- Acceptance seam: `tests/acceptance/provision-and-enter-company-workspace.spec.ts`
- Verification: production workflow run [29580664864](https://github.com/SergeyVlSorokin/knoks/actions/runs/29580664864) passed typechecking, production build, and all 8 browser acceptance tests.
- Production: [https://knoks.vercel.app](https://knoks.vercel.app)
