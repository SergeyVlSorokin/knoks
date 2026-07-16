# Define correction, locking, and audit behavior

Type: grilling
Status: resolved
Blocked by: [Define administrative review and billing states](05-define-administrative-review-and-billing-states.md), [Define invoice-basis composition](06-define-invoice-basis-composition.md)

Part of: [Specify a consulting time-entry MVP](../map.md)

## Question

Who may edit or delete Time Entries before and after administrative review or external invoicing, when records or periods become locked, how mistakes are corrected, and what history must remain visible to preserve trust in an Invoice Basis?

## Answer

A Member may edit or delete any of their own Time Entries that is not currently included in an Invoice Basis. An Administrator may edit or delete any such Time Entry in the Company Workspace, including one owned by a deactivated account. Non-billable Time Entries are never included, so they remain correctable under the same ownership rules. There is no age-based or period-based lock.

Every Time Entry creation, edit, and deletion is retained as history with its time, acting account, and before-and-after values. A deletion removes the entry from current time-entry views, totals, daily-cap calculations, and Invoice Basis eligibility but retains its identity and history. Administrators can inspect history for every Time Entry; a Member can inspect history for their own. Attribution identifies the acting account only and does not claim which human used it, consistent with [Define company membership and access](01-define-company-membership-and-access.md).

An Included Billable Time Entry is locked: nobody may edit or delete it while its Invoice Basis is active. Correction requires an Administrator to void the entire Invoice Basis first. Any Administrator may void any active Invoice Basis because the product does not know whether it has been used for external invoicing. Confirmation must warn that any required correction outside the product remains the Administrator's responsibility and must require a short reason.

Voiding is atomic. The Invoice Basis becomes voided; its sequence number, original immutable composition snapshot, creator, creation time, voiding account, void time, and reason remain visible. Its sequence number is never reused. Every entry it included is released back to Available Billable Time, or none is released if the operation cannot complete. A voided basis cannot itself be voided again. A later Invoice Basis is created through the normal selection flow and has no explicit replacement relation; each Time Entry's history supplies the lineage from a voided basis to any later active basis.

Mutations use optimistic concurrency and enforce invariants against committed state. Each edit or deletion requires the version the session read; a stale operation fails without overwriting the newer state and asks the person to reload. Creating an Invoice Basis still succeeds only if all selected entries are currently Available and unchanged. Voiding competes atomically with any other basis or entry transition. Every Time Entry write rechecks the Member's 24-hour total for that Swedish-local work date in the same transaction, so concurrent writes cannot jointly exceed the cap. No multi-entry operation may partially commit.

This adds only active-versus-voided lifecycle to Invoice Bases. It does not add approval, period closure, sent, externally invoiced, paid, or replacement states.
