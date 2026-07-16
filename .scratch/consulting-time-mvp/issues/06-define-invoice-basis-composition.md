# Define invoice-basis composition

Type: grilling
Status: resolved
Blocked by: [Define client records and lifecycle](02-define-client-records-and-lifecycle.md), [Define administrative review and billing states](05-define-administrative-review-and-billing-states.md)

Part of: [Specify a consulting time-entry MVP](../map.md)

## Question

How is an Invoice Basis formed for a Client and period: which Time Entries qualify, how are hours grouped and detailed, which filters and totals are shown, and what makes the basis stable enough for manual invoicing outside the product?

## Answer

An Administrator forms an Invoice Basis for exactly one Client and any inclusive range of Swedish-local work dates. The Client may be active or archived: archiving prevents new Time Entries but must not strand Available Billable Time. Every Available Billable Time Entry for that Client whose work date falls in the range qualifies, including future-dated entries when the chosen range includes them.

All qualifying entries start selected. The review may filter visible entries by one or more Members, but filtering never changes selection; selections persist across filter changes, and a persistent summary reports the selected count and duration across the full range. The Administrator may deselect individual entries, as established in [Define administrative review and billing states](05-define-administrative-review-and-billing-states.md), but creation requires at least one selected entry.

The review shows selected billable count and duration; excluded billable count and duration; and non-billable duration separately. Non-billable entries remain contextual and can never become part of the Invoice Basis. Creation retains the existing atomic eligibility check: either every selected entry is still Available and all are included, or no basis is created.

Successful creation assigns the Invoice Basis a unique, immutable, human-readable sequence number within the Company Workspace. The basis also records its stable Client identity, inclusive date range, creator, creation time, and an immutable composition snapshot of every included Time Entry's stable identity, work date, Member attribution, description, billability, and duration. Later changes must not silently rewrite this original snapshot. Consistent with [Define client records and lifecycle](02-define-client-records-and-lifecycle.md), the displayed Client name follows the Client's current name rather than being snapshotted.

The created basis lists each included Time Entry, grouped first by Member and then by work date, with Member subtotals and one grand total. Exact whole-minute durations, displayed as hours and minutes, are authoritative. Member subtotals and the grand total additionally show decimal hours rounded half-up to two places using Swedish decimal-comma formatting; each decimal value is derived independently from its exact minute sum, so minor displayed rounding differences are acceptable.

The MVP adds no free-text title, note, or external invoice reference to an Invoice Basis.
