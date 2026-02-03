const clamp = (value, min = 0, max = 255) => Math.min(max, Math.max(min, value));

export const hexToRgb = (hex) => {
  if (!hex) return { r: 0, g: 0, b: 0 };
  const cleaned = hex.replace("#", "").trim();
  if (cleaned.length === 3) {
    const [r, g, b] = cleaned.split("");
    return {
      r: parseInt(r + r, 16),
      g: parseInt(g + g, 16),
      b: parseInt(b + b, 16)
    };
  }
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16)
  };
};

export const rgbToHex = ({ r, g, b }) => {
  const toHex = (val) => clamp(Math.round(val)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const mix = (a, b, amount = 0.5) => ({
  r: a.r + (b.r - a.r) * amount,
  g: a.g + (b.g - a.g) * amount,
  b: a.b + (b.b - a.b) * amount
});

export const rgba = (rgb, alpha) =>
  `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;

export const luminance = (rgb) => {
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
};

export const deriveTheme = ({ primary, accent, background }) => {
  const bgRgb = hexToRgb(background);
  const accentRgb = hexToRgb(accent);
  const baseDark = luminance(bgRgb) < 0.45;

  const buttonSolidRgb = mix(
    bgRgb,
    baseDark ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 },
    baseDark ? 0.12 : 0.08
  );

  const panelBase = mix(bgRgb, baseDark ? { r: 255, g: 255, b: 255 } : { r: 255, g: 255, b: 255 },
    baseDark ? 0.08 : 0.45
  );
  const panelDeepBase = mix(bgRgb, baseDark ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 },
    baseDark ? 0.1 : 0.18
  );

  return {
    primary,
    accent,
    background,
    isDark: baseDark,
    text: baseDark ? "#f5f7fb" : "#1f232c",
    muted: baseDark ? "rgba(245, 247, 251, 0.68)" : "rgba(31, 35, 44, 0.62)",
    border: baseDark ? "rgba(245, 247, 251, 0.18)" : "rgba(31, 35, 44, 0.12)",
    panel: rgba(panelBase, baseDark ? 0.72 : 0.85),
    panelStrong: rgba(panelBase, baseDark ? 0.82 : 0.92),
    panelDeep: rgba(panelDeepBase, baseDark ? 0.88 : 0.95),
    accentSoft: rgba(accentRgb, baseDark ? 0.2 : 0.18),
    glow: rgba(accentRgb, baseDark ? 0.45 : 0.35),
    buttonSolid: rgbToHex(buttonSolidRgb)
  };
};
