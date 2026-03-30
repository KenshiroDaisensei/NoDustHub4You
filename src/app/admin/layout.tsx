import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin NoDust",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
