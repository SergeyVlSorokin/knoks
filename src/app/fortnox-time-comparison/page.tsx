import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Consulting Time compared with Fortnox Tid",
  description: "An implemented-only comparison of Consulting Time and Fortnox Tid.",
};

type Comparison = {
  area: string;
  consultingTime: string;
  fortnoxTid: string;
  difference: string;
  sources: Array<{ label: string; href: string }>;
};

const comparisons: Comparison[] = [
  {
    area: "Record work",
    consultingTime: "Members record duration against a Client and Swedish-local work date in a five-day grid, with an optional description and a billable or non-billable classification.",
    fortnoxTid: "Fortnox Tid supports web and app time reporting. Its documented registrations include worked time, billable time, absences, material, and other expenses; the app accepts hours or start and end times.",
    difference: "Consulting Time is focused on duration-based client work. It does not provide app/mobile entry, timers, absence, material, or expense registration.",
    sources: [
      { label: "Fortnox Tid source", href: "https://www.fortnox.se/produkt/fortnox-tid" },
      { label: "Fortnox App registration source", href: "https://support.fortnox.se/produkthjalp/tid/registrera-tid-franvaro-och-ovrigt-i-fortnox-app" },
    ],
  },
  {
    area: "Allocate work",
    consultingTime: "Each Time Entry belongs to one Client. Administrators manage the Client list; archived Clients remain visible on historical entries but cannot receive new work.",
    fortnoxTid: "Fortnox Tid documents a project register where an administrator can limit the customers and services available for registration on each project. Its app also supports optional project and cost-centre selection.",
    difference: "Consulting Time has Clients, not projects, services, or cost centres. It has no documented equivalent to Fortnox reporting-responsibility restrictions.",
    sources: [
      { label: "Fortnox projects and setup source", href: "https://support.fortnox.se/produkthjalp/tid/kom-igang-med-fortnox-tid" },
      { label: "Fortnox Tid settings source", href: "https://support.fortnox.se/produkthjalp/tid/installningar-i-fortnox-tid" },
      { label: "Fortnox App registration source", href: "https://support.fortnox.se/produkthjalp/tid/registrera-tid-franvaro-och-ovrigt-i-fortnox-app" },
    ],
  },
  {
    area: "Review and finalise work",
    consultingTime: "There is no reviewed or approved Time Entry state. An Administrator can inspect Available Billable Time and include it in an Invoice Basis. Included Billable Time is locked until that basis is voided.",
    fortnoxTid: "Fortnox documents marking time complete through a chosen date, an attestation setting in Tid, and completion gating for transfers from Tid to Fortnox Lön.",
    difference: "Neither product is presented here as having a general entry-approval workflow: Fortnox’s official material reviewed for this page does not establish one. Consulting Time instead uses Invoice Basis inclusion and voiding to control billing corrections.",
    sources: [
      { label: "Fortnox Tid–Lön setup source", href: "https://support.fortnox.se/produkthjalp/tid/kom-igang-med-kopplingen-mellan-tid-och-lon" },
      { label: "Fortnox mobile completion source", href: "https://support.fortnox.se/produkthjalp/tid/registrera-tid-franvaro-och-ovrigt-i-fortnox-app" },
    ],
  },
  {
    area: "Prepare billing",
    consultingTime: "An Administrator creates an hours-only Invoice Basis for one Client and an inclusive Swedish-local date range. It is an external-invoicing hand-off, not an invoice; voiding restores its Time Entries to Available Billable Time.",
    fortnoxTid: "When combined with Fortnox Fakturering and/or Fortnox Offert & Order, Fortnox Tid can turn billable time into adjustable invoice or order bases. Its documented other registrations include material, mileage allowance, and expenses for invoicing.",
    difference: "Consulting Time deliberately stops at an hours-only Invoice Basis. It does not create invoices or orders, generate invoice templates, or include non-time billable items.",
    sources: [
      { label: "Fortnox Tid product source", href: "https://www.fortnox.se/produkt/fortnox-tid" },
      { label: "Fortnox billing setup source", href: "https://support.fortnox.se/produkthjalp/tid/kom-igang-med-fortnox-tid" },
      { label: "Fortnox invoice-base settings source", href: "https://support.fortnox.se/produkthjalp/tid/installningar-i-fortnox-tid" },
    ],
  },
  {
    area: "See and export operational data",
    consultingTime: "Members see weekly Client totals, and Administrators can inspect Invoice Basis history. The implemented product has no analytics dashboard or export flow.",
    fortnoxTid: "Fortnox describes a graphical overview with selectable statistics, including time distribution, contribution margin, utilisation rate, billable time, and value. Its onboarding material also documents CSV export.",
    difference: "Consulting Time provides workflow views, not reporting or exports. It has no documented equivalent to Fortnox’s statistics or CSV export.",
    sources: [
      { label: "Fortnox Tid overview source", href: "https://www.fortnox.se/produkt/fortnox-tid" },
      { label: "Fortnox statistics and CSV source", href: "https://support.fortnox.se/produkthjalp/tid/kom-igang-med-fortnox-tid" },
    ],
  },
];

