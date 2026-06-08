import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Import assistant-ui and livekit styles
import "@assistant-ui/styles/index.css";
import "@livekit/components-styles";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Travlex — India Travel AI Assistant",
  description: "Accessible Travel Assistant for India Tourism, featuring text and real-time voice guidance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-black text-neutral-100 selection:bg-neutral-800 selection:text-white">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
