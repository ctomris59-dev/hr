import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aday Değerlendirme Testi - HR System",
  description: "Yetkinlik değerlendirme testi",
};

export default function CandidateTestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Public page - no ClientLayout wrapper, no sidebar/header
  // Providers are handled by root layout
  return <>{children}</>;
}

