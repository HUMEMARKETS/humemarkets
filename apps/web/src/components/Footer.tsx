import { chains } from '@hume/config';
import Link from 'next/link';
import { env } from '@/lib/env';
import { APP_GUTTER } from '@/lib/frame';
import { MORE_LINKS } from '@/lib/nav';
import { X_URL } from '@/lib/social';
import { listLink } from '@hume/ui';
import { Logo } from './Logo';
import { StatusBadge } from './StatusBadge';
import { XIcon } from './XIcon';

/// One thin line, not a menu: the brand and the tagline on the left; the pages with no slot in the header
/// (Activity, Docs, Features), the network status and the X link on the right. Wraps and centres on a phone.
export function Footer() {
    return (
        <footer className="border-t border-line bg-surface">
            <div
                className={`w-full ${APP_GUTTER} flex flex-wrap items-center justify-center gap-x-6 gap-y-3 py-6 sm:justify-between`}
            >
                <div className="flex flex-wrap items-center gap-3">
                    <Logo size="sm" />
                    <p className="text-muted">
                        Global markets, onchain.
                    </p>
                </div>
                <nav
                    aria-label="Footer"
                    className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
                >
                    {MORE_LINKS.map((link) => (
                        <Link key={link.href} href={link.href} className={listLink}>
                            {link.label}
                        </Link>
                    ))}
                    <StatusBadge label={chains[env.chainId].name} />
                    <a
                        href={X_URL}
                        target="_blank"
                        rel="noreferrer"
                        className={`${listLink} items-center gap-2`}
                    >
                        <XIcon />
                    </a>
                </nav>
            </div>
        </footer>
    );
}
