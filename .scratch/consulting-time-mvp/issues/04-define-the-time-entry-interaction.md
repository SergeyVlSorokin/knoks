# Define the time-entry interaction

Type: prototype
Status: resolved
Blocked by: [Define client records and lifecycle](02-define-client-records-and-lifecycle.md), [Define the time-entry record](03-define-the-time-entry-record.md)

Part of: [Specify a consulting time-entry MVP](../map.md)

## Question

Which desktop interaction should let a Member efficiently create, inspect, change, and remove their Time Entries while making dates, Clients, duration, description, and billability clear and preventing invalid input?

## Answer

The Member's primary surface is a single weekly grid with persistent Client rows on one axis and all seven Swedish-local dates, Monday through Sunday, on the other. The current week opens by default; previous and next controls navigate without changing the grid structure. Every row has a Client-week summary, every date has a daily summary, and the grid has a whole-week summary. Each summary separates Billable, Non-billable, and Total duration.

The compact display treatment is deliberate: date headers show Swedish-local month and day (`MM-DD`) beneath three-letter weekday names, while the week header shows the Swedish week number and full Monday-to-Sunday date range. Summary labels appear once in the leftmost totals column; daily and weekly values use right-aligned `H:MM` durations, with each Client's weekly total in a final `Week` column. All seven day columns use equal fixed widths so empty entry fields and populated aggregates do not change the grid geometry. Cell classification markers use compact `B` and `NB` notation, introduced by a single legend in the Client header.

Client rows are Member-specific standing choices rather than Time Entry records. A Member adds an active Client once and its row remains in subsequent weeks until manually removed. Removing a standing row does not delete or conceal Time Entries: any week containing Time Entries for that Client still shows the row. Archived Clients cannot be added or receive new entries, while their historical rows remain visible where used.

Each Client/date cell displays the aggregate duration of its Time Entries, not a replacement record. A cell containing only one billability classification shows a compact classification marker; a mixed cell shows its Billable and Non-billable subtotals. Selecting a populated cell opens an anchored popover beside it. The popover lists the constituent Time Entries and exposes each entry's duration, optional description, and classification; it also lets the Member add another entry or open one for editing or deletion, subject to the correction and locking rules decided in [Define correction, locking, and audit behavior](07-define-correction-locking-and-audit-behavior.md).

An empty cell is directly editable. Entering a duration there creates a complete, descriptionless Billable Time Entry for the row's Client and column's date; Billable is the deliberate fast-path default, not an unclassified state. The Member can immediately use the cell popover to add a description, change classification, or add another Time Entry. Direct duration input accepts clock notation such as `1:30` and Swedish decimal-hour notation such as `1,5`, normalizes the result to hours and whole minutes, and rejects values that cannot map exactly to a positive whole-minute duration.

Keyboard behavior follows a spreadsheet. Enter commits and moves down to the same date's next Client; after the last Client it moves to the next date's first Client. Tab commits and moves right to the next date for the same Client. Shift+Enter and Shift+Tab reverse those directions. Pointer users can select any empty or populated cell directly.

All validation from [Define the time-entry record](03-define-the-time-entry-record.md) applies before creation or update: active-Client requirements for new attribution, positive whole-minute duration, the 1,440-minute Member/date cap across all Clients and classifications, and the trimmed optional description limit. Invalid input remains in context with a specific error and does not create or change a Time Entry.

The selected interaction is Variant A, **Cell popover**, in the [throwaway weekly-grid prototype](../prototypes/time-entry-interaction/index.html). Run it with `node .scratch/consulting-time-mvp/prototypes/time-entry-interaction/serve.cjs` and open `http://localhost:4173/?variant=A`. The rejected day-focused and table-workbench concepts were replaced after feedback that the whole week, direct grid entry, and denser totals must stay visible together; Variants B and C retain the later drawer and expandable-row alternatives as comparison sources.
