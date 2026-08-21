"use client";

import { Product } from "@/data/products";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

type Props = {
  product: Product;
};

type Stage = {
  index: number;
  phase: "idle" | "out" | "in";
};

export function ProductImmersive({ product }: Props) {
  const [variantIndex, setVariantIndex] = useState(0);
  const [size, setSize] = useState(product.sizes[1] ?? product.sizes[0]);
  const [stage, setStage] = useState<Stage>({ index: 0, phase: "idle" });
  const [added, setAdded] = useState(false);
  const locked = useRef(false);

  const variant = product.variants[variantIndex];
  const displayIndex = stage.phase === "out" ? stage.index : variantIndex;
  const displayVariant = product.variants[displayIndex];

  function selectVariant(next: number) {
    if (next === variantIndex || locked.current) return;
    locked.current = true;
    setStage({ index: variantIndex, phase: "out" });

    window.setTimeout(() => {
      setVariantIndex(next);
      setStage({ index: next, phase: "in" });
      window.setTimeout(() => {
        setStage({ index: next, phase: "idle" });
        locked.current = false;
      }, 820);
    }, 420);
  }

  const productMotion =
    stage.phase === "out"
      ? "imm-out"
      : stage.phase === "in"
        ? "imm-in"
        : "imm-idle";

  return (
    <section
      className="relative min-h-[100svh] overflow-x-hidden overflow-y-hidden text-white transition-[background-color] duration-700 ease-out"
      style={{
        background: `radial-gradient(circle at 50% 42%, rgba(255,255,255,0.18), transparent 42%), ${variant.theme}`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-multiply">
        <div className="imm-splatter absolute inset-0" />
      </div>

      <header className="relative z-30 flex items-center justify-between px-5 py-5 md:px-8 lg:px-10">
        <Link href="/" className="text-sm font-medium tracking-[0.04em]">
          [jettribe]
        </Link>

        <div className="hidden items-center gap-1 rounded-full bg-white/15 p-1 backdrop-blur-sm sm:flex">
          <span className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-ink">
            Products
          </span>
          <Link
            href="/#shop-collections"
            className="rounded-full px-4 py-1.5 text-xs font-semibold text-white/85"
          >
            Contact
          </Link>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <nav className="hidden items-center gap-5 md:flex">
            <Link href="/" className="opacity-90 hover:opacity-100">
              Home
            </Link>
            <Link href="/#shop-collections" className="opacity-90 hover:opacity-100">
              Products
            </Link>
            <a href="tel:9512463147" className="opacity-90 hover:opacity-100">
              Contact
            </a>
          </nav>
          <button
            type="button"
            onClick={() => {
              setAdded(true);
              window.setTimeout(() => setAdded(false), 1600);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink"
          >
            {added ? "Added" : "Place order"}
            <span aria-hidden>↗</span>
          </button>
        </div>
      </header>

      <div className="relative z-20 grid min-h-[calc(100svh-88px)] grid-cols-1 px-5 pb-8 pt-4 md:px-8 lg:grid-cols-[1fr_minmax(280px,1.2fr)_1fr] lg:px-10 lg:pb-10">
        <div className="relative z-20 flex max-w-sm flex-col justify-center lg:pb-16">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-white/70">
            {product.badge ?? product.category}
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.8rem,6vw,4.8rem)] leading-[0.92] tracking-[0.02em]">
            Find Your
            <br />
            Greatness
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-white/85 md:text-[15px]">
            {product.description.slice(0, 160)}
            {product.description.length > 160 ? "…" : ""}
          </p>
          <p className="mt-6 text-2xl font-semibold tracking-wide">
            ${product.price.toFixed(2)}
          </p>
        </div>

        <div className="relative z-10 flex min-h-[420px] items-center justify-center overflow-visible py-6 lg:min-h-0 lg:py-0">
          <div
            key={`word-${displayVariant.id}-${stage.phase}`}
            aria-hidden
            className={`pointer-events-none absolute left-1/2 top-[48%] z-0 w-[160%] -translate-x-1/2 -translate-y-1/2 select-none text-center font-display text-[clamp(8rem,32vw,20rem)] leading-none tracking-[0.08em] text-white ${productMotion}`}
            style={{
              textShadow: "0 18px 60px rgba(0,0,0,0.28)",
            }}
          >
            {displayVariant.word}
          </div>

          <div
            key={`product-${displayVariant.id}-${stage.phase}`}
            className={`relative z-10 w-[min(52vw,340px)] ${productMotion}`}
          >
            <div className="relative aspect-[4/5] rotate-[-16deg]">
              <Image
                src={displayVariant.images[0]}
                alt={`${product.name} — ${displayVariant.name}`}
                fill
                priority
                className="rounded-[26px] object-cover shadow-[0_35px_60px_rgba(0,0,0,0.45)]"
                sizes="(max-width: 1024px) 55vw, 340px"
              />
            </div>
          </div>
        </div>

        <div className="relative z-20 flex flex-col justify-center gap-8 lg:items-end lg:pb-16">
          <div className="w-full max-w-[220px] lg:text-right">
            <p className="text-xs font-semibold tracking-[0.14em] uppercase text-white/75">
              Choose Your Color
            </p>
            <div className="mt-4 flex flex-wrap gap-3 lg:justify-end">
              {product.variants.map((item, index) => {
                const active = index === variantIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.name}
                    aria-label={item.name}
                    onClick={() => selectVariant(index)}
                    className={`h-11 w-11 rounded-full border-2 transition ${
                      active
                        ? "scale-110 border-white"
                        : "border-white/35 hover:scale-105 hover:border-white/80"
                    }`}
                    style={{ backgroundColor: item.swatch }}
                  />
                );
              })}
            </div>
            <p className="mt-3 text-sm font-medium text-white/90">
              {variant.name}
            </p>
          </div>

          <div className="w-full max-w-[220px] lg:text-right">
            <p className="text-xs font-semibold tracking-[0.14em] uppercase text-white/75">
              Choose Your Size
            </p>
            <div className="mt-4 flex flex-wrap gap-3 lg:justify-end">
              {product.sizes.map((option) => {
                const active = option === size;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSize(option)}
                    className={`grid h-12 min-w-12 place-items-center rounded-full border px-3 text-sm font-semibold transition ${
                      active
                        ? "border-white bg-white text-ink"
                        : "border-white/70 text-white hover:bg-white/10"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-20 flex items-end justify-between gap-4 px-5 pb-6 md:px-8 lg:px-10">
        <div className="flex gap-4 text-xs tracking-[0.12em] uppercase text-white/75">
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer">
            Ig
          </a>
          <a href="https://www.facebook.com" target="_blank" rel="noreferrer">
            Fb
          </a>
          <a href="https://www.youtube.com" target="_blank" rel="noreferrer">
            Yt
          </a>
        </div>

        <div className="hidden items-center gap-3 text-xs tracking-[0.16em] uppercase text-white/80 sm:flex">
          <span className="h-px w-10 bg-white/50" />
          Choose your size
          <span className="h-px w-10 bg-white/50" />
        </div>

        <Link
          href="/#shop-collections"
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink"
        >
          See all products
          <span aria-hidden>↗</span>
        </Link>
      </div>
    </section>
  );
}
