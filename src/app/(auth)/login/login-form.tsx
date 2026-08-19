"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/search";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.demo) {
          toast.message("Supabase not configured — use demo login below.");
        } else {
          toast.error(data.error ?? "Failed to send magic link");
        }
        return;
      }
      toast.success("Check your email for the magic link.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || "demo@leadunlock.app",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Demo login failed");
        return;
      }
      toast.success(`Signed in as ${data.user.email}`);
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            LeadUnlock
          </span>
        </Link>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Sign in with a magic link, or launch the full demo workspace with 25
          credits, advanced people search, company intel, and bulk unlock.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={handleMagicLink}>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send magic link"}
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">OR</span>
          <Separator className="flex-1" />
        </div>

        <Button
          variant="outline"
          className="w-full"
          disabled={loading}
          onClick={handleDemoLogin}
        >
          Continue with demo account
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Demo includes 25 credits and a full prospecting database when
          PDL/Hunter keys are not configured.
        </p>
      </CardContent>
    </Card>
  );
}
