# Consulting Time-Entry MVP

Status: ready-for-agent

## Problem Statement

A small Swedish consulting company needs one dependable place to record work against Clients and turn reviewed billable hours into an hours-only basis for external invoicing. Members need a fast desktop workflow that preserves the context of a whole week. Administrators need to manage access and Clients, inspect billable and non-billable work, prevent the same work from being handled twice, and correct mistakes without losing history.

Existing time products carry project, payroll, accounting, approval, and reporting concepts that this company does not need. Those concepts increase setup and daily-entry effort without improving the company's core flow. The product therefore needs a deliberately small model: Company Workspace → Client → Time Entry → Invoice Basis, with no formal approval workflow and no claim that it creates or tracks an external invoice.

## Solution

Provide an English-language desktop-web product for one Company Workspace. A deployment-provisioned first Administrator manages accounts and Clients. Members record complete Billable or Non-billable Time Entries in a Monday-to-Sunday weekly grid, directly against Clients, using Swedish-local date, time, timezone, and numeric conventions.

Administrators review Available Billable Time for one Client and inclusive date range, with non-billable context and outside-period backlog visible. Creating an Invoice Basis is the single atomic commitment point: selected Time Entries become Included Billable Time and cannot be included again. An Invoice Basis preserves its original composition and exact-minute totals as an auditable hours-only record. To correct Included Billable Time, an Administrator voids the complete Invoice Basis, returning all its Time Entries to Available Billable Time while preserving the voided record, reason, sequence number, and history.

The product stays intentionally narrow. It does not model projects, rates, money, invoices, payments, approvals, payroll, accounting integrations, or standalone reporting.

## User Stories

