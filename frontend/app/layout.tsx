import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import "./readability-hardening.css";
import "./ux-hardening.css";
import "./readability-final.css";
import "./readability-actions.css";
import "./visual-decision-system.css";
import "./visual-decision-readability.css";
import "./visual-command-contrast.css";
import "./visual-cards-v3.css";
import "./visual-modules-v4.css";
import "./analytics-dashboard.css";
import "./module-hero-polish.css";
import "./executive-dashboard-unification.css";
import "./futurehr-family-nav-premium.css";
import "./sidebar-premium.css";
import "./futurehr-agent-layer.css";
import { AuthProvider } from "../context/AuthContext";
import { NotificationProvider } from "../context/NotificationContext";
import { DataProvider } from "../context/DataContext";
import { ThemeProvider } from "../components/ThemeProvider";
import DemoCompany50Bridge from "../components/DemoCompany50Bridge";
import DemoCompany50PerformanceNormalizer from "../components/DemoCompany50PerformanceNormalizer";
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

const editorial = Source_Serif_4({
  variable: "--font-editorial",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FutureHR | İnsan ve Yetenek Karar Platformu",
  description:
    "Performans, yetenek, kariyer, halefiyet, çalışan deneyimi ve ücret kararlarını tek bir kanıt zincirinde birleştiren FutureHR insan kaynakları platformu.",
  applicationName: "FutureHR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${editorial.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <DataProvider>
                <DemoCompany50Bridge />
                <DemoCompany50PerformanceNormalizer />
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
                "border border-slate-200 bg-white text-slate-800 shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
            }}
          />
          <ToastInterceptor />
        </ThemeProvider>
      </body>
    </html>
  );
}
