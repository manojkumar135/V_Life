import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "sonner";
import { VLifeContextProvider } from "@/store/context";
import { checkAuth } from "@/lib/checkAuth";
import Layout from "@/layout/Layout";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: "Maverick Signature",
  description: "WHERE VISION MEETS ACTION",
    icons: {
    icon: "/favicon.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerStore = await headers();
  const pathname = headerStore.get("x-matched-path") || "/";

  const redirectPath = await checkAuth(pathname);

  if (redirectPath) redirect(redirectPath);

  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <VLifeContextProvider>
          <Toaster position="top-right" richColors closeButton />
          {children}
        </VLifeContextProvider>
      </body>
    </html>
  );
}
