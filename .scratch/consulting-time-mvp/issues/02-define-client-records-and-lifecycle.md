# Define client records and lifecycle

Type: grilling
Status: resolved
Blocked by: [Compare Fortnox Time's core workflow](09-compare-fortnox-time-core-workflow.md)

Part of: [Specify a consulting time-entry MVP](../map.md)

## Question

Which facts identify a Client, how do Administrators create and maintain Clients, when can a Client be archived or restored, and how should lifecycle changes affect historical and new Time Entries?

## Answer

A Client contains one required display name and a system-held stable identity. No legal identity, contact, billing, or external-code fields belong to this MVP. For uniqueness comparison, the system trims surrounding whitespace and compares names case-insensitively across both active and archived Clients; it preserves the Administrator's capitalization for display. Blank or duplicate names are invalid.

Administrators may create and rename Clients. Renaming preserves the Client's identity, and historical Time Entries and Invoice Bases always display the Client's current name rather than a snapshot of an earlier name.

Administrators may archive a Client at any time and later restore it. Archiving preserves all historical Time Entries and Invoice Bases but removes the Client from choices for new Time Entries and from reassignment choices. An existing Time Entry that already references the archived Client may still be edited while retaining that Client, subject to the correction and locking rules decided elsewhere. Restoration makes the Client selectable again.

An Administrator may permanently delete a Client only while no Time Entry has ever referenced it. Once referenced, the Client must remain available for historical attribution and can only be archived.
