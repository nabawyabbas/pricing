import { db } from "@/lib/db";
import { ViewsList } from "./ViewsList";

async function getViews() {
  return await db.pricingView.findMany({
    orderBy: { name: "asc" },
  });
}

export default async function ViewsPage() {
  const views = await getViews();

  return <ViewsList views={views} />;
}

