# Consulting Time

This context describes how one small consulting company records client work and prepares reviewed time as a basis for external invoicing.

## Language

**Company Workspace**:
The single consulting company whose people, clients, time entries, and invoice bases are managed together.
_Avoid_: Tenant, organization, account

**Member**:
A person in the Company Workspace who records and manages their own time.
_Avoid_: Employee, user, consultant

**Administrator**:
A person in the Company Workspace who manages Members and Clients and can review all recorded time and invoice bases.
_Avoid_: Manager, approver, superuser

**Client**:
A uniquely named customer of the consulting company against which Members record billable or non-billable time. Renaming preserves the same Client identity; archiving removes it from new time entry while preserving historical use, and restoration makes it available again.
_Avoid_: Customer, assignment, project, account

**Time Entry**:
A record of a duration a Member worked for one Client on one Swedish-local work date, optionally describing the work, and classified as billable or non-billable.
_Avoid_: Timesheet, worklog, registration

**Available Billable Time**:
Billable Time Entries that have not yet been included in an Invoice Basis. Administrative inspection does not give them a separate reviewed or approved state.
_Avoid_: Unreviewed time, pending approval

**Included Billable Time**:
Billable Time Entries already included in an Invoice Basis and therefore treated as handled for external invoicing.
_Avoid_: Approved time, invoiced time

**Invoice Basis**:
An hours-only record of Included Billable Time for one Client and an inclusive range of Swedish-local work dates, used to prepare invoicing outside this product.
_Avoid_: Invoice, billing statement, invoice draft

**Voided Invoice Basis**:
An Invoice Basis an Administrator has reversed so its Billable Time Entries become Available again for correction or later inclusion. Its sequence number and original composition remain as immutable history.
_Avoid_: Deleted invoice basis, cancelled invoice, replacement invoice basis
