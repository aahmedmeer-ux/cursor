"use client";

import Image from "next/image";
import { Product, ProductVariant } from "@/data/products";
import { useEffect, useMemo, useState } from "react";

type Props = {
  product: Product;
};

export function ProductGallery({ product }: Props) {
  const [variantIndex, setVariantIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [outgoing, setOutgoing] = useState<{
    src: string;
    clip: string;
  } | null>(null);
  const [cursorOn, setCursorOn] = useState(false);
  const [liked, setLiked] = useState(false);

  const variant = product.variants[variantIndex];
  const images = variant.images;
  const activeSrc = images[Math.min(imageIndex, images.length - 1)];

  useEffect(() => {
    setImageIndex(0);
  }, [variantIndex]);

  useEffect(() => {
    if (images.length < 2) return;
    const id = window.setInterval(() => {
      setImageIndex((i) => (i + 1) % images.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [images.length, variantIndex]);

  function selectVariant(nextIndex: number) {
    if (nextIndex === variantIndex) return;
    const direction = nextIndex > variantIndex ? "right" : "left";
    setOutgoing({
      src: activeSrc,
      clip:
        direction === "right"
          ? "inset(0 100% 0 0)"
          : "inset(0 0 0 100%)",
    });
    setCursorOn(true);
    setVariantIndex(nextIndex);
    window.setTimeout(() => {
      setOutgoing(null);
      setCursorOn(false);
    }, 700);
  }

  const thumbs = useMemo(() => {
    const list = [...images];
    while (list.length < 3 && product.variants.length > 1) {
      const alt =
        product.variants[(variantIndex + list.length) % product.variants.length]
          .images[0];
      if (!list.includes(alt)) list.push(alt);
      else break;
    }
    return list.slice(0, 4);
  }, [images, product.variants, variantIndex]);

  return (
    <div>
      <div className="variant-stage aspect-[4/5] md:aspect-[3/4]">
        <div className="progress-bar absolute left-4 right-4 top-4 z-10">
          <span key={`${variantIndex}-${imageIndex}`} />
        </div>

        {outgoing ? (
          <div
            className="variant-layer is-outgoing"
            style={{ clipPath: outgoing.clip }}
          >
            <Image
              src={outgoing.src}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        ) : null}

        <div className="variant-layer is-active" key={`${variant.id}-${activeSrc}`}>
          <Image
            src={activeSrc}
            alt={`${product.name} — ${variant.name}`}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        <div className={`variant-cursor ${cursorOn ? "is-on" : ""}`} />

        <div className="absolute bottom-4 left-4 z-10 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase backdrop-blur">
          {variant.name}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2.5">
        {thumbs.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => setImageIndex(Math.min(i, images.length - 1))}
            className={`relative aspect-square overflow-hidden rounded-[12px] border transition ${
              i === imageIndex ? "border-ink" : "border-transparent"
            }`}
          >
            <Image src={src} alt="" fill className="object-cover" sizes="120px" />
          </button>
        ))}
      </div>

      <VariantSwatches
        variants={product.variants}
        activeId={variant.id}
        onSelect={(id) => {
          const idx = product.variants.findIndex((v) => v.id === id);
          if (idx >= 0) selectVariant(idx);
        }}
      />

      <button
        type="button"
        aria-label="Wishlist"
        onClick={() => setLiked((v) => !v)}
        className="sr-only"
      >
        {liked ? "Liked" : "Like"}
      </button>
    </div>
  );
}

function VariantSwatches({
  variants,
  activeId,
  onSelect,
}: {
  variants: ProductVariant[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  if (variants.length < 2) return null;

  return (
    <div className="mt-5">
      <p className="text-xs font-semibold tracking-[0.14em] uppercase text-ink-muted">
        Color — animated preview
      </p>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {variants.map((variant) => {
          const active = variant.id === activeId;
          return (
            <button
              key={variant.id}
              type="button"
              title={variant.name}
              onClick={() => onSelect(variant.id)}
              className={`group relative h-10 w-10 rounded-full border-2 transition ${
                active ? "border-ink scale-110" : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: variant.swatch }}
            >
              <span className="sr-only">{variant.name}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Hover or tap a swatch for the cursor wipe animation between colorways.
      </p>
    </div>
  );
}
