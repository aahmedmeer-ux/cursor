"use client";

import Image from "next/image";
import {
  heroImage,
  newsletterImage,
  promoImage,
  saleImage,
} from "@/data/products";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { TestimonialCarousel } from "./TestimonialCarousel";

const values = [
  { title: "Race Proven", detail: "Since 1996" },
  { title: "Free Shipping", detail: "$400+ USA" },
  { title: "Easy Returns", detail: "30 days" },
  { title: "Secure Payment", detail: "Encrypted" },
];

export function HomeSidebar() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function onSubscribe(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setDone(true);
  }

  return (
    <aside className="space-y-5">
      <div className="overflow-hidden rounded-[var(--radius)] border border-line bg-[#1a1a1a] text-white">
        <div className="relative aspect-[4/3]">
          <Image src={promoImage} alt="Race essentials promo" fill className="object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        </div>
        <div className="p-4">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-white/65">
            New Collection
          </p>
          <h3 className="mt-1 font-display text-3xl tracking-[0.03em]">Race Essentials</h3>
          <Link
            href="/product/rs-25p-fade-impact-vest"
            className="mt-4 inline-flex rounded-md bg-white px-4 py-2.5 text-xs font-semibold tracking-[0.12em] uppercase text-ink transition hover:bg-bg-muted"
          >
            Shop Now
          </Link>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-line bg-bg-elevated p-5">
        <ul className="space-y-4">
          {values.map((value) => (
            <li key={value.title} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bg-muted">
                <span className="block h-2 w-2 rotate-45 bg-ink" />
              </span>
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] uppercase">
                  {value.title}
                </p>
                <p className="text-sm text-ink-muted">{value.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] bg-ink text-white">
        <div className="relative aspect-[5/4]">
          <Image src={saleImage} alt="Sale vest" fill className="object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-white/70">
              Limited Offer
            </p>
            <h3 className="mt-1 font-display text-4xl tracking-[0.03em]">Up To 20% Off</h3>
            <Link
              href="/product/rs-16-side-entry-black-vest"
              className="mt-4 inline-flex rounded-md bg-white px-4 py-2.5 text-xs font-semibold tracking-[0.12em] uppercase text-ink"
            >
              Shop Sale
            </Link>
          </div>
        </div>
      </div>

      <TestimonialCarousel />

      <div className="overflow-hidden rounded-[var(--radius)] border border-line bg-bg-elevated">
        <div className="relative aspect-[16/10]">
          <Image src={newsletterImage} alt="Stay updated" fill className="object-cover" />
        </div>
        <div className="p-5">
          <h3 className="text-xs font-semibold tracking-[0.16em] uppercase">Stay Updated</h3>
          <p className="mt-2 text-sm text-ink-muted">
            New drops, race events, and rider deals — straight from Southern California.
          </p>
          {done ? (
            <p className="mt-4 text-sm font-medium text-accent-soft">You&apos;re on the list.</p>
          ) : (
            <form onSubmit={onSubscribe} className="mt-4 space-y-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full rounded-md border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-ink"
              />
              <button
                type="submit"
                className="w-full rounded-md bg-ink px-4 py-2.5 text-xs font-semibold tracking-[0.12em] uppercase text-white"
              >
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="hidden">
        <Image src={heroImage} alt="" width={1} height={1} />
      </div>
    </aside>
  );
}
