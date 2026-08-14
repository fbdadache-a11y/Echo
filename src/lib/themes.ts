/**
 * تعريف كل الثيمات المتاحة في التطبيق. كل ثيم يُطبَّق عبر
 * `data-theme="<id>"` على عنصر <html>، ويعتمد على متغيرات CSS
 * معرَّفة في theme-palettes.css. القيم هنا (preview) تُستخدم فقط
 * لرسم بطاقة المعاينة في قائمة اختيار الثيم — المصدر الحقيقي للألوان
 * الفعلية في الواجهة هو ملف CSS نفسه.
 *
 * كل الثيمات العشرة مأخوذة من قيمها الرسمية المنشورة (لا تقريب يدوي):
 * Nord (nordtheme.com) · Catppuccin Mocha/Latte (catppuccin.com) ·
 * Dracula (draculatheme.com) · Everforest Dark/Light (github/sainnhe) ·
 * Gruvbox Dark/Light (github/morhetz) · Solarized Light (ethanschoonover.com) ·
 * Rosé Pine Dawn (rosepinetheme.com).
 *
 * متوازنة عمداً: 5 ثيمات غامقة + 5 فاتحة.
 */
export interface ThemeDefinition {
  id: string;
  label: string;
  labelEn: string;
  /** فاتح أم غامق — يحدد أيقونة الشمس/القمر في البطاقة */
  mode: "light" | "dark";
  preview: {
    bg: string;
    surface: string;
    text: string;
    accent: string;
    accent2: string;
  };
}

export const THEMES: ThemeDefinition[] = [
  // ── فاتحة (5) ──────────────────────────────────────────
  {
    id: "rosepine-dawn",
    label: "الفجر",
    labelEn: "Rosé Pine Dawn",
    mode: "light",
    preview: { bg: "#faf4ed", surface: "#fffaf3", text: "#575279", accent: "#286983", accent2: "#907aa9" },
  },
  {
    id: "catppuccin-latte",
    label: "لاتيه",
    labelEn: "Catppuccin Latte",
    mode: "light",
    preview: { bg: "#eff1f5", surface: "#ffffff", text: "#4c4f69", accent: "#8839ef", accent2: "#1e66f5" },
  },
  {
    id: "everforest-light",
    label: "الغابة الفاتحة",
    labelEn: "Everforest Light",
    mode: "light",
    preview: { bg: "#fdf6e3", surface: "#f4f0d9", text: "#5c6a72", accent: "#8da101", accent2: "#3a94c5" },
  },
  {
    id: "gruvbox-light",
    label: "غروفبوكس فاتح",
    labelEn: "Gruvbox Light",
    mode: "light",
    preview: { bg: "#fbf1c7", surface: "#ebdbb2", text: "#3c3836", accent: "#b57614", accent2: "#79740e" },
  },
  {
    id: "solarized",
    label: "سولارايزد",
    labelEn: "Solarized Light",
    mode: "light",
    preview: { bg: "#fdf6e3", surface: "#eee8d5", text: "#657b83", accent: "#268bd2", accent2: "#859900" },
  },

  // ── غامقة (5) ──────────────────────────────────────────
  {
    id: "nord",
    label: "الشمال",
    labelEn: "Nord",
    mode: "dark",
    preview: { bg: "#2e3440", surface: "#3b4252", text: "#eceff4", accent: "#88c0d0", accent2: "#5e81ac" },
  },
  {
    id: "catppuccin-mocha",
    label: "موكا",
    labelEn: "Catppuccin Mocha",
    mode: "dark",
    preview: { bg: "#1e1e2e", surface: "#313244", text: "#cdd6f4", accent: "#cba6f7", accent2: "#89b4fa" },
  },
  {
    id: "dracula",
    label: "دراكولا",
    labelEn: "Dracula",
    mode: "dark",
    preview: { bg: "#282a36", surface: "#44475a", text: "#f8f8f2", accent: "#bd93f9", accent2: "#ff79c6" },
  },
  {
    id: "everforest-dark",
    label: "الغابة الداكنة",
    labelEn: "Everforest Dark",
    mode: "dark",
    preview: { bg: "#2d353b", surface: "#343f44", text: "#d3c6aa", accent: "#a7c080", accent2: "#7fbbb3" },
  },
  {
    id: "gruvbox-dark",
    label: "غروفبوكس داكن",
    labelEn: "Gruvbox Dark",
    mode: "dark",
    preview: { bg: "#282828", surface: "#3c3836", text: "#ebdbb2", accent: "#d79921", accent2: "#458588" },
  },
];

export const DEFAULT_THEME_ID = "rosepine-dawn";
