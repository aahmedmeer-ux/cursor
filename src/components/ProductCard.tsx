import Image from "next/image";
import Link from "next/link";

type ProductCardProps = {
  href: string;
  image: string;
  name: string;
  price: number;
  compareAt?: number;
  rating?: number;
  badge?: string;
};

export function ProductCard({
  href,
  image,
  name,
  price,
  compareAt,
  rating,
  badge,
}: ProductCardProps) {
  return (
    <Link href={href} className="group block">
      <div className="relative overflow-hidden rounded-[var(--radius)] bg-bg-muted">
        {badge ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-bg-elevated px-2.5 py-1 text-[10px] font-semibold tracking-[0.1em] uppercase">
            {badge}
          </span>
        ) : null}
        <Image
          src={image}
          alt={name}
          width={640}
          height={800}
          className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="text-sm font-semibold tracking-wide uppercase">{name}</h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">${price.toFixed(2)}</span>
          {compareAt ? (
            <span className="text-ink-faint line-through">${compareAt.toFixed(2)}</span>
          ) : null}
          {rating ? (
            <span className="ml-auto text-xs text-ink-muted">
              {rating.toFixed(1)} ★
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
