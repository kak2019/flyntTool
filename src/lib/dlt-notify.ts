import { checkDraws, fetchDltDraws } from "@/lib/dlt";
import { formatYuan, pad2, type DltHit } from "@/lib/dlt-match";
import { hitKey, listNotified, listTickets, markNotified } from "@/lib/dlt-store";
import { hasServerChan, scSend } from "@/lib/serverchan";

function hitLine(hit: DltHit): string {
  return `- ${hit.ticketName} ${hit.levelName} **${formatYuan(hit.amount)}**（前区中 ${hit.matchedFront.map(pad2).join(" ")}，后区中 ${hit.matchedBack.map(pad2).join(" ")}）`;
}

export async function notifyNewWins(force = false): Promise<{ sent: boolean; reason: string }> {
  if (!hasServerChan()) return { sent: false, reason: "没配 SendKey" };
  const tickets = await listTickets();
  if (!tickets.length) return { sent: false, reason: "还没存号码" };

  const draws = await fetchDltDraws(force);
  const latest = draws[0];
  if (!latest) return { sent: false, reason: "没有开奖" };

  const hits = checkDraws(tickets, [latest]);
  if (!hits.length) return { sent: false, reason: `第${latest.issue}期没中` };

  const keys = hits.map((hit) => hitKey(hit.issue, hit.ticketId));
  const already = new Set(await listNotified());
  const fresh = hits.filter((_, i) => !already.has(keys[i]));
  if (!fresh.length) return { sent: false, reason: "这期已经推过" };

  const total = fresh.reduce((sum, hit) => sum + hit.amount, 0);
  const title = `大乐透中奖 ${formatYuan(total)}，去兑奖`;
  const desp = [
    `第 **${latest.issue}** 期（${latest.date}）`,
    `开奖 ${latest.front.map(pad2).join(" ")} + ${latest.back.map(pad2).join(" ")}`,
    "",
    ...fresh.map(hitLine),
    "",
    `合计 **${formatYuan(total)}**`,
    latest.paidEnd ? `兑奖截止 ${latest.paidEnd}` : "",
    "1 万以下网点兑，1 万以上去体彩中心。",
  ]
    .filter(Boolean)
    .join("\n");

  await scSend(title, desp, `${fresh.length} 注，共 ${formatYuan(total)}`);
  await markNotified(keys);
  return { sent: true, reason: title };
}

export async function notifyTest(): Promise<void> {
  await scSend("大乐透推送已接通", "之后开奖中了会再发金额和兑奖截止日。", "测试推送");
}