1. As a deployment operator, I want to provision the single Company Workspace and its first Administrator, so that the company can begin without public registration or an in-product bootstrap flow.
2. As an Administrator, I want first sign-in to open the normal Administration home, so that initial setup teaches the permanent product rather than a disposable wizard.
3. As an Administrator in a Company Workspace with no retained Clients, I want concise first-use guidance, so that I know an active Client is required before time can be recorded.
4. As an Administrator, I want Accounts and Clients to be equally prominent during first use, so that I can create either in the order that matches the company’s needs.
5. As an Administrator, I want my own Administrator account to include Member abilities, so that creating another account is optional before I record time.
6. As an Administrator, I want to create an account with a display name, workspace-unique username, and Member-or-Administrator role, so that colleagues receive the appropriate access.
7. As an Administrator, I want a generated initial password shown once after account creation, so that I can securely communicate the new credentials.
8. As an Administrator, I want dismissing the credential receipt to leave the account created, so that closing the receipt cannot accidentally undo setup.
9. As a person with an active account, I want to sign in with username and password, so that I can access the Company Workspace.
10. As a signed-in person, I want my session to end when I explicitly sign out or close the browser, so that session lifetime is understandable.
11. As a Member, I want to change my own password, so that I can maintain my access without administrative intervention.
12. As an Administrator, I want to reset another account to a newly generated password, so that a person who forgot their password can regain access.
13. As an Administrator, I want to change another account’s role, so that access can follow changing responsibilities.
14. As an Administrator who is the only active Administrator, I want the product to prevent my demotion or deactivation, so that the Company Workspace cannot lose all administrative access.
15. As an Administrator, I want to permanently deactivate a departing person’s account, so that sign-in and new Time Entries stop while historical attribution remains intact.
16. As an Administrator, I want a returning person to receive a new account and username, so that the former deactivated identity remains historically stable.
17. As a Member, I want access limited to active Clients, my profile, and my own Time Entries and history, so that other people’s and administrative data remain private.
18. As an Administrator, I want access to all accounts, Clients, Time Entries, histories, and Invoice Bases, so that I can operate and review the Company Workspace.
19. As an Administrator, I want to create the first active Client using the ordinary Client interaction, so that setup completes without a separate workflow.
20. As an Administrator, I want first-use guidance to disappear immediately after the first active Client is created, so that the normal Administration home reflects readiness.
21. As an Administrator, I want the workspace’s first-use state derived from retained Client records, so that no separate setup flag can become stale.
22. As an Administrator in a workspace with only archived Clients, I want Create and Restore actions rather than first-use language, so that I can recover normal operation accurately.
23. As a Member with no active Clients, I want an actionable My time empty state, so that I understand why the grid is unavailable and how an Administrator can resolve it.
24. As an Administrator, I want each Client to require only a display name, so that Client setup remains proportionate to time attribution.
25. As an Administrator, I want Client names trimmed and compared case-insensitively across active and archived Clients, so that visually duplicate Clients cannot be created.
26. As an Administrator, I want my chosen capitalization preserved, so that Client names display naturally.
27. As an Administrator, I want to rename a Client without changing its identity, so that historical Time Entries and Invoice Bases remain connected.
28. As a product reader, I want historical records to display a Client’s current name, so that a rename is reflected consistently throughout the product.
29. As an Administrator, I want to archive a Client at any time, so that it cannot receive new attribution while its history and Available Billable Time remain accessible.
30. As an Administrator, I want to restore an archived Client, so that Members can select it for new Time Entries again.
31. As an Administrator, I want to permanently delete a Client only before any Time Entry has referenced it, so that accidental setup records can be removed without destroying attribution.
32. As a Member, I want the current Monday-to-Sunday Swedish-local week to open by default, so that I can record time in the period I most commonly use.
33. As a Member, I want previous- and next-week navigation to retain the same grid structure, so that moving between weeks is predictable.
34. As a Member, I want to add an active Client as a persistent personal grid row, so that recurring Client work remains ready in later weeks.
35. As a Member, I want to remove an unused standing Client row without deleting Time Entries, so that I can simplify future weeks without concealing history.
36. As a Member, I want any Client with Time Entries in the displayed week to appear even if its standing row was removed or the Client was archived, so that recorded work never disappears from the grid.
37. As a Member, I want each Client/date cell to show the aggregate duration of its constituent Time Entries, so that I can scan the whole week quickly.
38. As a Member, I want cells with one classification to show a compact marker and mixed cells to show Billable and Non-billable subtotals, so that billing treatment remains visible at grid density.
39. As a Member, I want Client-week, daily, and whole-week summaries split into Billable, Non-billable, and Total duration, so that I can check my recorded week from multiple useful perspectives.
40. As a Member, I want to enter a duration directly into an empty cell, so that the fastest common action creates a complete descriptionless Billable Time Entry for that Client and date.
41. As a Member, I want direct duration input to accept clock notation such as `1:30` and Swedish decimal-hour notation such as `1,5`, so that I can use familiar input forms.
42. As a Member, I want duration input normalized only when it maps exactly to a positive whole-minute duration, so that stored time remains precise.
43. As a Member, I want spreadsheet-style Enter, Tab, Shift+Enter, and Shift+Tab movement after commit, so that repeated entry requires minimal pointer use.
44. As a pointer user, I want to select any empty or populated cell directly, so that keyboard fluency is not required.
45. As a Member, I want a populated cell to open an anchored popover listing its constituent Time Entries, so that aggregate cells never obscure the records they contain.
46. As a Member, I want to add another Time Entry from a populated cell, so that separate descriptions or classifications can coexist for one Client and date.
47. As a Member, I want each Time Entry to record one Client, one Swedish-local work date, positive whole-minute duration, optional description, and explicit Billable or Non-billable classification, so that every record is immediately reviewable.
48. As a Member, I want a description trimmed, stored as absent when empty, and limited to 500 Unicode characters, so that optional context remains clean and bounded.
49. As a Member, I want future-dated Time Entries treated as ordinary recorded work, so that legitimate future records do not require a separate planned state.
50. As a Member, I want exact duplicate Time Entries permitted, so that distinct work records are not rejected merely because their values match.
51. As a Member, I want the total of all my Time Entries on one work date capped at 1,440 minutes across Clients and classifications, so that impossible daily totals cannot be stored.
52. As a Member, I want invalid input to remain in context with a specific error and no persisted change, so that I can correct it without losing what I typed.
53. As a Member, I want to edit or delete any of my Time Entries that is not Included Billable Time, so that I can correct my own work.
54. As an Administrator, I want to edit or delete any unincluded Time Entry, including one owned by a deactivated account, so that historical mistakes remain correctable.
55. As a Member, I want an existing Time Entry to retain an archived Client during edits, so that archiving does not force false reassignment.
56. As a Member, I want reassignment to permit only active Clients, so that archived Clients receive no new attribution.
57. As a Member, I want each creation, edit, and deletion of my Time Entries retained with time, acting account, and before-and-after values, so that I can understand their history.
58. As an Administrator, I want to inspect every Time Entry’s history, so that changes across the Company Workspace remain accountable at the account level.
59. As an Administrator, I want deleted Time Entries excluded from current views, totals, daily-cap calculations, and Invoice Basis eligibility while retaining their identity and history, so that deletion corrects current state without erasing the record.
60. As an Administrator, I want to choose one active or archived Client and any inclusive Swedish-local date range for review, so that all stranded or future-dated Available Billable Time can still be handled.
61. As an Administrator, I want all qualifying Available Billable Time selected by default, so that the normal path minimizes accidental omission.
62. As an Administrator, I want non-billable Time Entries and totals shown separately during review, so that I can spot classification mistakes without including those entries.
63. As an Administrator, I want earlier Available Billable Time summarized with its oldest date and later Available Billable Time summarized including future dates, so that the selected period cannot hide backlog.
64. As an Administrator, I want to filter the visible review by one or more Members without changing selection, so that inspection does not silently alter Invoice Basis composition.
65. As an Administrator, I want a persistent selected count and duration across the full range, so that filtered views cannot obscure what will be included.
66. As an Administrator, I want to deselect individual Billable Time Entries, so that I can deliberately create a partial Invoice Basis.
67. As an Administrator, I want confirmation of excluded entry count and duration before creating a partial Invoice Basis, so that omission is explicit.
68. As an Administrator, I want Invoice Basis creation to require at least one selected Time Entry, so that empty records cannot be created.
69. As an Administrator, I want creating an Invoice Basis to atomically include all selected currently Available and unchanged Time Entries or none, so that concurrent work cannot produce partial or duplicate handling.
70. As an Administrator, I want each active Included Billable Time Entry linked to exactly one Invoice Basis and unavailable to every later selection, so that the same work cannot be handled twice.
71. As an Administrator, I want every Invoice Basis to receive a unique immutable human-readable Company Workspace sequence number, so that it can be referenced reliably outside the product.
72. As an Administrator, I want an Invoice Basis to preserve its Client identity, inclusive date range, creator, creation time, and original Time Entry composition, so that its historical meaning cannot silently change.
73. As an Administrator, I want the immutable composition to retain every included Time Entry’s identity, work date, Member attribution, description, classification, and duration, so that the basis can be traced to its source work.
74. As an Administrator, I want included entries grouped by Member and then work date with Member subtotals and a grand total, so that I can prepare external invoicing from a clear hours-only record.
75. As an Administrator, I want exact hours-and-minutes totals to remain authoritative, so that decimal display rounding cannot change recorded work.
76. As an Administrator, I want each subtotal and grand total to show independently derived decimal hours rounded half-up to two places with a Swedish decimal comma, so that external transcription is convenient and transparent.
77. As a Member, I want Included Billable Time locked against editing and deletion, so that an active Invoice Basis remains consistent with its source entries.
78. As an Administrator, I want correction of Included Billable Time to require voiding the entire Invoice Basis, so that no partial mutation can invalidate its original composition.
79. As an Administrator, I want void confirmation to warn that external correction is my responsibility and require a short reason, so that reversal is deliberate and documented.
80. As an Administrator, I want voiding to atomically mark the Invoice Basis voided and release all included entries back to Available Billable Time or do neither, so that handled state cannot split.
81. As an Administrator, I want a Voided Invoice Basis to preserve its sequence number, original composition, creator, creation time, voiding account, void time, and reason, so that the complete history remains visible.
82. As an Administrator, I want a voided sequence number never reused and a Voided Invoice Basis never voided again, so that lifecycle and references remain unambiguous.
83. As an Administrator, I want a corrected later Invoice Basis created through the ordinary selection flow, so that replacement does not require another lifecycle or special relationship.
84. As a product user, I want stale edits, deletions, Invoice Basis creation, and voiding to fail without overwriting newer committed state, so that concurrency never causes silent data loss.
85. As a product user, I want every Time Entry write to recheck the Member/date cap against committed state in the same transaction, so that concurrent writes cannot jointly exceed 1,440 minutes.
86. As an Administrator, I want operational review surfaces and Invoice Basis history instead of a standalone reporting area, so that the MVP answers immediate work questions without speculative analytics.

