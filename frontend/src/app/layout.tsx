import type { Metadata } from "next";
import { Cinzel, Jersey_15, Rubik, Spectral } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// The JRPG theme's fonts (intent/28), used by the [data-theme="jrpg"]
// screens: pixel lettering for titles and labels, Rubik for text and numbers.
// Jersey 15 over Pixelify Sans (decided 2026-10-29): Pixelify's C read as an
// O and its 2 as an 8 at the app's sizes.
const jersey = Jersey_15({
  variable: "--font-jersey",
  subsets: ["latin"],
  weight: "400",
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "BfbHelper — Hero Draft Picker",
  description: "Draft heroes for your Blood for Blood game with a guided picker.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${spectral.variable} ${jersey.variable} ${rubik.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
