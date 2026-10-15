export const MAX_SCRIPT = 80_000;

export function extractBuildScript(text: string) {
  const fence = text.match(/```(?:javascript|js|mjs)?\s*([\s\S]*?)```/i);
  const code = (fence ? fence[1] : text).trim();
  if (!code.includes("figure.html") || !code.includes("pageHtml")) return "";
  return code.slice(0, MAX_SCRIPT);
}
