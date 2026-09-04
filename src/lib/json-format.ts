export function prettyJson(input: string, indent = 2): { ok: true; text: string } | { ok: false; error: string } {
  try {
    const value = JSON.parse(input);
    return { ok: true, text: JSON.stringify(value, null, indent) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "不是合法 JSON" };
  }
}

export function minifyJson(input: string): { ok: true; text: string } | { ok: false; error: string } {
  try {
    const value = JSON.parse(input);
    return { ok: true, text: JSON.stringify(value) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "不是合法 JSON" };
  }
}
