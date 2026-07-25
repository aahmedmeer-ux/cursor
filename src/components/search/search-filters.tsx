"use client";

import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SearchFilterValues = {
  name: string;
  jobTitle: string;
  company: string;
  companyDomain: string;
  industry: string;
  location: string;
  seniority: string;
  department: string;
  companySize: string;
  keywords: string;
};

export const EMPTY_FILTERS: SearchFilterValues = {
  name: "",
  jobTitle: "",
  company: "",
  companyDomain: "",
  industry: "",
  location: "",
  seniority: "",
  department: "",
  companySize: "",
  keywords: "",
};

type SearchFiltersProps = {
  values: SearchFilterValues;
  onChange: (values: SearchFilterValues) => void;
  onSubmit: () => void;
  onReset: () => void;
  loading?: boolean;
};

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function SearchFilters({
  values,
  onChange,
  onSubmit,
  onReset,
  loading,
}: SearchFiltersProps) {
  return (
    <aside className="flex h-full flex-col border-r bg-[#f7f9fc]">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">Advanced Search</h2>
        <p className="text-xs text-muted-foreground">
          Filter like RocketReach / SignalHire
        </p>
      </div>

      <form
        className="flex flex-1 flex-col gap-4 overflow-y-auto p-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Profile
          </p>
          <Field id="name" label="Name">
            <Input
              id="name"
              placeholder="e.g. Satya Nadella"
              value={values.name}
              onChange={(e) => onChange({ ...values, name: e.target.value })}
            />
          </Field>
          <Field id="jobTitle" label="Job Title">
            <Input
              id="jobTitle"
              placeholder="CEO, VP Sales, Engineer…"
              value={values.jobTitle}
              onChange={(e) => onChange({ ...values, jobTitle: e.target.value })}
            />
          </Field>
          <Field id="seniority" label="Seniority Level">
            <Select
              value={values.seniority || undefined}
              onValueChange={(v) =>
                onChange({ ...values, seniority: v ?? "" })
              }
            >
              <SelectTrigger id="seniority" className="w-full">
                <SelectValue placeholder="Any seniority" />
              </SelectTrigger>
              <SelectContent>
                {[
                  "Founder",
                  "C-Level",
                  "VP",
                  "Director",
                  "Manager",
                  "Senior",
                  "Entry",
                ].map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="department" label="Department">
            <Input
              id="department"
              placeholder="Sales, Engineering, Marketing…"
              value={values.department}
              onChange={(e) =>
                onChange({ ...values, department: e.target.value })
              }
            />
          </Field>
          <Field id="keywords" label="Skills / Keywords">
            <Input
              id="keywords"
              placeholder="AI, SaaS, Fintech…"
              value={values.keywords}
              onChange={(e) => onChange({ ...values, keywords: e.target.value })}
            />
          </Field>
          <Field id="location" label="Location">
            <Input
              id="location"
              placeholder="San Francisco, London…"
              value={values.location}
              onChange={(e) => onChange({ ...values, location: e.target.value })}
            />
          </Field>
        </div>

        <div className="space-y-3 border-t pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Company
          </p>
          <Field id="company" label="Company Name">
            <Input
              id="company"
              placeholder="Stripe, Notion…"
              value={values.company}
              onChange={(e) => onChange({ ...values, company: e.target.value })}
            />
          </Field>
          <Field id="companyDomain" label="Company Domain">
            <Input
              id="companyDomain"
              placeholder="amazon.com"
              value={values.companyDomain}
              onChange={(e) =>
                onChange({ ...values, companyDomain: e.target.value })
              }
            />
          </Field>
          <Field id="industry" label="Industry">
            <Input
              id="industry"
              placeholder="Technology, Fintech…"
              value={values.industry}
              onChange={(e) => onChange({ ...values, industry: e.target.value })}
            />
          </Field>
          <Field id="companySize" label="Company Size">
            <Select
              value={values.companySize || undefined}
              onValueChange={(v) =>
                onChange({ ...values, companySize: v ?? "" })
              }
            >
              <SelectTrigger id="companySize" className="w-full">
                <SelectValue placeholder="Any size" />
              </SelectTrigger>
              <SelectContent>
                {[
                  "1-50",
                  "51-200",
                  "201-1000",
                  "1001-5000",
                  "5001-10000",
                  "10000+",
                ].map((size) => (
                  <SelectItem key={size} value={size}>
                    {size} employees
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t pt-4">
          <Button type="submit" className="w-full" disabled={loading}>
            <Search className="size-4" />
            {loading ? "Searching…" : "Find people"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onReset}
          >
            <RotateCcw className="size-4" />
            Reset filters
          </Button>
        </div>
      </form>
    </aside>
  );
}
