"use client";

import { Switch } from "@/components/ui/switch";

export type FilterState = {
  exactOnly: boolean;
  excludeQuotes: boolean;
  excludeBibliography: boolean;
};

export function ReportFilters({
  value,
  onChange,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <FilterToggle
        id="exact"
        label="Exact matches only"
        checked={value.exactOnly}
        onCheckedChange={(exactOnly) => onChange({ ...value, exactOnly })}
      />
      <FilterToggle
        id="quotes"
        label="Exclude quotes"
        checked={value.excludeQuotes}
        onCheckedChange={(excludeQuotes) =>
          onChange({ ...value, excludeQuotes })
        }
      />
      <FilterToggle
        id="biblio"
        label="Exclude bibliography"
        checked={value.excludeBibliography}
        onCheckedChange={(excludeBibliography) =>
          onChange({ ...value, excludeBibliography })
        }
      />
    </div>
  );
}

function FilterToggle({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      {label}
    </label>
  );
}
