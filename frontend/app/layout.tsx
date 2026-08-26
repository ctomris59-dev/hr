import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { NotificationProvider } from "../context/NotificationContext";
import { DataProvider } from "../context/DataContext";
import { ThemeProvider } from "../components/ThemeProvider";
import { Toaster } from "sonner";
import ToastInterceptor from "../components/ToastInterceptor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HR System - İnsan Kaynakları Yönetimi",
  description: "Modern HR yönetim sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Minimal root layout - only handles HTML structure and providers
  // No UI shell, no sidebar - that's handled by route group layouts
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <DataProvider>
                {children}
              </DataProvider>
            </NotificationProvider>
          </AuthProvider>
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              className:
                "bg-white/80 backdrop-blur-xl border border-white/30 shadow-xl text-slate-800 dark:bg-slate-800/80 dark:text-slate-100 dark:border-slate-700",
            }}
          />
          <ToastInterceptor />
        </ThemeProvider>
      </body>
    </html>
  );
}
