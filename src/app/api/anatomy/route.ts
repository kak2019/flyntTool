import { NextRequest } from "next/server";
import { runMimoChat } from "@/app/api/mimo/route";
import { anatomySystemPrompt } from "@/learn/anatomy/prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODELS = new Set(["mimo-v2.6-flash", "mimo-v2.6-pro"]);

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { model?: string; stream?: boolean };
  const requested = String(body.model ?? "");
  const model = MODELS.has(requested) ? requested : "mimo-v2.6-flash";
  return runMimoChat(
    req,
    { ...body, thinking: false, search: false, stream: body.stream !== false },
    {
      system: anatomySystemPrompt(),
      model,
      search: false,
      maxCompletion: 8192,
    },
  );
}
