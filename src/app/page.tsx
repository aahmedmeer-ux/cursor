import Link from "next/link";
import { ArrowRight, Search, ShieldCheck, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <main className="flex min-h-svh flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-background to-background">
      <header className="border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="size-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              LeadUnlock
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" render={<Link href="/login" />}>
              Sign in
            </Button>
            <Button size="sm" render={<Link href="/login" />}>
              Get started
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-6 py-16">
        <div className="max-w-2xl space-y-5">
          <Badge variant="secondary">B2B contact search & enrichment</Badge>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Find professionals. Unlock verified emails.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Search by job title, company, or industry. Reveal emails with a
            simple credit system — powered by People Data Labs / Apollo and
            Hunter.io, with mock fallbacks for local development.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/login" />}>
              Start searching
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/login" />}
            >
              Try demo mode
            </Button>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Search,
              title: "Precision search",
              body: "Filter leaders by title, domain, and industry.",
            },
            {
              icon: ShieldCheck,
              title: "Credit unlocks",
              body: "Emails stay masked until you spend 1 credit.",
            },
            {
              icon: Users,
              title: "Saved leads",
              body: "Keep unlocked contacts and export CSV anytime.",
            },
          ].map((item) => (
            <div key={item.title} className="space-y-2 border-t pt-4">
              <item.icon className="size-5 text-muted-foreground" />
              <h2 className="font-medium">{item.title}</h2>
              <p className="text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
