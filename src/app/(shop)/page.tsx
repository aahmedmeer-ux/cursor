import Image from "next/image";
import Link from "next/link";
import {
  bestsellers,
  collections,
  heroImage,
} from "@/data/products";
import { HomeSidebar } from "@/components/HomeSidebar";
import { ProductCard } from "@/components/ProductCard";

export default function HomePage() {
  return (
    <>
      <div className="container-page grid gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-12">
          <section className="animate-fade-up">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-ink-muted">
              The best PWC gear is only here.
            </p>
            <h1 className="mt-2 font-display text-[clamp(4.5rem,14vw,8.5rem)] leading-[0.88] tracking-[0.02em]">
              JETTRIBE
            </h1>

            <div className="relative mt-5 overflow-hidden rounded-[18px]">
              <div className="relative aspect-[16/10] md:aspect-[21/10]">
                <Image
                  src={heroImage}
                  alt="Jettribe riders in race gear"
                  fill
                  priority
                  className="object-cover animate-fade-up-delay"
                  sizes="(max-width: 1024px) 100vw, 70vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                <Link
                  href="/product/rs-25p-fade-impact-vest"
                  className="absolute bottom-5 left-5 inline-flex items-center gap-3 rounded-md bg-white/95 px-4 py-3 text-xs font-semibold tracking-[0.14em] uppercase shadow-[var(--shadow-soft)] backdrop-blur transition hover:bg-white"
                >
                  <span>Swipe</span>
                  <span aria-hidden>→</span>
                  <span>Discover Now</span>
                </Link>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-semibold tracking-[0.16em] uppercase text-ink-muted">
              <a href="https://www.instagram.com" target="_blank" rel="noreferrer">
                Instagram
              </a>
              <a href="https://t.me" target="_blank" rel="noreferrer">
                Telegram
              </a>
              <a href="https://www.facebook.com" target="_blank" rel="noreferrer">
                Facebook
              </a>
              <a href="https://x.com" target="_blank" rel="noreferrer">
                Twitter
              </a>
            </div>
          </section>

          <section id="shop-collections" className="animate-fade-up-delay-2">
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 className="font-display text-3xl tracking-[0.04em] md:text-4xl">
                Shop By Collection
              </h2>
              <Link
                href="/product/rs-25p-fade-impact-vest"
                className="shrink-0 text-xs font-semibold tracking-[0.14em] uppercase text-ink-muted hover:text-ink"
              >
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {collections.map((collection) => (
                <Link
                  key={collection.name}
                  href={
                    collection.slug === "vests"
                      ? "/product/rs-25p-fade-impact-vest"
                      : `/#shop-collections`
                  }
                  className="group"
                >
                  <div className="overflow-hidden rounded-[var(--radius)] bg-bg-muted">
                    <Image
                      src={collection.image}
                      alt={collection.name}
                      width={480}
                      height={640}
                      className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="mt-3">
                    <h3 className="text-sm font-semibold tracking-wide uppercase">
                      {collection.name}
                    </h3>
                    <p className="mt-1 text-xs font-semibold tracking-[0.12em] uppercase text-ink-muted group-hover:text-ink">
                      Shop Now →
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 className="font-display text-3xl tracking-[0.04em] md:text-4xl">
                Best Sellers
              </h2>
              <Link
                href="/product/uscg-jtr-vest-orange-blue"
                className="shrink-0 text-xs font-semibold tracking-[0.14em] uppercase text-ink-muted hover:text-ink"
              >
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {bestsellers.map((product) => (
                <ProductCard
                  key={product.id}
                  href={`/product/${product.slug}`}
                  image={product.variants[0].images[0]}
                  name={product.shortName}
                  price={product.price}
                  compareAt={product.compareAt}
                  rating={product.rating}
                  badge={product.badge}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="lg:pt-2">
          <HomeSidebar />
        </div>
      </div>

      <div className="marquee mt-4">
        <div className="marquee-track font-display text-2xl tracking-[0.08em]">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i}>THE BEST JET SKI GEAR · CALIFORNIA 1996 ·</span>
          ))}
        </div>
      </div>
    </>
  );
}
