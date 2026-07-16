# Compare Fortnox Time's core workflow

Type: research
Status: resolved

Part of: [Specify a consulting time-entry MVP](../map.md)

## Question

How does the current Fortnox Time product handle Client setup, time registration, billable-time review, and invoice bases according to authoritative public sources, and which concepts should this deliberately smaller MVP retain, simplify, or exclude?

## Answer

Fortnox Time's transferable workflow is **Client setup → Time Entry → period-scoped review → Invoice Basis**. Retain reusable Clients, dated hours with explicit billing treatment, Administrator drill-down to source Time Entries, explicit inclusion in an Invoice Basis, protection from silent double inclusion, and traceability back to the source entries.

Simplify Time Entries to one hours quantity classified as billable or non-billable unless a later domain decision establishes a need for partial write-downs. Keep review informal and make the Invoice Basis the hours-only endpoint.

Exclude Fortnox's projects, service articles, registration codes, cost centres, absence and payroll behavior, rates and monetary calculations, ready marking, timers, mobile workflow, invoices/orders, accounting integrations, and invoice-transfer statuses. Fortnox's public documentation does not settle this MVP's Client lifecycle, exact Time Entry validation, period and concurrency rules, correction locks, or Invoice Basis lifecycle; the existing decision tickets remain responsible for those choices.

Research asset: [Fortnox Time core workflow: evidence and MVP recommendation](../research/fortnox-time-core-workflow.md)
