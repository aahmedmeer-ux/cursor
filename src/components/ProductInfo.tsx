"use client";

import { Product } from "@/data/products";
import { useEffect, useState } from "react";

type Props = {
  product: Product;
};

export function ProductInfo({ product }: Props) {
  const [size, setSize] = useState(product.sizes[0]);
  const [descOpen, setDescOpen] = useState(true);
  const [shipOpen, setShipOpen] = useState(true);
  const [liked, setLiked] = useState(false);
  const [added, setAdded] = useState(false);
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const diff = Math.max(0, end.getTime() - now.getTime());
      const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setDeadline(`${h}:${m}:${s}`);
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div>
      <span className="inline-flex rounded-full bg-bg-muted px-3 py-1 text-[11px] font-semibold tracking-[0.12em] uppercase text-ink-muted">
        {product.category}
      </span>

      <h1 className="mt-4 font-display text-[clamp(2.6rem,6vw,4.2rem)] leading-[0.95] tracking-[0.02em]">
        {product.name}
      </h1>

      <div className="mt-4 flex flex-wrap items-baseline gap-3">
        <p className="text-2xl font-semibold">${product.price.toFixed(2)}</p>
        {product.compareAt ? (
          <p className="text-ink-faint line-through">
            ${product.compareAt.toFixed(2)}
          </p>
        ) : null}
        {product.badge ? (
          <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-semibold tracking-[0.1em] uppercase text-white">
            {product.badge}
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-lg bg-bg-muted px-3.5 py-2.5 text-sm text-ink-muted">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 8v4.5l3 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span>
          Order in <strong className="text-ink tabular-nums">{deadline}</strong> for
          priority warehouse processing
        </span>
      </div>

      <div className="mt-7">
        <p className="text-xs font-semibold tracking-[0.14em] uppercase">
          Select Size
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {product.sizes.map((option) => {
            const active = option === size;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setSize(option)}
                className={`min-w-12 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-ink text-white"
                    : "bg-bg-muted text-ink hover:bg-bg-soft"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => {
            setAdded(true);
            window.setTimeout(() => setAdded(false), 1800);
          }}
          className="flex-1 rounded-xl bg-ink px-5 py-4 text-sm font-semibold tracking-[0.12em] uppercase text-white transition hover:bg-accent"
        >
          {added ? "Added to Cart" : "Add to Cart"}
        </button>
        <button
          type="button"
          aria-label="Add to wishlist"
          onClick={() => setLiked((v) => !v)}
          className={`grid h-[52px] w-[52px] place-items-center rounded-xl border border-line transition ${
            liked ? "bg-ink text-white" : "bg-bg-elevated hover:bg-bg-muted"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"}>
            <path
              d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="mt-8 divide-y divide-line border-y border-line">
        <Accordion
          title="Description & Fit"
          open={descOpen}
          onToggle={() => setDescOpen((v) => !v)}
        >
          <p className="text-sm leading-relaxed text-ink-muted">{product.description}</p>
          <ul className="mt-4 space-y-2 text-sm text-ink-muted">
            {product.features.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="text-ink">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </Accordion>

        <Accordion
          title="Shipping"
          open={shipOpen}
          onToggle={() => setShipOpen((v) => !v)}
        >
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Discount", product.shipping.discount],
              ["Package", product.shipping.package],
              ["Delivery Time", product.shipping.delivery],
              ["Estimation", product.shipping.estimation],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[12px] border border-line bg-bg px-3.5 py-3"
              >
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-ink-faint">
                  {label}
                </p>
                <p className="mt-1 text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        </Accordion>
      </div>
    </div>
  );
}

function Accordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="py-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left text-sm font-semibold tracking-[0.08em] uppercase"
      >
        {title}
        <span className="text-lg leading-none text-ink-muted">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
