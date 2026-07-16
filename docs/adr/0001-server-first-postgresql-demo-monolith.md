---
status: accepted
---

# Build the showcase as a server-first PostgreSQL monolith

The product is a persistent public portfolio demo with private credentials and synthetic data, optimized for fast AI-assisted delivery at zero monthly hosting cost rather than production uptime, recovery, or scale. Build one strict-TypeScript Next.js application on Vercel Hobby, backed by Neon PostgreSQL in the same Frankfurt region, because a single deployable application keeps delivery simple while PostgreSQL provides the authoritative transactions required by daily caps, Invoice Basis commitment, voiding, sequencing, and stale-write protection.

## Architecture

Use the Next.js App Router with server-rendered pages, focused Client Component islands, and Server Actions as the browser-to-server mutation seam. Organize server behavior into four deep domain modules—Access, Clients, Time, and Invoice Bases—whose operations own authorization and committed-state invariants; do not add a separate backend, public endpoint layer, generic repository layer, command bus, dependency-injection container, cache, queue, or speculative adapter interface.

Use Drizzle for schema, migrations, ordinary queries, and transactions, with explicit PostgreSQL SQL inside the persistence implementation when it expresses an invariant more safely. One deployment and database represent one Company Workspace; retain one singleton Company Workspace record, but do not propagate unused tenant keys. Run every domain mutation in a `SERIALIZABLE` transaction, use explicit versions for user-visible stale operations, and map serialization or version conflicts to a reload result without automatic retry.

Implement the narrow username/password model as a server-only authentication module using Node `scrypt`, opaque random session tokens stored only as hashes, and secure HTTP-only browser-session cookies. This avoids adding synthetic email, OAuth, JWT, invitation, or managed-identity concepts that conflict with the product model.

Use PostgreSQL `date` for work dates, `timestamptz` for instants, and Temporal with the fixed `Europe/Stockholm` zone. Store Time Entry history as purpose-built append-only before/after snapshots and Invoice Basis composition as normalized immutable rows.

## Delivery consequences

Use Node.js 24 LTS, pnpm, Tailwind CSS, focused Radix primitives, Zod at Server Action boundaries, Playwright against the real application and PostgreSQL, and Vitest only for pure calculations. Local verification uses Docker PostgreSQL; GitHub Actions checks changes, migrates Neon, deploys the exact commit through Vercel CLI, and smoke-tests the deployed sign-in page in that order. Production schema changes remain compatible with the currently deployed application.

Only current Chromium desktop is promised. Free-tier cold starts, quotas, limited provider logs, and limited recovery are accepted; no real personal or consulting data may be stored. A move to operational use, multiple Company Workspaces, broader browser support, or stronger availability and recovery requirements must revisit this decision.

## Rejected alternatives

Cloudflare D1 was rejected because its serverless SQLite transaction model would make the central concurrency invariants harder to express and prove. A separate frontend and backend, client-heavy data layer, broad clean-architecture tiers, email-centric authentication library, and mocked or SQLite test database were rejected because each adds an interface or semantic mismatch without helping this single-workspace showcase.
