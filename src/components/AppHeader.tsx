"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppHeader.module.scss";

export function AppHeader() {
    const pathname = usePathname();
    const calendarLinkClassName = [
        styles.siteNavLink,
        pathname === "/" ? styles.siteNavLinkActive : "",
    ]
        .filter(Boolean)
        .join(" ");
    const notificationsLinkClassName = [
        styles.siteNavLink,
        pathname === "/notifications-dashboard" ? styles.siteNavLinkActive : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <header className={styles.siteHeader}>
            <div className={styles.siteBrand}>
                <span className={styles.siteBrandEyebrow}>2026 Season</span>
                <span className={styles.siteBrandTitle}>Formula 1 Calendar</span>
            </div>

            <nav className={styles.siteNav} aria-label="Primary">
                <Link className={calendarLinkClassName} href="/">
                    Calendar
                </Link>
                <Link
                    className={notificationsLinkClassName}
                    href="/notifications-dashboard"
                >
                    Notifications
                </Link>
            </nav>
        </header>
    );
}