function SourceLinks({ sources }: { sources: Comparison["sources"] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Official Fortnox sources">
      {sources.map((source) => (
        <li key={source.href}>
          <a
            className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            href={source.href}
            rel="noreferrer"
            target="_blank"
          >
            {source.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function FortnoxTimeComparisonPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-slate-200 pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Product scope review</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Consulting Time compared with Fortnox Tid</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
            A factual, current-state comparison of two approaches to time recording and the path to billing.
            It is a scope review, not a parity score or roadmap.
          </p>
        </header>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_2fr]" aria-label="Comparison scope">
          <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">Baseline</p>
            <p className="mt-3 text-2xl font-semibold">Implemented behavior only</p>
            <p className="mt-3 leading-6 text-slate-300">Consulting Time statements describe behavior present in this application. Omitted capabilities are not commitments or planned work.</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-900">Visibility and evidence</p>
            <p className="mt-3 text-xl font-semibold text-slate-950">This page is publicly accessible by URL.</p>
            <p className="mt-3 leading-6 text-slate-700">It is intended for internal product review, but it is not access-controlled. Fortnox statements link to official sources reviewed on 20 July 2026. Product availability, licences, and workflows can change.</p>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="comparison-heading">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Capability comparison</p>
            <h2 id="comparison-heading" className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Where the products overlap—and where they do not</h2>
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid border-b border-slate-200 bg-slate-100 px-6 py-4 text-sm font-semibold text-slate-700 lg:grid-cols-[minmax(10rem,0.7fr)_minmax(14rem,1.2fr)_minmax(14rem,1.2fr)_minmax(14rem,1.2fr)] lg:gap-6">
              <span>Area</span>
              <span className="mt-2 lg:mt-0">Consulting Time today</span>
              <span className="mt-2 lg:mt-0">Fortnox Tid</span>
              <span className="mt-2 lg:mt-0">Material difference</span>
            </div>
            <div className="divide-y divide-slate-200">
              {comparisons.map((comparison) => (
                <article className="grid gap-4 px-6 py-6 lg:grid-cols-[minmax(10rem,0.7fr)_minmax(14rem,1.2fr)_minmax(14rem,1.2fr)_minmax(14rem,1.2fr)] lg:gap-6" key={comparison.area}>
                  <h3 className="font-semibold text-slate-950">{comparison.area}</h3>
                  <div>
                    <p className="text-sm font-medium text-slate-500 lg:hidden">Consulting Time today</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700 lg:mt-0">{comparison.consultingTime}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 lg:hidden">Fortnox Tid</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700 lg:mt-0">{comparison.fortnoxTid}</p>
                    <div className="mt-3 text-sm"><SourceLinks sources={comparison.sources} /></div>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-sm font-medium text-blue-950 lg:hidden">Material difference</p>
                    <p className="mt-1 text-sm leading-6 text-blue-950 lg:mt-0">{comparison.difference}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <footer className="mt-8 max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-700 shadow-sm">
          <h2 className="font-semibold text-slate-950">Reading this comparison responsibly</h2>
          <p className="mt-2">Fortnox Tid is an add-on, and several documented flows depend on other Fortnox products or licences. This page does not compare pricing, package inclusion, GPS or hardware tracking, or claim that either product provides a general Time Entry approval workflow.</p>
          <p className="mt-2">For the complete source-limited evidence and conditions behind this page, see the repository research note at <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-900">docs/research/fortnox-time-recording.md</code>.</p>
        </footer>
      </div>
    </main>
  );
}
