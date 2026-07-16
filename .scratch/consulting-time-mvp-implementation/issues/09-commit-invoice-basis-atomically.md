# 09 — Commit an Invoice Basis atomically

**What to build:** An Administrator can turn a deliberate selection of Available Billable Time into one uniquely referenced Invoice Basis, with creation acting as the sole all-or-nothing commitment point.

**Blocked by:** 08 — Review Available Billable Time.

**Status:** ready-for-agent

- [ ] Creating from a partial selection requires confirmation that states the excluded entry count and duration.
- [ ] Creation is rejected when no entry is selected.
- [ ] A successful creation receives a unique immutable human-readable Company Workspace sequence number and includes every selected entry exactly once.
- [ ] Each included entry becomes Included Billable Time linked to exactly one active Invoice Basis and is unavailable to every later selection.
- [ ] The operation verifies every selected stable identity is still Available and unchanged against committed state in the same transaction.
- [ ] If any selected entry is stale, changed, or unavailable, no Invoice Basis or partial inclusion is committed and the Administrator is directed to reload.
- [ ] Two competing sessions cannot include the same entry; one complete outcome commits and the other observes a stale conflict without partial effects.
