import Link from "next/link";
import { Search, Users, CreditCard, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const stack = [
  "Next.js App Router",
  "TypeScript",
  "Tailwind CSS v4",
  "Shadcn UI",
  "Supabase (next)",
];

const planned = [
  {
    icon: Search,
    title: "People Search",
    description: "Filter by job title, company domain, and industry.",
  },
  {
    icon: CreditCard,
    title: "Credit Unlocks",
    description: "Reveal verified emails for 1 credit per contact.",
  },
  {
    icon: Users,
    title: "Saved Leads",
    description: "Review unlocked contacts and export to CSV.",
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">
              LeadUnlock
            </span>
            <Badge variant="secondary">Step 1</Badge>
          </div>
          <Button variant="outline" size="sm" render={<Link href="#foundation" />}>
            Foundation ready
          </Button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-6 py-16">
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">
            B2B contact search & enrichment
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Find professionals. Unlock verified emails.
          </h1>
          <p className="max-w-xl text-muted-foreground">
            Project foundation is initialized. Next up: Supabase schema, auth,
            and the search dashboard.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {stack.map((item) => (
              <Badge key={item} variant="outline">
                {item}
              </Badge>
            ))}
          </div>
        </div>

        <div id="foundation" className="grid gap-4 sm:grid-cols-3">
          {planned.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <item.icon className="mb-2 size-5 text-muted-foreground" />
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Step 1 complete
            </CardTitle>
            <CardDescription>
              Next.js, Tailwind, and Shadcn UI are installed. Awaiting approval
              before the Supabase schema (Step 2).
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Components available under{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              src/components/ui
            </code>
            : button, input, label, card, table, badge, sidebar, dialog, and
            more.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
