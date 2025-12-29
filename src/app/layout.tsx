import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/lib/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RFP Studio",
  description: "Generate and validate advanced responses at scale.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <LanguageProvider>
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between px-4 max-w-7xl mx-auto">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">🚀 RFP Studio</span>
              </div>
              <LanguageSelector />
            </div>
          </header>
          <main>{children}</main>
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
