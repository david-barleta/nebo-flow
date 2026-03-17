// =============================================================================
// Root Layout — The "shell" that wraps every page in the app
// =============================================================================
// In Next.js (App Router), layout.tsx is a special file that wraps all pages.
// Think of it as the outermost HTML skeleton — the <html> and <body> tags live
// here, along with global styles and fonts. Every page you create will be
// rendered INSIDE this layout's {children} slot.
//
// This file runs on the SERVER by default (not in the browser), which is why
// there's no "use client" at the top. However, the AuthProvider inside is a
// client component — Next.js handles this boundary automatically.
// =============================================================================

// "import type" means we're only importing the TypeScript TYPE, not actual code.
// Metadata is a type that defines the shape of the metadata object below.
import type { Metadata } from "next";

// Next.js has built-in font optimization. Instead of loading fonts via a <link>
// tag (which causes a flash of unstyled text), Next.js downloads and serves
// them locally. These two are Google Fonts loaded at build time.
import { Poppins, Raleway } from "next/font/google";

// Import global CSS styles (Tailwind CSS base styles)
import "./globals.css";

// Auth context wraps the entire app so any component can access user state
import { AuthProvider } from "@/contexts/auth-context";

// Initialize the fonts with configuration options.
// "variable" creates a CSS custom property (e.g., --font-geist-sans) so we can
// reference these fonts in Tailwind or CSS. "subsets" limits to Latin characters
// to keep the font file size small.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});


// Metadata is used by Next.js to set the page's <title> and <meta> tags.
// This affects what shows in the browser tab and in search engine results.
export const metadata: Metadata = {
  title: "Nebo Flow",
  description: "Accounting system for Philippine SMEs",
};

// =============================================================================
// The RootLayout Component
// =============================================================================
// { children }: Readonly<{ children: React.ReactNode }>
//   - The function receives a props object
//   - We're pulling out just the "children" property
//   - "children" is whatever page component Next.js renders based on the URL
// =============================================================================
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${raleway.variable} antialiased`}
      >
        {/* AuthProvider makes auth state available to all pages/components */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
