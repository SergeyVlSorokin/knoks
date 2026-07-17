# 03 — Manage account access through departure

**What to build:** An Administrator can maintain another account's access as responsibilities change and permanently close access when a person departs, without losing historical identity or risking the Company Workspace's last administrative route.

**Blocked by:** 02 — Create Members and hand over credentials.

**Status:** completed

- [x] An Administrator can reset another active account to a newly generated password shown once.
- [x] An Administrator can change another active account between Member and Administrator roles.
- [x] The product rejects demotion or deactivation of the only active Administrator.
- [x] Deactivation is permanent and blocks sign-in and creation of new Time Entries while preserving historical attribution.
- [x] A deactivated identity cannot be reactivated; a returning person requires a new account and username.
- [x] Members cannot discover or invoke account-administration behavior.
- [x] Product wording presents audit attribution as acting-account attribution, not proof of the human actor.

## Implementation

- Commit: `cb4385a` (`Manage account access through departure`)
- Pull request: [#4](https://github.com/SergeyVlSorokin/knoks/pull/4)
- Acceptance seam: `tests/acceptance/account-access-through-departure.spec.ts`
- Access boundary: Deactivation revokes existing sessions, prevents future sign-in, and preserves the account record used for attribution. Future Time Entry creation must pass through the active-account session boundary.
- Verification: production workflow run [29580664864](https://github.com/SergeyVlSorokin/knoks/actions/runs/29580664864) passed typechecking, production build, and all 8 browser acceptance tests, including the production smoke test.
- Production: [https://knoks.vercel.app](https://knoks.vercel.app)
