import Link from "next/link";

const columns = [
  {
    title: "Shop",
    links: ["Impact Vests", "Wetsuits", "Gloves", "Boots", "Goggles", "Covers"],
  },
  {
    title: "Company",
    links: ["About Jettribe", "Since 1996", "Team Riders", "Events"],
  },
  {
    title: "Help",
    links: ["Size Chart", "Shipping", "Returns", "Contact"],
  },
  {
    title: "Account",
    links: ["Sign In", "Rider Rewards", "Wishlist", "Orders"],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-bg-elevated">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.2fr_2fr]">
        <div>
          <Link href="/" className="font-display text-4xl tracking-[0.04em]">
            JETTRIBE
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
            A true core personal watercraft brand born in Southern California.
            Race-ready impact vests, wetsuits, and rider gear since 1996.
          </p>
          <div className="mt-6 flex gap-4 text-xs font-semibold tracking-[0.14em] uppercase text-ink-muted">
            <a href="https://www.instagram.com" target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href="https://www.facebook.com" target="_blank" rel="noreferrer">
              Facebook
            </a>
            <a href="https://www.youtube.com" target="_blank" rel="noreferrer">
              YouTube
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-semibold tracking-[0.16em] uppercase">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-ink-muted">
                {column.links.map((link) => (
                  <li key={link}>
                    <Link href="/#shop-collections" className="hover:text-ink transition">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-3 py-5 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Jettribe. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/">Privacy Policy</Link>
            <Link href="/">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
