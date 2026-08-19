"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ExternalLink, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CompanyResult } from "@/types";

export default function CompaniesPage() {
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("");
  const [companies, setCompanies] = useState<CompanyResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function load(nextQ = q, nextIndustry = industry) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nextQ) params.set("q", nextQ);
      if (nextIndustry) params.set("industry", nextIndustry);
      const res = await fetch(`/api/companies?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load companies");
        return;
      }
      setCompanies(data.companies ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Company Search</h1>
        <p className="text-sm text-muted-foreground">
          Find target accounts, then jump into people search at that domain.
        </p>
      </div>

      <form
        className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <Input
          placeholder="Company name or domain"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Input
          placeholder="Industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          <Search className="size-4" />
          {loading ? "Searching…" : "Search companies"}
        </Button>
      </form>

      <div className="grid gap-3">
        {companies.map((company) => (
          <div
            key={company.id}
            className="flex flex-col gap-3 rounded-xl border bg-white p-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-11 items-center justify-center rounded-lg bg-[#e8f1ff] text-[#1a56db]">
                <Building2 className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{company.name}</p>
                  <Badge variant="outline">{company.industry}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {company.domain} · {company.location} ·{" "}
                  {company.employeeCount} employees
                </p>
                <p className="max-w-2xl text-sm text-slate-600">
                  {company.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3" />
                    {company.peopleCount} people in database
                  </span>
                  {company.linkedinUrl && (
                    <a
                      href={company.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#1a56db] hover:underline"
                    >
                      Company LinkedIn <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
            <Button
              render={
                <Link
                  href={`/search?companyDomain=${encodeURIComponent(company.domain)}`}
                />
              }
            >
              Find people
            </Button>
          </div>
        ))}
        {companies.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No companies matched those filters.
          </div>
        )}
      </div>
    </div>
  );
}
