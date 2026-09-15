import { NextResponse } from "next/server";
import { getOssConfig, getOssObject } from "@/lib/oss";

export async function GET() {
  const config = getOssConfig();
  if (!config) {
    return NextResponse.json({ error: "未配置 OSS" }, { status: 500 });
  }
  const object = await getOssObject(config);
  if (!object) {
    return NextResponse.json({ error: "没有文件" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(object.bytes), {
    headers: {
      "Content-Type": object.contentType || "image/jpeg",
      "Cache-Control": "no-store",
    },
  });
}
