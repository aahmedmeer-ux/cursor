"use client";

import Link from "next/link";
import { useState } from "react";

const audience = ["Men", "Women", "Youth", "Race"];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur-md border-b border-line">
      <div className="container-page">
        <div className="flex items-center justify-between py-3.5">
          <button
            type="button"
            aria-label="Open menu"
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-bg-muted transition"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="flex w-5 flex-col gap-1.5">
              <span className="block h-0.5 w-full bg-ink" />
              <span className="block h-0.5 w-full bg-ink" />
              <span className="block h-0.5 w-4 bg-ink" />
            </span>
          </button>

          <Link
            href="/"
            className="font-display text-[2rem] md:text-[2.35rem] leading-none tracking-[0.04em]"
          >
            JETTRIBE
          </Link>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Account"
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-bg-muted transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M5 19.5c1.8-3.2 4.2-4.8 7-4.8s5.2 1.6 7 4.8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Cart"
              className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-bg-muted transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6.5 8.5h11l-1.1 10.2a1.5 1.5 0 0 1-1.5 1.3H9.1a1.5 1.5 0 0 1-1.5-1.3L6.5 8.5Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M9 8.5V7a3 3 0 0 1 6 0v1.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[10px] font-semibold text-white">
                0
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line py-3 md:flex-row md:items-center md:gap-4">
          <div className="hidden items-center gap-4 text-xs font-semibold tracking-[0.12em] uppercase text-ink-muted md:flex">
            <button type="button" className="hover:text-ink transition">
              Categories ▾
            </button>
            <Link href="/product/rs-25p-fade-impact-vest" className="hover:text-ink transition">
              New Arrivals ▾
            </Link>
          </div>

          <label className="relative flex-1">
            <span className="sr-only">Search</span>
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vests, wetsuits, gloves..."
              className="w-full rounded-full border border-line bg-bg-elevated py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-ink"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {audience.map((item) => (
              <Link
                key={item}
                href="/#shop-collections"
                className="rounded-full border border-line bg-bg-elevated px-3.5 py-1.5 text-xs font-semibold tracking-[0.08em] uppercase transition hover:bg-ink hover:text-white"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-line bg-bg-elevated">
          <nav className="container-page grid gap-2 py-4 text-sm font-medium md:grid-cols-4">
            {[
              ["Impact Vests", "/#shop-collections"],
              ["Wetsuits", "/#shop-collections"],
              ["RS-25P Vest", "/product/rs-25p-fade-impact-vest"],
              ["USCG Vest", "/product/uscg-jtr-vest-orange-blue"],
              ["Rashguards", "/product/jtr-hooded-rashguard-black-grey"],
              ["Beach Towels", "/product/beach-towel-extra-large"],
            ].map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="rounded-lg px-3 py-2 hover:bg-bg-muted"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
