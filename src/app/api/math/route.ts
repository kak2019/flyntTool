import { NextRequest } from "next/server";
import { runMimoChat } from "@/app/api/mimo/route";
import { mathSystemPrompt } from "@/lib/math-skill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Incoming = {
  stream?: boolean;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Incoming;
  return runMimoChat(
    req,
    { ...body, thinking: false, search: false, stream: body.stream !== false },
    {
      system: mathSystemPrompt(),
      model: "mimo-v2.6-flash",
      search: false,
    },
  );
}
