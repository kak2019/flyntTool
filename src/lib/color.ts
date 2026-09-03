export function clampByte(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((n) => clampByte(n).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const s = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return {
      r: parseInt(s[0] + s[0], 16),
      g: parseInt(s[1] + s[1], 16),
      b: parseInt(s[2] + s[2], 16),
    };
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) {
    return {
      r: parseInt(s.slice(0, 2), 16),
      g: parseInt(s.slice(2, 4), 16),
      b: parseInt(s.slice(4, 6), 16),
    };
  }
  return null;
}

export function parseColor(
  input: string,
): { r: number; g: number; b: number } | null {
  const s = input.trim();
  if (!s) return null;

  const fromHex = hexToRgb(s);
  if (fromHex) return fromHex;

  const rgbFn = s.match(
    /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/i,
  );
  if (rgbFn) {
    return {
      r: clampByte(Number(rgbFn[1])),
      g: clampByte(Number(rgbFn[2])),
      b: clampByte(Number(rgbFn[3])),
    };
  }

  const parts = s.split(/[\s,;/]+/).filter(Boolean);
  if (parts.length === 3 && parts.every((p) => /^\d+(\.\d+)?$/.test(p))) {
    return {
      r: clampByte(Number(parts[0])),
      g: clampByte(Number(parts[1])),
      b: clampByte(Number(parts[2])),
    };
  }

  return null;
}
