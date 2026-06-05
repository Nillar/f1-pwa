import type { Metadata, Viewport } from "next";
import { AppHeader } from "@/components/AppHeader";
import { IOSInstallBanner } from "@/components/IOSInstallBanner";
import { getSession } from "@/lib/auth";
import styles from "./layout.module.scss";

import "../assets/styles/globals.scss";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Formula 1 Calendar",
  description: "Get notified when the next event happens",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "F1 Calendar",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSession();

  return (
    <html lang="en">
      <body>
        <div className={styles.siteShell}>
          <AppHeader userEmail={user?.email} />
          <IOSInstallBanner />
          <main className={styles.siteMain}>{children}</main>
        </div>
      </body>
    </html>
  );
}
