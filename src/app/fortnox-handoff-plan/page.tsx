import type { Metadata } from "next";

import { FortnoxHandoffPlan } from "./fortnox-handoff-plan";

export const metadata: Metadata = {
  title: "Fortnox handoff plan",
  description: "A click-to-explore plan for Consulting Time handoffs to Fortnox.",
};

export default function FortnoxHandoffPlanPage() {
  return <FortnoxHandoffPlan />;
}