## Implementation Decisions

- Build a single desktop-web product for one Company Workspace. The interface is English; dates, week boundaries, timezone behavior, time display, decimal separators, and numeric formatting follow Swedish conventions.
- Provision the Company Workspace and first Administrator outside the product. Do not expose public registration, workspace creation, or an in-product bootstrap flow.
- Implement the product as four deep server-only domain modules: Access, Clients, Time, and Invoice Bases. Their small operation interfaces are the authoritative seams for authentication and account administration, Client lifecycle, weekly Time Entry work and retained history, Available Billable Time review, and Invoice Basis lifecycle. Server Actions adapt untrusted form input to these operations; authorization and committed-state invariants remain inside the mutation that enforces them.
- Authenticate permanent accounts by workspace-unique username and password. Generate initial and reset passwords. Do not force initial-password replacement. End the session on explicit sign-out or browser close.
- Support exactly Member and Administrator access. Administrator includes all Member capabilities. Members see active Clients needed for entry, their own profile, and their own Time Entries and history. Administrators see and administer all product records.
- Allow Administrators to create accounts, reset another account’s password, change roles, and permanently deactivate accounts. Prevent demotion or deactivation of the only active Administrator. Never reactivate a deactivated account; a returning person receives a new identity and username.
- Treat attribution as acting-account attribution only. Because an Administrator can possess or reset another account’s password, the product must not claim human-verifiable authorship.
- Model first use as derived normal product state. No retained Client means first-use guidance; at least one active Client completes setup; retained but all-archived Clients produce an operational no-active-Clients state. Do not persist a setup-completed flag.
- Model a Client as a stable identity plus required display name. Trim names, reject blank values, and enforce case-insensitive uniqueness across active and archived Clients while preserving display capitalization.
- Let Administrators create, rename, archive, and restore Clients. Renaming preserves identity and all current views use the current name. Archiving removes the Client from new-entry and reassignment choices but preserves historical records and Invoice Basis eligibility. Permanent deletion is allowed only before any Time Entry has ever referenced the Client.
- Model a Time Entry as a stable identity owned by one Member account, with one Client, one Swedish-local work date, positive whole-minute duration, optional trimmed description of at most 500 Unicode characters, and exactly one Billable or Non-billable classification.
- Permit any calendar date, including future dates, without a planned state. Permit exact duplicates as distinct identities. Enforce a transactional maximum of 1,440 total minutes per Member and work date across all Clients and classifications.
- Require an active Client for creation and reassignment. Permit an existing entry to retain a Client that was later archived.
- Make the weekly grid the primary Member interface. It always spans Monday through Sunday, defaults to the current Swedish-local week, supports adjacent-week navigation, and presents persistent Member-specific Client rows.
- Treat persistent Client rows as preferences, not Time Entries. Removing a row does not remove or hide recorded work. A Client row appears whenever the displayed week contains its Time Entries, even if the preference was removed or the Client was archived.
- Display cell aggregates and reveal constituent entries in an anchored popover. An empty cell’s direct-entry fast path creates one descriptionless Billable Time Entry. The popover supports adding, inspecting, editing, and deleting constituent entries subject to authorization and locks.
- Accept clock notation and Swedish decimal-hour notation for direct duration entry only when the value maps exactly to a positive whole-minute duration. Normalize display without sacrificing exact minutes.
- Implement spreadsheet keyboard movement: Enter moves down then to the next date’s first Client; Tab moves right for the same Client; Shift reverses each direction. Invalid input stays in context with a specific error and produces no persisted mutation.
- Show Client-week, date, and week totals split into Billable, Non-billable, and Total duration. Do not add copy-entry, copy-week, bulk-fill, or reusable-description behavior.
- Define Available Billable Time solely as Billable Time Entries not included in an Invoice Basis. Define Included Billable Time solely as entries in an active Invoice Basis. Do not add reviewed, approved, draft, finalized, period-closed, sent, invoiced, paid, or replacement states.
- Review exactly one Client and one inclusive Swedish-local date range at a time. Active and archived Clients are valid. Qualifying Available Billable Time starts selected. At least one entry is required for creation.
- Keep Member filtering independent of selection. Selection persists across filter changes, and the interface always shows selected count and duration across the complete range.
- Show selected and excluded Billable counts and durations, contextual Non-billable duration, earlier Available duration with oldest date, and later Available duration including future-dated entries. Confirm excluded count and duration before partial creation.
- Make Invoice Basis creation the only commitment point. Atomically verify every selected stable identity is still Available and unchanged, create the Invoice Basis, and mark all selected entries Included; otherwise commit nothing.
- Give every Invoice Basis a unique immutable human-readable sequence number within the Company Workspace. Never reuse a sequence number.
- Preserve an immutable composition snapshot containing the stable Client identity, date range, creator, creation time, and each included Time Entry’s identity, date, Member attribution, description, classification, and exact duration. The displayed Client name follows the Client’s current name rather than a snapshot.
- Present included entries grouped by Member and then work date, with exact-minute Member subtotals and a grand total. Display exact totals as hours and minutes. Also derive each subtotal and grand total independently as decimal hours rounded half-up to two places with a Swedish decimal comma.
- Permit a Member to edit or delete their own unincluded entries and an Administrator to edit or delete any unincluded entry. Do not impose age- or period-based locks. Included Billable Time is immutable while its Invoice Basis is active.
- Retain every Time Entry creation, edit, and deletion with timestamp, acting account, and before-and-after values. A deleted entry leaves current views, totals, cap calculations, and eligibility but retains identity and history.
- Correct Included Billable Time only by an Administrator voiding the entire active Invoice Basis. Require a short reason and warn that any correction outside the product remains the Administrator’s responsibility.
- Make voiding atomic. Preserve the sequence, original snapshot, creation attribution, voiding account, void time, and reason; release every included Time Entry to Available Billable Time or commit nothing. A Voided Invoice Basis cannot be voided again. A later basis uses the ordinary creation flow and has no explicit replacement relationship.
- Use optimistic concurrency for edits, deletions, Invoice Basis creation, and voiding. Require the version read by the acting session. Reject stale operations without partial effects or overwrite and direct the person to reload.
- Enforce all authorization, active-Client, daily-cap, availability, locking, and atomicity invariants against committed state in the same transaction as the mutation.
- Do not add a standalone reporting module. The weekly grid, Available Billable Time review, and per-Client Invoice Basis history are the complete MVP operational views.
- Follow [ADR 0001](../../docs/adr/0001-server-first-postgresql-demo-monolith.md): one strict-TypeScript Next.js monolith on Vercel Hobby, backed by one Neon PostgreSQL database colocated in Frankfurt. One deployment and database represent the single Company Workspace; a singleton Company Workspace record owns its identity and Invoice Basis sequence without unused tenant keys on every record.
- Use the App Router with server-rendered pages, focused Client Component islands, and Server Actions. Use Drizzle for schema, migrations, ordinary queries, and transactions, with explicit PostgreSQL SQL where it expresses an invariant more safely. Do not introduce a separate backend, public endpoint layer, generic repository layer, cache, queue, command bus, dependency-injection container, or speculative adapter interface.
- Run every domain mutation in a PostgreSQL `SERIALIZABLE` transaction. Use explicit record versions for user-visible stale operations, recheck authorization and committed state inside the transaction, and reject serialization or version conflicts without automatic retry or partial effects.
- Implement username/password authentication as a server-only module using Node `scrypt`, opaque random session tokens stored only as hashes, and secure HTTP-only browser-session cookies. A transactional TypeScript CLI provisions the singleton Company Workspace and first Administrator; no deployed bootstrap surface, synthetic email, OAuth, JWT, invitation, or managed identity provider is part of the product.
- Store work dates as PostgreSQL `date`, timestamps as `timestamptz`, and perform date arithmetic through Temporal with the fixed `Europe/Stockholm` zone. Store Time Entry history as purpose-built append-only before/after snapshots and Invoice Basis composition as normalized immutable rows.
- Use Tailwind CSS, native semantic controls, focused Radix primitives, and Zod validation at Server Action boundaries. Verify current Chromium desktop through Playwright against the real application and PostgreSQL, with Vitest limited to pure calculations.
- Treat the hosted deployment as a persistent public portfolio demo with private credentials and synthetic data. Free-tier cold starts, quotas, limited logs, and limited recovery are accepted; operational use or real company data requires revisiting the hosting decision.
- Exact visual styling remains an implementation freedom where it does not alter the selected interaction prototypes or observable product decisions.

