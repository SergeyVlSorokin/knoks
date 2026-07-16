# Define company membership and access

Type: grilling
Status: resolved

Part of: [Specify a consulting time-entry MVP](../map.md)

## Question

How do people enter and leave the Company Workspace, authenticate, become Members or Administrators, change roles, and recover access; and what data may each role view or change throughout those transitions?

## Answer

The deployment operator provisions the single Company Workspace and its first Administrator; there is no public workspace registration or in-product bootstrap. Thereafter, any Administrator can create another account by supplying a display name, a workspace-unique username, and either the Member or Administrator role. The system generates an initial password, shows it to the creating Administrator, and does not require the person to replace it.

A person signs in with username and password. They may change only their own password. If they forget it, an Administrator resets it to another generated password and communicates it to them. A sign-in session lasts until explicit sign-out or the browser closes.

Administrator includes all Member abilities. A Member can see active Clients required for time entry, their own profile, and their own Time Entries; they cannot see other people, other people's Time Entries, Invoice Bases, or administration data. An Administrator can see all account, Client, Time Entry, and Invoice Basis data and can administer accounts. The separate correction decision determines when an Administrator may alter another person's Time Entries.

Any Administrator can create accounts, reset another person's password, and change roles. The only active Administrator cannot be demoted or deactivated. A departing person's account is permanently deactivated: sign-in and new entries stop, while the identity and historical Time Entries remain visible. A returning person receives a new account and username rather than reactivating the old identity.

This model deliberately accepts that an Administrator may retain or reset a Member's permanent password and impersonate that Member. Consequently, the product can attribute activity to an account but cannot prove which human acted through that account; later audit decisions must not claim stronger attribution.
