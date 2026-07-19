# 06 — Record time through the grid fast path

**What to build:** A Member can record the common case directly in the weekly grid with exact-minute semantics, immediately understand the resulting aggregates, and continue keyboard entry without leaving the grid.

**Blocked by:** 05 — Navigate a persistent weekly Client grid.

**Status:** complete

- [x] Direct duration entry in an empty Client/date cell creates one descriptionless Billable Time Entry for that Client and Swedish-local date.
- [x] Clock notation such as `1:30` and Swedish decimal-hour notation such as `1,5` are accepted only when they map exactly to a positive whole-minute duration.
- [x] Zero, negative, malformed, and non-whole-minute values produce a specific in-context error, preserve the attempted input, and persist no mutation.
- [x] Each cell displays aggregate duration plus a compact single-classification marker or separate Billable and Non-billable subtotals when mixed.
- [x] Client-week, date, and whole-week summaries show Billable, Non-billable, and Total exact durations.
- [x] Enter, Tab, Shift+Enter, and Shift+Tab commit valid input and move according to the specified spreadsheet traversal; pointer selection works for every cell.
- [x] Future dates and exact duplicate Time Entries are accepted as ordinary distinct records.
