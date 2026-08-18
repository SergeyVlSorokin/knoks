"use client";

import { useState } from "react";

type View = "overview" | "invoice" | "payroll" | "data" | "setup";

type FlowStepProps = {
  owner: string;
  ownerTone: "person" | "worker" | "fortnox";
  title: string;
  description: string;
  data: string;
};

const views: Array<{ id: View; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "invoice", label: "Invoice draft flow" },
  { id: "payroll", label: "Payroll flow" },
  { id: "data", label: "Information exchanged" },
  { id: "setup", label: "Setup & boundaries" },
];

function FlowStep({ owner, ownerTone, title, description, data }: FlowStepProps) {
  const ownerClasses = {
    person: "bg-emerald-50 text-emerald-800",
    worker: "bg-sky-50 text-sky-800",
    fortnox: "bg-amber-50 text-amber-800",
  }[ownerTone];

  return (
    <article className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[9rem_minmax(0,1fr)_16rem] lg:items-center lg:gap-5">
      <span className={`w-fit rounded-full px-3 py-1.5 text-center text-xs font-bold ${ownerClasses}`}>{owner}</span>
      <div>
        <h3 className="font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-700">{data}</p>
    </article>
  );
}

function CertaintyBadge({ kind }: { kind: "planned" | "established" }) {
  const label = kind === "planned" ? "Planned design" : "Established boundary";
  const classes = kind === "planned" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";

  return <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${classes}`}><span className="size-2 rounded-full bg-current" />{label}</span>;
}

export function FortnoxHandoffPlan() {
  const [view, setView] = useState<View>("overview");

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <header className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Planning artifact · Consulting Time → Fortnox</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">How time becomes an invoice draft or payroll transaction</h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">A click-to-explore explanation of the planned direct handoff. Consulting Time is where operational work is recorded; Fortnox remains authoritative for accepted financial records.</p>
          <div className="mt-5 flex flex-wrap gap-2"><CertaintyBadge kind="planned" /><CertaintyBadge kind="established" /></div>
        </header>

        <nav className="mt-9 flex gap-2 overflow-x-auto pb-2" aria-label="Artifact sections">
          {views.map((item) => (
            <button
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${view === item.id ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-800"}`}
              key={item.id}
              onClick={() => setView(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {view === "overview" && <section className="mt-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="overview-heading">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950" id="overview-heading">The planned division of responsibility</h2>
          <p className="mt-3 max-w-4xl leading-7 text-slate-700">Members and Administrators work in Consulting Time. A background handoff worker sends only eligible, mapped operational information to Fortnox. Once Fortnox accepts a handoff, Fortnox owns that financial record and all later financial corrections.</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <article className="rounded-xl bg-slate-950 p-5 text-white"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-200">1. Record operational work</p><p className="mt-3 text-sm leading-6 text-slate-200">Members create Time Entries for a Client. Payroll work is represented separately as Payroll Inputs.</p></article>
            <article className="rounded-xl border border-slate-200 p-5"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">2. Prepare a source batch</p><p className="mt-3 text-sm leading-6 text-slate-700">An Invoice Basis collects billable hours. A Payroll Period groups dated Payroll Inputs until its cutoff.</p></article>
            <article className="rounded-xl border border-slate-200 p-5"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">3. Hand off automatically</p><p className="mt-3 text-sm leading-6 text-slate-700">The worker validates mappings and sends an invoice draft or payroll transactions to Fortnox. A Handoff Receipt records the outcome.</p></article>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <button className="rounded-xl border border-slate-200 p-5 text-left shadow-sm hover:border-blue-300 hover:bg-blue-50" onClick={() => setView("invoice")} type="button"><h3 className="font-semibold text-slate-950">Invoice draft journey</h3><p className="mt-2 text-sm leading-6 text-slate-600">One Invoice Basis produces one Fortnox invoice draft with aggregated hours.</p><span className="mt-4 inline-block text-sm font-semibold text-blue-700">Explore the invoice flow →</span></button>
            <button className="rounded-xl border border-slate-200 p-5 text-left shadow-sm hover:border-blue-300 hover:bg-blue-50" onClick={() => setView("payroll")} type="button"><h3 className="font-semibold text-slate-950">Payroll journey</h3><p className="mt-2 text-sm leading-6 text-slate-600">One eligible Payroll Period produces the configured Fortnox salary and/or attendance transactions.</p><span className="mt-4 inline-block text-sm font-semibold text-blue-700">Explore the payroll flow →</span></button>
            <button className="rounded-xl border border-slate-200 p-5 text-left shadow-sm hover:border-blue-300 hover:bg-blue-50" onClick={() => setView("data")} type="button"><h3 className="font-semibold text-slate-950">Data and setup</h3><p className="mt-2 text-sm leading-6 text-slate-600">See exchanged information, mappings, and what is deliberately not synchronized.</p><span className="mt-4 inline-block text-sm font-semibold text-blue-700">Explore the data →</span></button>
          </div>
        </section>}

        {view === "invoice" && <section className="mt-2" aria-labelledby="invoice-heading">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-semibold tracking-tight text-slate-950" id="invoice-heading">Invoice draft flow</h2><p className="mt-2 text-slate-600">Illustrative example: Northwind AB receives an August consulting-services draft for 42.5 hours.</p></div><CertaintyBadge kind="planned" /></div>
          <div className="mt-6 grid gap-3">
            <FlowStep owner="Member" ownerTone="person" title="Record Time Entries" description="A Member records client-attributed daily work for Northwind AB. Each entry is local operational history, not a Fortnox invoice row." data="Client · work date · duration · billable classification · optional description" />
            <FlowStep owner="Administrator" ownerTone="person" title="Create an Invoice Basis" description="The basis includes billable time for a defined period. In this example, 1–31 August totals 42.5 hours." data="Client · inclusive period · immutable included Time Entries · resulting hours" />
            <FlowStep owner="Automatic worker" ownerTone="worker" title="Validate mappings and create receipt" description="Before any write, the worker requires a Client identity mapping and an Invoice Mapping. It creates a Handoff Receipt for this source revision." data="Fortnox customer identity · invoice-row policy: article, text, unit price, VAT, dimensions" />
            <FlowStep owner="Automatic worker" ownerTone="worker" title="Send one aggregate invoice basis" description="The planned business outcome is one Fortnox invoice draft. The invoice describes the period and 42.5 aggregated hours; detailed Time Entries stay in Consulting Time." data="Mapped customer + configured invoice row values + aggregate hours" />
            <FlowStep owner="Fortnox" ownerTone="fortnox" title="Own the accepted invoice draft" description="Fortnox validates and accepts the draft. Its later posting, payment, accounting, status, and correction lifecycle are not synchronized back." data="Remote correlation identifier is retained only in the Handoff Receipt" />
          </div>
          <p className="mt-5 rounded-xl border-l-4 border-amber-500 bg-amber-50 p-4 text-sm leading-6 text-amber-900">The exact Fortnox resource and required API fields are pending test-tenant validation. This is the agreed business-level handoff shape, not a JSON payload specification.</p>
        </section>}

        {view === "payroll" && <section className="mt-2" aria-labelledby="payroll-heading">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-semibold tracking-tight text-slate-950" id="payroll-heading">Payroll flow</h2><p className="mt-2 text-slate-600">Illustrative example: Alex&apos;s August Payroll Period includes ordinary hours, overtime, and leave as separately dated inputs.</p></div><CertaintyBadge kind="planned" /></div>
          <div className="mt-6 grid gap-3">
            <FlowStep owner="Member" ownerTone="person" title="Record operational work" description="Client work remains Time Entries. Payroll work is recorded separately, so leave or overtime does not need to pretend to be client time." data="Time Entries may be an optional source for a Payroll Input" />
            <FlowStep owner="Administrator / Member" ownerTone="person" title="Record dated Payroll Inputs" description="A Payroll Input is one Member&apos;s dated quantity and Payroll Category. Example: Alex, 19 August, 2.0 overtime hours." data="Member · effective date · decimal quantity · Payroll Category · optional note/source" />
            <FlowStep owner="Automatic worker" ownerTone="worker" title="Reach the Payroll Cutoff" description="The Company Workspace&apos;s cutoff makes a Payroll Period eligible. It is an operational trigger, not a review or manual-send state." data="Eligible Payroll Period and its valid Payroll Inputs" />
            <FlowStep owner="Automatic worker" ownerTone="worker" title="Apply payroll mappings and hand off" description="The worker maps Alex to an existing Fortnox employee and each Payroll Category to the configured transaction kind, code, unit, and policy values." data="Fortnox employee identity + configured salary/attendance values" />
            <FlowStep owner="Fortnox" ownerTone="fortnox" title="Own accepted payroll transactions" description="Fortnox validates and accepts the configured transactions. Later payroll validation, posting, balances, and corrections remain there." data="Handoff Receipt records outcome and remote correlation, not a financial mirror" />
          </div>
          <p className="mt-5 rounded-xl border-l-4 border-amber-500 bg-amber-50 p-4 text-sm leading-6 text-amber-900">The planned semantic granularity is dated Payroll Inputs within a Payroll Period. Tenant validation will establish the exact Fortnox transaction resource and employee/schedule prerequisites.</p>
        </section>}

        {view === "data" && <section className="mt-2" aria-labelledby="data-heading">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-semibold tracking-tight text-slate-950" id="data-heading">Information exchanged</h2><p className="mt-2 text-slate-600">Business-level information, not a final API payload field list.</p></div><CertaintyBadge kind="planned" /></div>
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-[850px] w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-600"><tr><th className="p-4">Journey</th><th className="p-4">Local operational source</th><th className="p-4">Mapping / policy added by Administrator</th><th className="p-4">Fortnox outcome</th></tr></thead><tbody className="divide-y divide-slate-200 text-slate-700"><tr><td className="p-4 align-top font-semibold text-slate-950">Invoice draft</td><td className="p-4 align-top">Invoice Basis: Client, date range, immutable included billable time, and aggregate hours.</td><td className="p-4 align-top">Client → existing Fortnox customer; invoice-row policy: article, text, unit price, VAT, dimensions.</td><td className="p-4 align-top">One Fortnox invoice draft. Detailed Time Entries remain in Consulting Time.</td></tr><tr><td className="p-4 align-top font-semibold text-slate-950">Payroll</td><td className="p-4 align-top">Payroll Period containing dated Payroll Inputs: Member, date, quantity, Payroll Category, optional note/source.</td><td className="p-4 align-top">Member → existing Fortnox employee; Payroll Category → transaction kind, code, unit, and required policy values.</td><td className="p-4 align-top">Configured salary and/or attendance transactions for the eligible batch.</td></tr><tr><td className="p-4 align-top font-semibold text-slate-950">Control state</td><td className="p-4 align-top">Source identity and revision.</td><td className="p-4 align-top">None.</td><td className="p-4 align-top">A provider-neutral Handoff Receipt records attempt, outcome, idempotency key, error metadata, and remote correlation identifier.</td></tr></tbody></table></div></div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2"><div className="rounded-xl border-l-4 border-orange-500 bg-orange-50 p-5"><h3 className="font-semibold text-orange-950">Not exchanged or synchronized</h3><p className="mt-2 text-sm leading-6 text-orange-950">Fortnox invoices, transaction statuses, balances, payments, accounting records, and later financial corrections are not copied into Consulting Time. No automatic master-data creation or matching occurs in either direction.</p></div><div className="rounded-xl border-l-4 border-blue-700 bg-white p-5 shadow-sm"><h3 className="font-semibold text-slate-950">Why mappings are separate</h3><p className="mt-2 text-sm leading-6 text-slate-700">A Time Entry or Payroll Input remains an operational record. Fortnox codes, prices, units, and identities are Company Workspace configuration, so they can be governed without writing financial data onto every source record.</p></div></div>
        </section>}

        {view === "setup" && <section className="mt-2" aria-labelledby="setup-heading">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-semibold tracking-tight text-slate-950" id="setup-heading">Setup, control, and limits</h2><p className="mt-2 text-slate-600">The normal flow begins only after these gates are satisfied.</p></div><CertaintyBadge kind="established" /></div>
          <div className="mt-6 grid gap-3"><details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" open><summary className="cursor-pointer font-semibold text-slate-950">Before any automatic handoff</summary><ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700"><li>Fortnox must authorize the required scopes: <code className="rounded bg-slate-100 px-1.5 py-0.5">invoice</code> for invoice drafts and <code className="rounded bg-slate-100 px-1.5 py-0.5">salary</code> for payroll.</li><li>The Company Workspace needs the applicable Fortnox product licences: Order or Kundfaktura for invoicing, and Lön for payroll. Direct third-party API access normally also requires Fortnox Integration.</li><li>An Administrator explicitly maps local Clients and Members to existing Fortnox customer and employee identities. The process never auto-matches or creates Fortnox master data.</li><li>An Administrator configures Invoice Mappings and Payroll Mappings before source data becomes eligible.</li></ul></details><details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer font-semibold text-slate-950">What happens when a handoff cannot proceed?</summary><p className="mt-4 text-sm leading-6 text-slate-700">The normal flow pauses. Missing mappings, invalid source data, entitlement, authorization, or policy failures result in an Administrator-visible blocked Handoff Receipt and no Fortnox write. Transient failures may be retried; uncertain outcomes are reconciled before retrying so the system does not knowingly duplicate a financial record.</p></details><details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer font-semibold text-slate-950">Where the system boundary is</summary><p className="mt-4 text-sm leading-6 text-slate-700">Consulting Time owns operational time, Payroll Inputs, source batches, mappings, and Handoff Receipts. Fortnox becomes authoritative only after it accepts the handoff. The two systems are not a two-way synchronization pair.</p></details><details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer font-semibold text-slate-950">What test-tenant validation still decides</summary><p className="mt-4 text-sm leading-6 text-slate-700">The business-level shape above is decided. A Fortnox test tenant must still confirm the exact Invoice and Lön API resources, required payload fields, employee/schedule prerequisites, configured codes, authorization, and tenant-specific validation behavior.</p></details></div>
        </section>}

        <footer className="mt-10 border-t border-slate-200 pt-6 text-sm leading-6 text-slate-600">Fictional examples only. This page explains the selected planned handoff; it is not a Fortnox API contract or a production integration screen.</footer>
      </div>
    </main>
  );
}
