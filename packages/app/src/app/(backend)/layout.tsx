import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@devmentor/ui/globals.css";

export const metadata: Metadata = {
  title: { default: "DevMentor backend", template: "%s · DevMentor backend" },
  robots: { index: false, follow: false },
};

// Root layout for the admin area: shadcn/ui theme from @devmentor/ui.
export default function BackendLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-svh font-sans antialiased">{children}</body>
    </html>
  );
}
