// Public layout - clean, no sidebar, no navbar
// Suitable for candidate test pages, login, etc.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

