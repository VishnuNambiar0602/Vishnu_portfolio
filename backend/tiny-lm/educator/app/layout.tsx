import type { Metadata } from "next";
import "./globals.css";
import { TableOfContents } from "@/src/components/TableOfContents";

export const metadata: Metadata = {
  title: "Tiny LM Educator",
  description: "Learn how language models work from scratch.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen flex">
        <TableOfContents />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
