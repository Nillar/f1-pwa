import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import styles from "./layout.module.scss";

import "../assets/styles/globals.scss";


export const metadata: Metadata = {
  title: "Formula 1 Calendar",
  description: "Get notified when the next event happens",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className={styles.siteShell}>
          <AppHeader />

          <main className={styles.siteMain}>{children}</main>
        </div>
      </body>
    </html>
  );
}
