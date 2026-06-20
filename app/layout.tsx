import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Pronostiquez le score exact des matchs de football et grimpez dans le classement mondial mensuel.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Mugen",
  title: "Mugen · Pronostics football",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Mugen",
    locale: "fr_FR",
    url: "/",
    title: "Mugen · Pronostics football",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: "Mugen · Pronostics football",
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
