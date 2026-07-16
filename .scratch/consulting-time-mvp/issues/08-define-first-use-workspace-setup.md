# Define first-use workspace setup

Type: prototype
Status: resolved
Blocked by: [Define client records and lifecycle](02-define-client-records-and-lifecycle.md)

Part of: [Specify a consulting time-entry MVP](../map.md)

## Question

Which desktop first-use flow should guide the deployment-provisioned first Administrator through creating accounts and the first Client until the Company Workspace is ready for its first Time Entry, and when is setup considered complete?

## Answer

First use is a state of the normal product, not a separate wizard or persisted setup workflow. When the Company Workspace has no retained Client records, the provisioned first Administrator lands on the normal Administration home after sign-in. The page presents Accounts and Clients as equally prominent side-by-side management panels and adds concise first-use guidance explaining that an active Client is required before anyone can record a Time Entry.

Creating another account is optional because Administrator already includes all Member abilities. Account creation opens a dialog for display name, username, and role. After creation, that dialog becomes a one-time credential receipt showing the username and generated initial password with copy actions; dismissing the receipt does not roll back the already-created account.

Creating the first active Client is the sole setup-completion condition. The Clients panel accepts the Client's unique display name using the ordinary Client-creation interaction. Once creation succeeds, the first-use guidance disappears immediately and the Administration home remains the ordinary management surface; there is no success wizard, permanent readiness banner, or stored setup-completed flag.

My time remains navigable before an active Client exists. Instead of a usable weekly grid, it shows an actionable empty state explaining that time must belong to an active Client and links an Administrator to Client creation in Administration. If the workspace once had Clients but all are now archived, this becomes an operational no-active-Clients state with Create and Restore actions rather than returning to first-use language. Retained active or archived Client records therefore prove that first use has occurred. If the only Client is permanently deleted before any Time Entry ever referenced it, leaving no retained Client records, the workspace correctly returns to the first-use state.

Prototype asset: [First-use workspace setup variants](../prototypes/first-use-workspace-setup/index.html) (selected Variant C, then refined through the decisions above; run with `node ../prototypes/first-use-workspace-setup/serve.cjs` from this issue directory or `node serve.cjs` from the prototype directory).
