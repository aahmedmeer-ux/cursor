"use client";

import { testimonials } from "@/data/products";
import { useEffect, useState } from "react";

export function TestimonialCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % testimonials.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  const item = testimonials[index];

  return (
    <div className="rounded-[var(--radius)] border border-line bg-bg-elevated p-5">
      <h3 className="text-xs font-semibold tracking-[0.16em] uppercase">
        What Our Customers Say
      </h3>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">&ldquo;{item.quote}&rdquo;</p>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{item.name}</p>
          <p className="text-xs text-ink-muted">{"★".repeat(item.rating)}</p>
        </div>
        <div className="flex gap-1.5">
          {testimonials.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show testimonial ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 w-2 rounded-full transition ${
                i === index ? "bg-ink" : "bg-line"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
