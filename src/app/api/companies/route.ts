import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllMockCompanies } from "@/lib/mock-people";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").toLowerCase().trim();
  const industry = (searchParams.get("industry") ?? "").toLowerCase().trim();

  let companies = getAllMockCompanies();
  if (q) {
    companies = companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)
    );
  }
  if (industry) {
    companies = companies.filter((c) =>
      c.industry.toLowerCase().includes(industry)
    );
  }

  return NextResponse.json({
    companies,
    count: companies.length,
    source: "mock",
  });
}
