# Specify a consulting time-entry MVP

Label: wayfinder:map

## Destination

An implementation-ready MVP product/domain specification for a desktop-web, English-language time-entry system for one small Swedish consulting firm. Members record billable or non-billable time directly against Clients; Administrators manage people and Clients and review period-based, hours-only Invoice Bases. No formal approval workflow.

## Notes

- Domain: consulting time entry and preparation of invoice bases.
- Consult the `grilling` and `domain-modeling` skills in every decision session; use `prototype` for interaction decisions.
- Product posture: Fortnox-inspired, not a parity target.
- Experience: desktop web only; English UI with Swedish date, time, timezone, and numeric conventions.
- Planning only: this map resolves product decisions and does not implement the application.
- Canonical vocabulary lives in [`CONTEXT.md`](../../CONTEXT.md).

## Decisions so far

- [Define company membership and access](issues/01-define-company-membership-and-access.md) — Deployment provisions the first Administrator; Administrators centrally create permanent username/password accounts with Member-or-Administrator access, retained deactivated identities, and account-level rather than human-verifiable attribution.
- [Compare Fortnox Time's core workflow](issues/09-compare-fortnox-time-core-workflow.md) — Retain the Client → Time Entry → period review → hours-only Invoice Basis spine; simplify billing treatment and exclude Fortnox's broader project, accounting, payroll, approval-like, and productivity layers.
- [Define client records and lifecycle](issues/02-define-client-records-and-lifecycle.md) — A Client is a uniquely named stable identity that Administrators can rename, archive, restore, or delete only before its first Time Entry, with archived Clients retained for history but unavailable for new attribution.
- [Define the time-entry record](issues/03-define-the-time-entry-record.md) — A Time Entry is a stable, review-ready Member/Client record with any Swedish-local date, positive whole-minute duration, optional bounded description, explicit whole-entry billability, and a 24-hour daily Member cap.
- [Define the time-entry interaction](issues/04-define-the-time-entry-interaction.md) — Members use a seven-day Client-by-date weekly grid with persistent Client rows, direct Billable duration entry, spreadsheet keyboard flow, cell popovers for constituent entries and descriptions, and Billable/Non-billable/Total summaries.
- [Define administrative review and billing states](issues/05-define-administrative-review-and-billing-states.md) — Billable Time Entries are Available until atomically included in one Invoice Basis; there is no reviewed, approval, draft, external-invoice, or period-closure state, while partial inclusion and visible backlog guard against omission.
- [Define invoice-basis composition](issues/06-define-invoice-basis-composition.md) — An Invoice Basis atomically snapshots selected Available Billable Time for one Client and inclusive date range under a workspace sequence, with entry detail, exact-minute Member subtotals, and a grand total.
- [Define correction, locking, and audit behavior](issues/07-define-correction-locking-and-audit-behavior.md) — Unincluded Time Entries remain correctable with full account-attributed history; Included Billable Time is locked until an Administrator atomically voids and preserves its Invoice Basis, while stale concurrent mutations fail without partial effects.
- [Define first-use workspace setup](issues/08-define-first-use-workspace-setup.md) — First use is the normal Admin home with equal Accounts and Clients panels; the first active Client alone completes setup, while zero-active-Client states remain actionable without a wizard or persisted setup flag.
- [Define additional time-entry productivity aids](issues/10-define-additional-time-entry-productivity-aids.md) — The existing weekly-grid fast path is sufficient for the MVP; copying, bulk fill, and reusable descriptions wait for evidence of a concrete repetitive workflow.
- [Define MVP reporting scope](issues/11-define-mvp-reporting-scope.md) — Add no standalone reporting surface; the weekly grid, Available Billable Time review, and per-Client Invoice Bases answer the MVP's operational questions.
- [Define implementation acceptance structure](issues/12-define-implementation-acceptance-structure.md) — Use five end-to-end journeys with independently numbered observable outcomes, shared cross-cutting invariants, named-source traceability, separate product exclusions and implementation freedoms, and a complete decision coverage table.

## Not yet specified


## Out of scope

- Assignments, projects, or activities between a Time Entry and its Client.
- Internal time, attendance, absence, payroll support, and Swedish labor-law compliance.
- Hourly rates, monetary calculations, fixed fees, taxes, invoices, payments, exports, and accounting-system integrations.
- Formal approval workflows; Administrators review time without approve/reject states.
- Native or mobile-optimized applications.
- Multiple Company Workspaces, cross-company access, and accounting-bureau workflows.
- Runtime localization and Swedish-language UI.
- Fortnox feature, behavior, or visual parity.
