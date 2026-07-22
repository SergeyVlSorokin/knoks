# 11 — Correct Included Billable Time by voiding

**What to build:** An Administrator can deliberately reverse a complete active Invoice Basis, release its Included Billable Time for ordinary correction, and retain an unambiguous permanent record of what happened.

**Blocked by:** 10 — Inspect an immutable Invoice Basis.

**Status:** resolved

- [x] Voiding requires Administrator access, a warning that external correction remains the Administrator's responsibility, and a non-blank short reason.
- [x] One atomic operation marks the complete Invoice Basis voided and releases every included Time Entry to Available Billable Time, or changes nothing.
- [x] A Voided Invoice Basis preserves its immutable sequence and original composition, creator and creation time, voiding account, void time, and reason.
- [x] A voided sequence number is never reused and a Voided Invoice Basis cannot be voided again.
- [x] Released Time Entries can be corrected and later included through the ordinary review flow; no replacement relationship or special correction lifecycle is introduced.
- [x] Stale or competing void operations preserve the single committed outcome, make no partial change, and direct the stale Administrator to reload.
- [x] A void competing with another transition cannot split Invoice Basis state from the availability of its complete composition.
