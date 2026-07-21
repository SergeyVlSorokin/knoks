# 10 — Inspect an immutable Invoice Basis

**What to build:** An Administrator can inspect an Invoice Basis as a durable hours-only record whose original composition remains traceable and whose exact and decimal displays cannot silently disagree about authoritative time.

**Blocked by:** 09 — Commit an Invoice Basis atomically.

**Status:** complete

- [x] The Invoice Basis preserves Client identity, inclusive date range, creator, creation time, sequence number, and original Time Entry composition.
- [x] Every composition item preserves Time Entry identity, work date, Member attribution, description, classification, and exact whole-minute duration.
- [x] The displayed Client name follows the Client's current name after a rename while the Client identity remains unchanged.
- [x] Entries are grouped by Member and then work date with exact-minute Member subtotals and a grand total.
- [x] Each subtotal and grand total displays authoritative hours-and-minutes plus an independently derived decimal-hour value rounded half-up to two places with a Swedish decimal comma.
- [x] Invoice Basis history is available per Client without introducing external-invoice, sent, paid, approval, or reporting states.
- [x] Included Billable Time cannot be edited or deleted by either its Member or an Administrator while the Invoice Basis is active.
- [x] (Extra) An always-visible dashboard shows recent Invoice Bases across all clients when first landing on the page.
- [x] (Extra) A dedicated Client Filter on the history list allows looking up history for a specific client without starting a review.
- [x] (Extra) Pagination controls allow traversing history when there are many Invoice Bases.
- [x] (Extra) Layout consistency is maintained by always displaying the Client column in both global and filtered views.
