import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Search,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Search,
    title: "Advanced people search",
    body: "Filter by title, seniority, department, company, industry, location, and skills.",
  },
  {
    icon: ShieldCheck,
    title: "Verified email + phone",
    body: "Reveal contact details with confidence scores. 1 credit unlocks email and phone.",
  },
  {
    icon: Building2,
    title: "Company intelligence",
    body: "Search target accounts, then drill into decision-makers at that domain.",
  },
  {
    icon: Users,
    title: "Lists & CSV export",
    body: "Save unlocked leads, bulk unlock selections, and export outreach-ready CSVs.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,#eef4ff_0%,#ffffff_42%,#ffffff_100%)]">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#1a56db] text-white">
              <Zap className="size-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              LeadUnlock
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/login" />}
            >
              Sign in
            </Button>
            <Button
              size="sm"
              className="bg-[#1a56db] hover:bg-[#1648b8]"
              render={<Link href="/login" />}
            >
              Start free
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
        <div className="space-y-6">
          <Badge className="bg-[#e8f1ff] text-[#1a56db] hover:bg-[#e8f1ff]">
            RocketReach-style B2B contact enrichment
          </Badge>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Find anyone&apos;s email & phone. Build pipelines faster.
          </h1>
          <p className="max-w-xl text-lg text-slate-600">
            Search professionals like SignalHire, unlock verified contacts with
            credits, and export clean lead lists for sales or recruiting.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="bg-[#1a56db] hover:bg-[#1648b8]"
              render={<Link href="/login" />}
            >
              Open people search
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/login" />}
            >
              Try demo (25 credits)
            </Button>
          </div>
          <ul className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            {[
              "Seniority + department filters",
              "Bulk unlock selected profiles",
              "Company search + people drilldown",
              "CSV export for outreach tools",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#1a56db]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(26,86,219,0.12)]">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Live preview</p>
            <Badge variant="outline">Masked until unlock</Badge>
          </div>
          <div className="space-y-3">
            {[
              {
                name: "Patrick Collison",
                title: "CEO @ Stripe",
                email: "p***@stripe.com",
                loc: "San Francisco, CA",
              },
              {
                name: "Aisha Rahman",
                title: "VP Sales @ HubSpot",
                email: "a***@hubspot.com",
                loc: "Boston, MA",
              },
              {
                name: "Marcus Chen",
                title: "Director Eng @ Notion",
                email: "m***@notion.so",
                loc: "New York, NY",
              },
            ].map((row) => (
              <div
                key={row.name}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-500">
                    {row.title} · {row.loc}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-slate-500">{row.email}</p>
                  <p className="text-[11px] font-medium text-[#1a56db]">
                    Unlock · 1 credit
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="space-y-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#e8f1ff] text-[#1a56db]">
                <feature.icon className="size-5" />
              </div>
              <h2 className="font-semibold text-slate-900">{feature.title}</h2>
              <p className="text-sm leading-relaxed text-slate-600">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
