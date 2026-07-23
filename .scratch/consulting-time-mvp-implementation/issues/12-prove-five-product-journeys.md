# 12 — Prove the five complete product journeys

**What to build:** The deployed desktop-web product is proven end to end through its single browser-level acceptance seam, giving the team executable evidence that the complete MVP works across roles, persisted state, Swedish conventions, concurrency, and lifecycle boundaries.

**Blocked by:** 03 — Manage account access through departure; 04 — Manage Clients and derived first-use state; 07 — Inspect and correct constituent Time Entries; 08 — Review Available Billable Time; 09 — Commit an Invoice Basis atomically; 10 — Inspect an immutable Invoice Basis; 11 — Correct Included Billable Time by voiding.

**Status:** resolved

- [x] One deployed-product journey establishes a usable Company Workspace, including provisioning, sign-in, generated credentials, role changes, only-Administrator protection, deactivation, access restrictions, and derived first-use recovery.
- [x] One journey covers Client uniqueness, stable rename, archive and restore, historical visibility, review eligibility, and deletion only before first Time Entry reference.
- [x] One journey records and corrects a week through the grid and popover, covering standing rows, aggregates, alternate duration notation, descriptions, classifications, summaries, keyboard traversal, archived-Client retention, actor-specific rights, and specified input boundaries.
- [x] One journey reviews Available Billable Time and creates an Invoice Basis, covering range edges, filtering-independent selection, partial confirmation, contextual time, backlog, immutable composition, sequence uniqueness, grouping, and exact versus rounded totals.
- [x] One journey corrects handled time through complete voiding and proves preserved history, atomic release, non-reused sequence numbers, ordinary later inclusion, and no replacement relationship.
- [x] Distinct Member and Administrator browser sessions prove authorization through observable product behavior rather than mocked roles.
- [x] Two independent browser sessions prove stale edit and delete rejection, competing Invoice Basis creation, competing void transitions, and concurrent writes at the 1,440-minute daily cap with one committed outcome and no partial mutation.
- [x] Assertions use exact whole minutes, Swedish-local dates and week boundaries, and decimal-comma half-up rounding boundaries; no assertion depends on private structure or endpoint shape.
- [x] The product exposes no projects, rates, money, invoices, approvals, payroll, integrations, standalone reporting, public registration, multiple Company Workspaces, mobile-specific flow, or other excluded lifecycle states.
