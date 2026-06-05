"use client";

import { useEffect, useState } from "react";
import styles from "./IOSInstallBanner.module.scss";

const DISMISSED_KEY = "iosInstallDismissed";

export function IOSInstallBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
        const dismissed = localStorage.getItem(DISMISSED_KEY) === "1";

        if (isIOS && !isStandalone && !dismissed) {
            setVisible(true);
        }
    }, []);

    if (!visible) return null;

    const handleDismiss = () => {
        localStorage.setItem(DISMISSED_KEY, "1");
        setVisible(false);
    };

    return (
        <div className={styles.banner} role="banner">
            <div className={styles.content}>
                <span className={styles.icon}>📲</span>
                <div className={styles.text}>
                    <strong>Install F1 Calendar for push notifications</strong>
                    <p>
                        Tap the Share button <span className={styles.shareIcon}>⎙</span> in
                        Safari → <strong>Add to Home Screen</strong>. Push notifications
                        require the installed app on iOS 16.4+.
                    </p>
                </div>
            </div>
            <button
                className={styles.dismiss}
                onClick={handleDismiss}
                aria-label="Dismiss"
                type="button"
            >
                ✕
            </button>
        </div>
    );
}
