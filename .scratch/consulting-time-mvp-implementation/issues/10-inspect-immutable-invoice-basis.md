# 10 — Inspect an immutable Invoice Basis

**What to build:** An Administrator can inspect an Invoice Basis as a durable hours-only record whose original composition remains traceable and whose exact and decimal displays cannot silently disagree about authoritative time.

**Blocked by:** 09 — Commit an Invoice Basis atomically.

**Status:** ready-for-agent

- [ ] The Invoice Basis preserves Client identity, inclusive date range, creator, creation time, sequence number, and original Time Entry composition.
- [ ] Every composition item preserves Time Entry identity, work date, Member attribution, description, classification, and exact whole-minute duration.
- [ ] The displayed Client name follows the Client's current name after a rename while the Client identity remains unchanged.
- [ ] Entries are grouped by Member and then work date with exact-minute Member subtotals and a grand total.
- [ ] Each subtotal and grand total displays authoritative hours-and-minutes plus an independently derived decimal-hour value rounded half-up to two places with a Swedish decimal comma.
- [ ] Invoice Basis history is available per Client without introducing external-invoice, sent, paid, approval, or reporting states.
- [ ] Included Billable Time cannot be edited or deleted by either its Member or an Administrator while the Invoice Basis is active.
