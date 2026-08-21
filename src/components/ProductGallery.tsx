"use client";

import Image from "next/image";
import { Product, ProductVariant } from "@/data/products";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  product: Product;
};

export function ProductGallery({ product }: Props) {
  const [variantIndex, setVariantIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [outgoingSrc, setOutgoingSrc] = useState<string | null>(null);
  const [outgoingClip, setOutgoingClip] = useState("inset(0 0 0 0)");
  const [wipeDirection, setWipeDirection] = useState<"right" | "left">("right");
  const [cursorOn, setCursorOn] = useState(false);
  const animating = useRef(false);

  const variant = product.variants[variantIndex];
  const images = variant.images;
  const activeSrc = images[Math.min(imageIndex, images.length - 1)];

  useEffect(() => {
    setImageIndex(0);
  }, [variantIndex]);

  useEffect(() => {
    if (images.length < 2 || animating.current) return;
    const id = window.setInterval(() => {
      if (animating.current) return;
      setImageIndex((i) => (i + 1) % images.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [images.length, variantIndex]);

  function selectVariant(nextIndex: number) {
    if (nextIndex === variantIndex || animating.current) return;
    animating.current = true;
    const direction = nextIndex > variantIndex ? "right" : "left";
    setWipeDirection(direction);
    setOutgoingSrc(activeSrc);
    setOutgoingClip("inset(0 0 0 0)");
    setCursorOn(true);
    setVariantIndex(nextIndex);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setOutgoingClip(
          direction === "right" ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)",
        );
      });
    });

    window.setTimeout(() => {
      setOutgoingSrc(null);
      setOutgoingClip("inset(0 0 0 0)");
      setCursorOn(false);
      animating.current = false;
    }, 720);
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

        <div className="variant-layer is-active">
          <Image
            src={activeSrc}
            alt={`${product.name} — ${variant.name}`}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        {outgoingSrc ? (
          <div
            className="variant-layer is-outgoing"
            style={{ clipPath: outgoingClip }}
          >
            <Image
              src={outgoingSrc}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        ) : null}

        <div
          className={`variant-cursor ${cursorOn ? "is-on" : ""}`}
          style={
            wipeDirection === "left"
              ? { animationName: "cursor-sweep-reverse" }
              : undefined
          }
        />

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
              className={`relative h-11 w-11 rounded-full border-2 transition ${
                active ? "border-ink scale-110" : "border-white ring-1 ring-line hover:scale-105"
              }`}
              style={{ backgroundColor: variant.swatch }}
            >
              <span className="sr-only">{variant.name}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Tap a swatch to wipe between colorways.
      </p>
    </div>
  );
}