## Testing Decisions

- Use one highest product seam for acceptance: drive the deployed desktop-web interface as Member and Administrator accounts and verify observable UI plus persisted state through later product views. This single seam covers the browser, domain behavior, authorization, persistence, and transaction guarantees without binding tests to internal modules or endpoint shapes.
- Prefer behavior tests over implementation tests. A good test starts from a meaningful Company Workspace state, performs an actor-visible action, and asserts visible or subsequently retrievable domain outcomes. It must not assert internal class structure, database tables, endpoint payload shape, private functions, CSS structure, or incidental text unless wording itself is a required warning or error.
- Organize acceptance coverage around five end-to-end journeys already established by the implementation-acceptance decision: establishing a usable Company Workspace; managing the Client lifecycle; recording and correcting a week; reviewing Available Billable Time and creating an Invoice Basis; and correcting handled time through voiding.
- Test account and first-use behavior through Administrator sign-in and Administration/My time views: provisioning precondition, generated credentials, role changes, only-Administrator protection, deactivation, access restrictions, derived first-use state, and recovery from no active Clients.
- Test Client lifecycle through the product interface: normalized uniqueness, stable rename, archive/restore behavior, historical visibility, availability for Invoice Basis review, and deletion only before first Time Entry reference.
- Test Time Entry behavior through the weekly grid and anchored popover: persistent rows, aggregate and constituent display, direct Billable fast path, alternate duration notation, descriptions, mixed classifications, summaries, keyboard traversal, archived-Client retention, and actor-specific correction rights.
- Include boundary examples at the product seam for zero/negative/non-minute durations, 500/501 Unicode-character descriptions, 1,440/1,441 daily minutes, future dates, duplicate entries, cross-Client daily totals, and invalid input preserving the attempted value without mutation.
- Test review and Invoice Basis behavior through an Administrator journey: active and archived Clients, inclusive range edges, all-selected default, Member filtering without selection changes, partial-selection warning, non-billable context, outside-period backlog, at-least-one selection, immutable snapshot fields, sequence uniqueness, grouping, and exact versus independently rounded decimal totals.
- Test locking and audit behavior by returning through normal views after creation, mutation, deletion, and voiding. Verify Included Billable Time cannot change; a Voided Invoice Basis remains visible with reason and attribution; all entries become Available together; sequence numbers are not reused; and later inclusion retains traceable Time Entry history without an explicit replacement relation.
- Exercise concurrency at the same product seam with two independent browser sessions. Cover stale edit/delete, two competing Invoice Basis creations, void competing with another transition, and concurrent Time Entry writes near the 1,440-minute cap. In every case, assert one committed outcome, a reload instruction for the stale actor, and no partial mutation.
- Verify authorization with distinct sessions rather than mocked roles: a Member cannot discover or mutate other Members, account administration, or Invoice Bases; an Administrator can inspect and correct within the decided locks.
- Use exact whole minutes as assertion inputs and expected values. Assert Swedish-local week/date behavior and decimal-comma, half-up two-decimal display at rounding boundaries; never infer correctness solely from formatted totals.
- Prior art is the selected cell-popover weekly-grid prototype, the selected normal-home first-use prototype, and the five-journey acceptance structure captured during discovery. The repository has no existing application or automated test suite, so these are interaction and journey precedents rather than code-level test conventions.
- Lower-level tests may be added for difficult calculations or transactional adapters, but they supplement rather than replace the one acceptance seam. Do not create additional public seams solely for testing.

