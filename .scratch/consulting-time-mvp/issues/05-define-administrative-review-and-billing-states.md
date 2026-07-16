# Define administrative review and billing states

Type: grilling
Status: resolved
Blocked by: [Define the time-entry record](03-define-the-time-entry-record.md)

Part of: [Specify a consulting time-entry MVP](../map.md)

## Question

Without a formal approval workflow, how does an Administrator distinguish unreviewed, reviewed, and already-handled billable time, move entries between those states, and avoid omission or duplicate external invoicing?

## Answer

There is no persisted Reviewed state and no approval-like transition. Billable Time Entries are either **Available Billable Time**, meaning they have not been included in an Invoice Basis, or **Included Billable Time**, meaning they belong to a specific Invoice Basis and are treated as handled for external invoicing. Inclusion in that basis is the only handled state; the product does not track whether work performed outside it has sent, invoiced, or paid the resulting basis.

Creating an Invoice Basis is the single commitment point. The Administrator's inspection and selection remain transient: there is no saved review session, draft Invoice Basis, or separate finalize action. Creation atomically includes every selected Available Time Entry by stable identity, or includes none if any selected entry is no longer eligible or is already included elsewhere. An Included Time Entry links to its Invoice Basis and cannot be selected for another one.

For a chosen Client and period, the review surface shows every qualifying Available Time Entry and selects all of them by default. An Administrator may deliberately deselect entries and create a partial basis, but the confirmation must state the excluded entry count and total duration. Excluded entries remain Available for a later Invoice Basis.

Non-billable Time Entries for the Client and period are shown separately as contextual records and totals so classification mistakes can be found. They are never Available or Included Billable Time, are not selectable for an Invoice Basis, and acquire no reviewed or handled state.

The review surface also exposes Available Billable Time outside the selected period: earlier available duration with its oldest work date, and later available duration including future-dated entries. This backlog is navigational information rather than a blocker; the workflow does not require chronological inclusion or close periods.

Permissions and account-level attribution follow [Define company membership and access](01-define-company-membership-and-access.md). Whether Included Time Entries may later be corrected or removed, what must be locked or retained, and how concurrent changes are handled remain for subsequent decisions.
