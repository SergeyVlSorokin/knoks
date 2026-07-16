# 13 — Establish continuous verification and deployment

**What to build:** Every proposed change is verified against the real desktop-web product and PostgreSQL before merge, and every successful `master` commit is migrated, deployed unchanged to the production Vercel project, and smoke-tested through GitHub Actions without exposing production credentials or modifying provisioned Company Workspace data.

**Blocked by:** 01 — Provision and enter the Company Workspace.

**Status:** ready-for-agent

- [ ] Pull requests and pushes to `master` run on Node.js 24 with the repository-pinned pnpm version and a frozen lockfile install.
- [ ] Continuous verification provides PostgreSQL 17, applies Drizzle migrations, installs current Playwright Chromium, runs strict TypeScript typechecking, builds the production application, and runs the complete browser-level acceptance suite.
- [ ] Verification uses disposable synthetic data and cannot access Neon, Vercel, or any production secret from pull-request jobs.
- [ ] A failed typecheck, migration, build, or acceptance test prevents production deployment.
- [ ] A successful `master` workflow checks out and deploys the exact verified commit rather than rebuilding or deploying another revision.
- [ ] Production deployment applies compatible Drizzle migrations to the Frankfurt Neon database before deploying that commit through Vercel CLI to the configured production project.
- [ ] Production deployments use a GitHub `production` environment and concurrency control so two migration-and-deployment sequences cannot overlap.
- [ ] Neon and Vercel credentials exist only as protected GitHub environment secrets; workflow output does not expose connection strings, tokens, passwords, or generated credentials.
- [ ] The deployed product is smoke-tested at its public `/sign-in` page after Vercel reports the production deployment ready, and a failed smoke test fails the workflow visibly.
- [ ] Deployment never provisions, replaces, resets, or deletes the Company Workspace, Administrator credentials, sessions, or product data.
- [ ] The one-time first-Administrator provisioning command remains an explicit deployment-operator action outside routine CI and deployment workflows.
- [ ] Workflow permissions are least-privilege, third-party Actions are pinned to immutable commit SHAs, and production deployment runs only for the canonical repository's protected `master` branch.
