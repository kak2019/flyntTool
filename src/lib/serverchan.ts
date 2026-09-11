type ScResult = { code?: number | string; message?: string; errmsg?: string };

function sendUrl(sendkey: string): string {
  const key = sendkey.trim();
  if (/^sctp/i.test(key)) {
    const uid = key.match(/^sctp(\d+)t/i)?.[1];
    if (!uid) throw new Error("Server酱³ SendKey 格式不对");
    return `https://${uid}.push.ft07.com/send/${key}.send`;
  }
  return `https://sctapi.ftqq.com/${key}.send`;
}

function keys(): string[] {
  return [process.env.SERVERCHAN_SENDKEY_SC3, process.env.SERVERCHAN_SENDKEY]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));
}

export function hasServerChan(): boolean {
  return keys().length > 0;
}

export async function scSend(title: string, desp: string, short?: string): Promise<void> {
  const list = keys();
  if (!list.length) throw new Error("没配 Server酱 SendKey");

  const errors: string[] = [];
  for (const key of list) {
    const isSc3 = /^sctp/i.test(key);
    const body: Record<string, string> = { title, desp };
    if (short) body.short = short;
    if (isSc3) body.tags = "大乐透";
    try {
      const res = await fetch(sendUrl(key), {
        method: "POST",
        headers: { "content-type": "application/json;charset=utf-8" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as ScResult;
      const code = json.code;
      if (!res.ok || (code !== undefined && code !== 0 && code !== "0")) {
        errors.push(json.message || json.errmsg || `推送失败 ${res.status}`);
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "推送失败");
    }
  }
  if (errors.length === list.length) throw new Error(errors[0] || "推送失败");
}
