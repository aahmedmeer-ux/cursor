import { ProductCard } from "@/components/ProductCard";
import { ProductImmersive } from "@/components/ProductImmersive";
import { ReviewsSection } from "@/components/ReviewsSection";
import { SiteFooter } from "@/components/SiteFooter";
import { getProductBySlug, products, relatedProducts } from "@/data/products";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Product" };
  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const alsoLike = relatedProducts.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <div className="bg-bg">
      <ProductImmersive product={product} />

      <div className="bg-bg text-ink">
        <ReviewsSection rating={product.rating} reviewCount={product.reviewCount} />

        <section className="container-page mt-16 pb-8">
          <h2 className="font-display text-4xl tracking-[0.04em]">You might also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {alsoLike.map((item) => {
              const discount =
                item.compareAt != null
                  ? Math.round(
                      ((item.compareAt - item.price) / item.compareAt) * 100,
                    )
                  : undefined;
              return (
                <div key={item.id} className="relative">
                  {discount ? (
                    <span className="absolute right-3 top-3 z-10 rounded-full bg-signal px-2 py-1 text-[10px] font-semibold text-white">
                      -{discount}%
                    </span>
                  ) : null}
                  <ProductCard
                    href={`/product/${item.slug}`}
                    image={item.variants[0].images[0]}
                    name={item.shortName}
                    price={item.price}
                    compareAt={item.compareAt}
                    rating={item.rating}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <SiteFooter />
      </div>
    </div>
  );
}