## Out of Scope

- Projects, assignments, activities, service articles, registration codes, cost centres, or any intermediate dimension between Client and Time Entry.
- Internal time categories beyond Client-attributed Non-billable Time Entries.
- Attendance, absence, leave, payroll support, labor-law compliance, or employment records.
- Timers, running clocks, planned-work state, incomplete Time Entry drafts, or approval-ready marking.
- Hourly rates, prices, monetary calculations, write-downs, fixed fees, taxes, currencies, discounts, or profitability.
- Invoices, orders, payments, reminders, external invoice references, accounting records, or tracking whether an Invoice Basis was sent, invoiced, or paid.
- Exports, imports, public interfaces, and integrations with Fortnox or any other accounting, payroll, identity, or customer system.
- Formal review, approval, rejection, period closure, or chronological inclusion requirements.
- Saved review sessions, draft Invoice Bases, separate finalization, replacement links, or partial voiding.
- Standalone dashboards, cross-Client or cross-Member reports, utilization, trends, configurable reports, and saved reporting views.
- Copying a Time Entry, copying a prior week, multi-cell fill, reusable descriptions, and other speculative productivity aids.
- Public registration, self-service account creation, self-service forgotten-password recovery, invitations, email delivery, mandatory password rotation, and human-verifiable authorship.
- Multiple Company Workspaces, cross-company access, accounting-bureau workflows, or tenant administration.
- Native applications, mobile-optimized interfaces, and offline operation.
- Runtime localization, Swedish-language UI, and Fortnox feature, behavioral, or visual parity.
- Legal Client identity, contact details, billing addresses, external codes, or free-text Invoice Basis titles and notes.

## Further Notes

- Canonical domain terms are Company Workspace, Member, Administrator, Client, Time Entry, Available Billable Time, Included Billable Time, Invoice Basis, and Voided Invoice Basis. Avoid substituting tenant, organization, user, employee, customer, project, timesheet, approval, invoice, or cancellation where those terms imply different behavior.
- The product is Fortnox-inspired only at the Client → Time Entry → period review → Invoice Basis workflow level. Fortnox parity is neither required nor desired.
- The account model deliberately provides account-level attribution rather than proof of the human actor. Product wording, audit presentation, and external claims must preserve that limitation.
- Exact whole-minute values are authoritative everywhere. Decimal-hour values exist only as independently rounded display aids.
- The selected interaction direction is the dense weekly grid with anchored cell popovers. The selected first-use direction is the ordinary Administration home with equal Accounts and Clients panels.
- Every resolved discovery decision is represented: membership and access in stories 1–18; Client lifecycle in 19–31; Time Entry record and interaction in 32–59; review and Invoice Basis composition in 60–76; correction, locking, and audit in 77–85; reporting scope in 86 and the exclusions; Fortnox comparison in the narrowed solution and out-of-scope list; and the five-journey acceptance structure in Testing Decisions.
