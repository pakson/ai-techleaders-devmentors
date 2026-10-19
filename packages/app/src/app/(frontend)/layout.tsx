import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./frontend.css";

export const metadata: Metadata = {
  title: "DevMentor",
  description: "Grow as a developer with a mentor at your side.",
};

// Root layout for the public site (Tailwind). The admin has its own root layout in (backend).
export default function FrontendLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-svh bg-white font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
