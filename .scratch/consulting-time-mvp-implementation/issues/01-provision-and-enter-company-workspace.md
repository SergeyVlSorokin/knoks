# 01 — Provision and enter the Company Workspace

**What to build:** A deployment operator can provision the single Company Workspace and first Administrator. That Administrator can sign in to the normal desktop-web Administration home without registration or a bootstrap wizard, explicitly sign out, and rely on the session ending when the browser closes.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A deployment-provisioned Company Workspace and first Administrator can sign in with a workspace-unique username and password.
- [ ] First sign-in opens the ordinary Administration home; the product exposes no public registration, workspace creation, or bootstrap wizard.
- [ ] The Administrator has both Administrator and Member abilities from the first session.
- [ ] Explicit sign-out invalidates the session and returns to sign-in.
- [ ] Closing the browser ends the session; reopening the product requires sign-in.
- [ ] The runnable desktop-web product has a browser-level acceptance seam that later tickets can extend.
