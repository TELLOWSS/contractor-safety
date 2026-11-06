# Development tracking

User requirement: follow the original framing-contractor safety plan and show a clear checklist while implementing.

- Before choosing work, consult docs/progress.json and IMPLEMENTATION_CHECKLIST.md. Use the original F01–F16 IDs.
- Keep additional service cost at zero. Do not create paid resources or treat simulated local roles as real authentication.
- Update docs/progress.json with actual scope, evidence and remaining acceptance conditions after each milestone; run node scripts/progress.mjs to regenerate the Markdown and app page.
- Keep local cleared subfeatures distinct from full requirement completion and release gates. Do not infer total product completion from tests, HTTP 200 or deployment READY.
- Explain each milestone to the user with completed checks, remaining checks and the next priority.
- Current next priority: F02 obligation applicability records, followed by F03 organization/resources. Search/printing were implemented early; do not keep prioritizing cosmetic additions over these missing core functions.
- Preserve existing operational apps and databases. Back up the local DB before schema upgrades. Never commit .local-data or real personal records.

- For F08, attendance rosters, identity verification, signatures, education completion and omissions must not be required for TBM saving. Site management scope is optional and unknown when not provided; assess applicable legal obligations separately for each situation.

- Multiple prime contractors and site-specific rules/forms are core product requirements. Model contractor-site relationships and dated versions, retain subcontractor-owned records, distinguish unknown from confirmed, and never assume one contractor per site or automatic external submission. See docs/contractor-form-strategy.md.
