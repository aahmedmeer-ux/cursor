"use client";

import Image from "next/image";

const reviews = [
  {
    name: "Alex Mathio",
    date: "13 Oct 2024",
    rating: 5,
    body: "Gear feels race-ready out of the box. Fit is dialed and the fade colorway looks even better in person.",
    avatar:
      "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/2390/30176/JTR_USCG_UR20_VESTS_Black_Front1__48936.1777700780.jpg",
  },
  {
    name: "Derek Corell",
    date: "02 Sep 2024",
    rating: 5,
    body: "Bought suits and beachwear — sharp, great quality. Customer support went above and beyond.",
    avatar:
      "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/2478/30660/25452GW-1__34114.1775847866.JPG",
  },
  {
    name: "Yohei Yamamoto",
    date: "18 Aug 2024",
    rating: 5,
    body: "Excellent support from Jettribe and the vest holds up hard on the course.",
    avatar:
      "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/2475/30668/25452OA-1__02393.1775848281.JPG",
  },
];

const distribution = [
  { stars: 5, pct: 72 },
  { stars: 4, pct: 18 },
  { stars: 3, pct: 6 },
  { stars: 2, pct: 2 },
  { stars: 1, pct: 2 },
];

type Props = {
  rating: number;
  reviewCount: number;
};

export function ReviewsSection({ rating, reviewCount }: Props) {
  return (
    <section className="container-page mt-16 border-t border-line pt-12">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr_360px]">
        <div>
          <p className="font-display text-6xl tracking-[0.02em]">
            {rating.toFixed(1).replace(".", ",")} / 5
          </p>
          <p className="mt-2 text-sm text-ink-muted">({reviewCount} New Reviews)</p>
        </div>

        <div className="space-y-2.5 self-center">
          {distribution.map((row) => (
            <div key={row.stars} className="flex items-center gap-3 text-sm">
              <span className="w-4 tabular-nums text-ink-muted">{row.stars}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-muted">
                <div
                  className="h-full rounded-full bg-ink"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-hidden">
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
            {reviews.map((review) => (
              <article
                key={review.name}
                className="min-w-[300px] snap-start rounded-[var(--radius)] border border-line bg-bg-elevated p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-11 overflow-hidden rounded-full bg-bg-muted">
                    <Image src={review.avatar} alt="" fill className="object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{review.name}</p>
                    <p className="text-xs text-ink-muted">
                      {"★".repeat(review.rating)} · {review.date}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                  {review.body}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-bg-muted">
            <div className="h-full w-1/3 rounded-full bg-ink/40" />
          </div>
        </div>
      </div>
    </section>
  );
}
