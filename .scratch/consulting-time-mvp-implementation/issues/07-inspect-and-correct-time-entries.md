# 07 — Inspect and correct constituent Time Entries

**What to build:** A Member can open an aggregate cell, understand its constituent records, and make authorized corrections while the product preserves exact domain invariants and an accountable history.

**Blocked by:** 03 — Manage account access through departure; 06 — Record time through the grid fast path.

**Status:** complete

- [x] Selecting a populated cell opens an anchored popover listing every constituent Time Entry and supports adding another entry.
- [x] A complete Time Entry records one Member, Client, Swedish-local work date, positive whole-minute duration, optional trimmed description, and explicit Billable or Non-billable classification.
- [x] Empty descriptions are absent; 500 Unicode characters are accepted and 501 are rejected without mutation.
- [x] Creation and reassignment require an active Client, while an existing entry may retain its archived Client during other edits.
- [x] The transactional total across all of a Member's Clients and classifications is capped at 1,440 minutes per work date; 1,440 succeeds and 1,441 fails, including under concurrent writes.
- [x] A Member can edit or delete their own unincluded entries; an Administrator can edit or delete any unincluded entry, including one owned by a deactivated account.
- [x] Deleted entries disappear from current views, totals, daily-cap calculations, and Invoice Basis eligibility while retaining identity and history.
- [x] Every creation, edit, and deletion records time, acting account, and before-and-after values visible to the authorized Member and Administrators.
- [x] A stale edit or delete loses no newer committed state, makes no partial change, and directs the actor to reload.
