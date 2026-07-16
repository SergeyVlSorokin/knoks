import { redirect } from "next/navigation";

import { currentSessionAccount } from "@/server/access/session-cookie";

export default async function HomePage() {
  const account = await currentSessionAccount();
  if (!account) {
    redirect("/sign-in");
  }
  redirect(account.role === "administrator" ? "/administration" : "/my-time");
}
