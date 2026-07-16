# Define the time-entry record

Type: grilling
Status: resolved
Blocked by: [Compare Fortnox Time's core workflow](09-compare-fortnox-time-core-workflow.md)

Part of: [Specify a consulting time-entry MVP](../map.md)

## Question

What facts constitute a Time Entry, how is worked time represented and classified as billable or non-billable, and which invariants and validation rules make an entry valid for review?

## Answer

A Time Entry has a system-held stable identity and belongs to one Member account. It records one Client, one Swedish-local work date, a positive duration in whole minutes, an optional work description, and exactly one explicit classification of Billable or Non-billable. The classification applies to the entry's entire duration; there is no unclassified draft state or partially billable duration.

Any calendar date is valid, including a future date. A future-dated Time Entry has no separate planned state: it is ordinary recorded work and is eligible for later review under the same rules as any other entry.

For one Member and work date, the sum of all Time Entry durations must not exceed 1,440 minutes. This limit applies across Clients and both billability classifications. Exact duplicates are valid because each Time Entry has its own identity.

The optional description is trimmed of surrounding whitespace. An empty result is stored as absent; otherwise it may contain at most 500 Unicode characters.

New Time Entries and Client reassignments must reference an active Client. As already established by [Define client records and lifecycle](02-define-client-records-and-lifecycle.md), an existing Time Entry remains valid while retaining a Client that is later archived.

These complete records are immediately valid for review; the model has no separate incomplete or draft state. Creation/update attribution, edit and deletion permissions, locking, and retained history remain for [Define correction, locking, and audit behavior](07-define-correction-locking-and-audit-behavior.md).
