"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SearchFilterValues = {
  jobTitle: string;
  companyDomain: string;
  industry: string;
};

type SearchFiltersProps = {
  values: SearchFilterValues;
  onChange: (values: SearchFilterValues) => void;
  onSubmit: () => void;
  loading?: boolean;
};

export function SearchFilters({
  values,
  onChange,
  onSubmit,
  loading,
}: SearchFiltersProps) {
  return (
    <form
      className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="jobTitle">Job Title</Label>
        <Input
          id="jobTitle"
          placeholder="CEO, Founder…"
          value={values.jobTitle}
          onChange={(e) => onChange({ ...values, jobTitle: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="companyDomain">Company Domain</Label>
        <Input
          id="companyDomain"
          placeholder="amazon.com"
          value={values.companyDomain}
          onChange={(e) =>
            onChange({ ...values, companyDomain: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="industry">Industry</Label>
        <Input
          id="industry"
          placeholder="Technology"
          value={values.industry}
          onChange={(e) => onChange({ ...values, industry: e.target.value })}
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" className="w-full" disabled={loading}>
          <Search className="size-4" />
          {loading ? "Searching…" : "Search people"}
        </Button>
      </div>
    </form>
  );
}
