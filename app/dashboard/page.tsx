import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth/next";

import { authOptions } from "../api/auth/[...nextauth]/options";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = (await getServerSession(authOptions)) as Session | null;
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <DashboardClient />;
}
