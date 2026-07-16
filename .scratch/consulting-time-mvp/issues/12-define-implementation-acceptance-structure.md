# Define implementation acceptance structure

Type: grilling
Status: resolved
Blocked by: [Define MVP reporting scope](11-define-mvp-reporting-scope.md)

Part of: [Specify a consulting time-entry MVP](../map.md)

## Question

What final structure should turn the map's accumulated product and domain decisions into an implementation-ready acceptance contract, including the user journeys, observable outcomes, cross-cutting invariants, and explicit exclusions an implementation handoff must preserve?

## Answer

The implementation-ready acceptance contract will use this structure:

1. **Purpose, actors, and acceptance-reading rules** — define the contract's role, use the canonical Member, Administrator, Client, Time Entry, Available Billable Time, Included Billable Time, Invoice Basis, and Voided Invoice Basis vocabulary, and state that acceptance concerns observable product behavior rather than implementation design.
2. **Five end-to-end journeys with fine-grained numbered outcomes**:
   - An Administrator establishes a usable Company Workspace: first access, account management, first Client, and recovery from having no active Clients.
   - An Administrator manages the Client lifecycle: create, rename, archive, restore, and delete only before first use.
   - A Member records and corrects a week: persistent Client rows, Billable and Non-billable Time Entries, descriptions, summaries, validation, and keyboard flow.
   - An Administrator reviews Available Billable Time and creates an Invoice Basis: filtering, partial selection, snapshot contents, sequence, and atomic inclusion.
   - An Administrator corrects handled time: locking, voiding, restored availability, preserved audit history, and stale-concurrency failure.
3. **Cross-cutting domain invariants** — state reusable authorization, account attribution, Swedish-local date/time and numeric rules, exact-minute behavior, identity retention, atomicity, locking, and concurrency guarantees once.
4. **Product exclusions** — normatively preserve the map's out-of-scope capabilities.
5. **Implementation freedoms** — explicitly leave architecture, persistence, endpoint shape, deployment design beyond first-Administrator provisioning, and exact visual styling unconstrained unless a resolved product decision requires an observable behavior.
6. **Decision coverage table** — map every resolved decision ticket to at least one journey, invariant, or exclusion so omissions are reviewable.

Each journey contains independently implementable and testable numbered outcomes. An outcome states its preconditions, the user action, and the resulting visible or persisted state. Concrete examples are required only where dates, whole-minute durations, daily caps, Invoice Basis composition, locking, voiding, or concurrency need boundary precision. Exhaustive Given/When/Then wording and screen-level prescriptions are not required.

Each journey or invariant links the resolved decision tickets it operationalizes by name. Domain-specific validation and failure outcomes sit beside the action that triggers them; reusable rules remain solely in the invariant section to avoid contradictory duplication.
