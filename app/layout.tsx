import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { PaymentStatusCheck } from "@/components/payment-status-check";
import { headers } from "next/headers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Neighbour Link - AI-Powered Hyperlocal Sharing",
  description: "Connect with verified neighbors to share, rent, sell, volunteer, or connect safely within your community.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Await headers() to fix Next.js 15 compatibility with ClerkProvider
  await headers();
  
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <ReactQueryProvider>
            <PaymentStatusCheck />
            {children}
          </ReactQueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

