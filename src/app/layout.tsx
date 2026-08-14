import type { Metadata } from "next";
import { DM_Sans, Fraunces, Alexandria, Rouge_Script } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dmsans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  style: ["normal", "italic"],
});

const alexandria = Alexandria({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-alexandria",
  display: "swap",
});

/**
 * خط "Rouge Script" — مرسوم أصلاً بقلم النقش النحاسي (copperplate nib)،
 * وهي التقنية الفعلية التي شكّلت خط اليد الفرنسي الرسمي (Ronde/Anglaise)
 * في القرن الـ19. يُستخدم حصراً لاسم "Echo" في صفحة الهبوط.
 */
const rougeScript = Rouge_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-rouge",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Echo — Econovo Club",
  description: "مساحة الدردشة والمجموعات لمجتمع Econovo",
};

const THEME_IDS = [
  "rosepine-dawn", "catppuccin-latte", "everforest-light", "gruvbox-light", "solarized",
  "nord", "catppuccin-mocha", "dracula", "everforest-dark", "gruvbox-dark",
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${fraunces.variable} ${alexandria.variable} ${rougeScript.variable}`}>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="rosepine-dawn"
          themes={THEME_IDS}
          enableSystem={false}
        >
          {children}
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: "var(--card)",
                color: "var(--card-foreground)",
                border: "1px solid var(--border)",
                borderRadius: "0.875rem",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
