# 08 — Review Available Billable Time

**What to build:** An Administrator can review all relevant time for one Client and inclusive period without hidden omissions or accidental selection changes, whether the Client is active or archived.

**Blocked by:** 07 — Inspect and correct constituent Time Entries.

**Status:** complete

- [x] An Administrator can choose one active or archived Client and any inclusive Swedish-local date range.
- [x] Every qualifying Available Billable Time Entry in the range starts selected, and at least one selected entry is required before creation can proceed.
- [x] One or more Members can filter visible review rows without changing selection.
- [x] The review persistently shows selected count and duration across the complete range, regardless of the visible filter.
- [x] An Administrator can deselect individual Billable Time Entries and see excluded count and duration.
- [x] Non-billable entries and totals appear separately as context and cannot be selected for inclusion.
- [x] Earlier Available Billable Time is summarized with its oldest date; later Available Billable Time, including future dates, is summarized separately.
- [x] Members cannot discover the review or Invoice Basis surfaces.

## Comments

- 2026-07-20 — Decision from prototypes captured on `prototype/member-tree-review`: use the tree-lines layout. Members start collapsed; native tri-state Member checkboxes select or clear their nested entries; expanding shows indented record dates with connector lines that terminate at the final record's midpoint. The Member row retains selected duration and record count.
