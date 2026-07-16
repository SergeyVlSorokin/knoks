# 12 — Prove the five complete product journeys

**What to build:** The deployed desktop-web product is proven end to end through its single browser-level acceptance seam, giving the team executable evidence that the complete MVP works across roles, persisted state, Swedish conventions, concurrency, and lifecycle boundaries.

**Blocked by:** 03 — Manage account access through departure; 04 — Manage Clients and derived first-use state; 07 — Inspect and correct constituent Time Entries; 08 — Review Available Billable Time; 09 — Commit an Invoice Basis atomically; 10 — Inspect an immutable Invoice Basis; 11 — Correct Included Billable Time by voiding.

**Status:** ready-for-agent

- [ ] One deployed-product journey establishes a usable Company Workspace, including provisioning, sign-in, generated credentials, role changes, only-Administrator protection, deactivation, access restrictions, and derived first-use recovery.
- [ ] One journey covers Client uniqueness, stable rename, archive and restore, historical visibility, review eligibility, and deletion only before first Time Entry reference.
- [ ] One journey records and corrects a week through the grid and popover, covering standing rows, aggregates, alternate duration notation, descriptions, classifications, summaries, keyboard traversal, archived-Client retention, actor-specific rights, and specified input boundaries.
- [ ] One journey reviews Available Billable Time and creates an Invoice Basis, covering range edges, filtering-independent selection, partial confirmation, contextual time, backlog, immutable composition, sequence uniqueness, grouping, and exact versus rounded totals.
- [ ] One journey corrects handled time through complete voiding and proves preserved history, atomic release, non-reused sequence numbers, ordinary later inclusion, and no replacement relationship.
- [ ] Distinct Member and Administrator browser sessions prove authorization through observable product behavior rather than mocked roles.
- [ ] Two independent browser sessions prove stale edit and delete rejection, competing Invoice Basis creation, competing void transitions, and concurrent writes at the 1,440-minute daily cap with one committed outcome and no partial mutation.
- [ ] Assertions use exact whole minutes, Swedish-local dates and week boundaries, and decimal-comma half-up rounding boundaries; no assertion depends on private structure or endpoint shape.
- [ ] The product exposes no projects, rates, money, invoices, approvals, payroll, integrations, standalone reporting, public registration, multiple Company Workspaces, mobile-specific flow, or other excluded lifecycle states.
