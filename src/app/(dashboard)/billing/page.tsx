"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const packages = [
  { credits: 10, price: "$19", label: "Starter" },
  { credits: 50, price: "$79", label: "Growth", popular: true },
  { credits: 100, price: "$129", label: "Scale" },
];

export default function BillingPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingAmount, setLoadingAmount] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/credits");
      const data = await res.json();
      if (res.ok) setBalance(data.balance);
    }
    void load();
  }, []);

  async function purchase(amount: number) {
    setLoadingAmount(amount);
    try {
      const res = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Purchase failed");
        return;
      }
      setBalance(data.balance);
      toast.success(`Added ${amount} credits. New balance: ${data.balance}`);
      router.refresh();
    } finally {
      setLoadingAmount(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Top up credits to unlock verified emails. Payments are simulated in
            this demo.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
          <Coins className="size-3.5" />
          {balance === null ? "…" : `${balance} credits`}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {packages.map((pkg) => (
          <Card
            key={pkg.credits}
            className={pkg.popular ? "border-primary shadow-sm" : undefined}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{pkg.label}</CardTitle>
                {pkg.popular && <Badge>Popular</Badge>}
              </div>
              <CardDescription>
                {pkg.credits} unlock credits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">
                {pkg.price}
              </p>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={pkg.popular ? "default" : "outline"}
                disabled={loadingAmount === pkg.credits}
                onClick={() => purchase(pkg.credits)}
              >
                {loadingAmount === pkg.credits
                  ? "Adding…"
                  : `Add ${pkg.credits} credits`}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
