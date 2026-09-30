/** Flatten floating patent callouts onto their drawings. Browser-only. */

import JSZip from "jszip";

const TWIP_TO_EMU = 635;
const PX_PER_EMU = 96 / 914400;
const SCALE = 2;

export type FlattenProgress = (message: string) => void;

export type FlattenResult = {
  blob: Blob;
  fileName: string;
  previews: { label: string; url: string }[];
  flattened: number;
  skipped: number;
};

type Overlay = {
  x: number;
  y: number;
  cx: number;
  cy: number;
  kind: "line" | "text" | "brace" | "ellipse";
  text: string;
  fontPt: number;
  flipH: boolean;
  flipV: boolean;
  strokeEmu: number;
  geom: string;
  color: string;
  bold: boolean;
  textAnchor: "middle" | "top";
};

type InlinePic = {
  start: number;
  end: number;
  xml: string;
  embed: string;
  cx: number;
  cy: number;
  centered: boolean;
};

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function findBlocks(xml: string, startTag: string, endTag: string) {
  const blocks: { start: number; end: number; xml: string }[] = [];
  let i = 0;
  while (i < xml.length) {
    const start = xml.indexOf(startTag, i);
    if (start < 0) break;
    const close = xml.indexOf(endTag, start);
    if (close < 0) break;
    const end = close + endTag.length;
    blocks.push({ start, end, xml: xml.slice(start, end) });
    i = end;
  }
  return blocks;
}

function attr(xml: string, name: string) {
  const m = xml.match(new RegExp(`${name}="([^"]+)"`));
  return m?.[1] ?? "";
}

function intAttr(xml: string, name: string) {
  const v = attr(xml, name);
  return v ? Number(v) : 0;
}

function firstMatch(xml: string, re: RegExp) {
  return xml.match(re)?.[1] ?? "";
}

function parsePage(xml: string) {
  const sz = xml.match(/<w:pgSz\b[^>]*>/);
  const mar = xml.match(/<w:pgMar\b[^>]*>/);
  const pageW = sz ? intAttr(sz[0], "w:w") * TWIP_TO_EMU : 11906 * TWIP_TO_EMU;
  const left = mar ? intAttr(mar[0], "w:left") * TWIP_TO_EMU : 1526 * TWIP_TO_EMU;
  const right = mar ? intAttr(mar[0], "w:right") * TWIP_TO_EMU : 965 * TWIP_TO_EMU;
  const top = mar ? intAttr(mar[0], "w:top") * TWIP_TO_EMU : 1440 * TWIP_TO_EMU;
  return { contentW: Math.max(pageW - left - right, 1), left, top };
}

function enclosingParagraph(xml: string, at: number) {
  let from = at;
  while (from > 0) {
    const spaced = xml.lastIndexOf("<w:p ", from - 1);
    const plain = xml.lastIndexOf("<w:p>", from - 1);
    const p = Math.max(spaced, plain);
    if (p < 0) return -1;
    const openBox = xml.lastIndexOf("<w:txbxContent", p);
    const closeBox = xml.lastIndexOf("</w:txbxContent>", p);
    if (openBox > closeBox) {
      from = p;
      continue;
    }
    return p;
  }
  return -1;
}

function paragraphCentered(xml: string, at: number) {
  const p = enclosingParagraph(xml, at);
  if (p < 0) return false;
  const pPr = xml.indexOf("<w:pPr", p);
  const run = xml.indexOf("<w:r", p);
  if (pPr < 0 || (run >= 0 && pPr > run)) return false;
  const pPrClose = xml.indexOf("</w:pPr>", pPr);
  if (pPrClose < 0) return false;
  return /<w:jc w:val="center"/.test(xml.slice(pPr, pPrClose));
}

function parseInlines(xml: string): InlinePic[] {
  return findBlocks(xml, "<wp:inline", "</wp:inline>")
    .map((block) => {
      const embed = firstMatch(block.xml, /r:embed="([^"]+)"/);
      const cx = Number(firstMatch(block.xml, /<wp:extent [^>]*cx="(-?\d+)"/) || firstMatch(block.xml, /cx="(-?\d+)"/));
      const cy = Number(firstMatch(block.xml, /<wp:extent [^>]*cy="(-?\d+)"/) || 0);
      if (!embed || !cx || !cy) return null;
      return {
        start: block.start,
        end: block.end,
        xml: block.xml,
        embed,
        cx,
        cy,
        centered: paragraphCentered(xml, block.start),
      } satisfies InlinePic;
    })
    .filter((x): x is InlinePic => Boolean(x));
}

function choiceXml(xml: string) {
  return xml.match(/<mc:Choice\b[\s\S]*?<\/mc:Choice>/)?.[0] ?? xml;
}

function overlayText(xml: string) {
  const box = xml.match(/<w:txbxContent>[\s\S]*?<\/w:txbxContent>/)?.[0] ?? xml;
  return [...box.matchAll(/<w:t\b[^>]*>([^<]*)<\/w:t>/g)]
    .map((m) => decodeXml(m[1]))
    .join("")
    .replace(/\s+/g, "")
    .trim();
}

function parseOverlay(raw: string): Overlay | null {
  const xml = choiceXml(raw);
  const x = Number(firstMatch(xml, /<wp:positionH[\s\S]*?<wp:posOffset>(-?\d+)/) || 0);
  const y = Number(firstMatch(xml, /<wp:positionV[\s\S]*?<wp:posOffset>(-?\d+)/) || 0);
  const cx = Number(firstMatch(xml, /<wp:extent [^>]*cx="(-?\d+)"/) || 0);
  const cy = Number(firstMatch(xml, /<wp:extent [^>]*cy="(-?\d+)"/) || 0);
  if (!cx && !cy) return null;

  const geom = firstMatch(xml, /<a:prstGeom prst="([^"]+)"/) || "";
  const isLine = geom === "line" || /name="[^"]*Connector/i.test(xml);
  const isBrace = geom === "rightBrace" || geom === "leftBrace";
  const text = overlayText(xml);
  if (!isLine && !isBrace && !text) return null;

  const sz = Number(firstMatch(xml, /w:sz w:val="(\d+)"/) || "24");
  const xfrm = xml.match(/<a:xfrm\b[^>]*>/)?.[0] ?? "";
  return {
    x,
    y,
    cx,
    cy,
    kind: isBrace ? "brace" : isLine ? "line" : "text",
    text,
    fontPt: sz / 2,
    flipH: /flipH="1"/.test(xfrm),
    flipV: /flipV="1"/.test(xfrm),
    strokeEmu: Number(firstMatch(xml, /<a:ln w="(\d+)"/) || "6350"),
    geom,
    color: "#111",
    bold: false,
    textAnchor: "middle",
  };
}

const PT_TO_EMU = 12700;

function styleValue(style: string, key: string) {
  return style.match(new RegExp(`(?:^|;)${key}:([^;]+)`))?.[1]?.trim() ?? "";
}

function ptToEmu(raw: string) {
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? Math.round(n * PT_TO_EMU) : 0;
}

function cssColor(value: string) {
  const v = value.trim().toLowerCase();
  if (!v) return "";
  if (v === "red") return "#ff0000";
  if (/^[0-9a-f]{6}$/.test(v)) return `#${v}`;
  if (/^#[0-9a-f]{3,8}$/.test(v)) return v;
  return "";
}

function findShapes(xml: string) {
  const blocks: string[] = [];
  const re = /<v:(shape|oval|rect|roundrect)\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) {
    const tag = match[1];
    const gt = xml.indexOf(">", match.index);
    if (gt < 0) break;
    if (xml[gt - 1] === "/") {
      blocks.push(xml.slice(match.index, gt + 1));
      re.lastIndex = gt + 1;
      continue;
    }
    const close = xml.indexOf(`</v:${tag}>`, gt);
    if (close < 0) break;
    const end = close + `</v:${tag}>`.length;
    blocks.push(xml.slice(match.index, end));
    re.lastIndex = end;
  }
  return blocks;
}

/** Legacy w:pict callouts. Omitted origin means column / paragraph, same as Word. */
function parseVmlPict(raw: string, pageLeft: number, pageTop: number): Overlay[] {
  const overlays: Overlay[] = [];
  for (const shape of findShapes(raw)) {
    const open = shape.slice(0, shape.indexOf(">"));
    const style = firstMatch(open, /\bstyle="([^"]*)"/);
    const hRel = styleValue(style, "mso-position-horizontal-relative");
    const vRel = styleValue(style, "mso-position-vertical-relative");
    const cx = ptToEmu(styleValue(style, "width"));
    const cy = ptToEmu(styleValue(style, "height"));
    if (!cx && !cy) continue;

    let x = ptToEmu(styleValue(style, "margin-left"));
    let y = ptToEmu(styleValue(style, "margin-top"));
    if (hRel === "page") x -= pageLeft;
    if (vRel === "page") y -= pageTop;

    const text = overlayText(shape);
    const isOval = /^<v:oval\b/.test(shape);
    if (!text && !isOval) continue;

    const stroked = !/\bstroked="f"/.test(open);
    const color =
      cssColor(firstMatch(open, /\bstrokecolor="([^"]+)"/)) ||
      cssColor(firstMatch(shape, /<w:color w:val="([^"]+)"/)) ||
      "#111";
    const sz = Number(firstMatch(shape, /w:sz w:val="(\d+)"/) || "24");
    const weight = firstMatch(open, /\bstrokeweight="([^"]+)"/) || styleValue(style, "strokeweight");
    overlays.push({
      x,
      y,
      cx,
      cy,
      kind: isOval ? "ellipse" : "text",
      text,
      fontPt: sz / 2,
      flipH: false,
      flipV: false,
      strokeEmu: weight ? ptToEmu(weight) : 9525,
      geom: isOval ? "ellipse" : "rect",
      color: text && !isOval ? cssColor(firstMatch(shape, /<w:color w:val="([^"]+)"/)) || color : color,
      bold: /<w:b\/>/.test(shape) || /<w:b\s[^>]*w:val="(?:1|true|on)"/.test(shape),
      textAnchor: "top",
    });
    if (!stroked && isOval) overlays.pop();
  }
  return overlays;
}

function nextRelId(rels: string) {
  let max = 0;
  for (const m of rels.matchAll(/Id="rId(\d+)"/g)) {
    max = Math.max(max, Number(m[1]));
  }
  return `rId${max + 1}`;
}

function loadImage(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], { type: "image/png" });
  return createImageBitmap(blob);
}

function drawBrace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pointRight: boolean,
  lineWidth: number,
) {
  const back = pointRight ? x : x + w;
  const depth = pointRight ? w : -w;
  const mid = y + h / 2;
  ctx.save();
  ctx.lineWidth = Math.max(1.2, lineWidth);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(back, y);
  ctx.bezierCurveTo(back + depth, y, back, mid, back + depth, mid);
  ctx.bezierCurveTo(back, mid, back + depth, y + h, back, y + h);
  ctx.stroke();
  ctx.restore();
}

async function composite(pic: ImageBitmap, picX: number, picY: number, picCx: number, picCy: number, overlays: Overlay[]) {
  const rects = [
    { x: picX, y: picY, cx: picCx, cy: picCy },
    ...overlays,
  ];
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.cx));
  const maxY = Math.max(...rects.map((r) => r.y + r.cy));
  const pad = 80000;
  const widthEmu = Math.max(maxX - minX + pad * 2, picCx);
  const heightEmu = Math.max(maxY - minY + pad * 2, picCy);
  const width = Math.max(1, Math.round(widthEmu * PX_PER_EMU * SCALE));
  const height = Math.max(1, Math.round(heightEmu * PX_PER_EMU * SCALE));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建画布");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  const toX = (emu: number) => ((emu - minX + pad) * PX_PER_EMU * SCALE);
  const toY = (emu: number) => ((emu - minY + pad) * PX_PER_EMU * SCALE);
  const toS = (emu: number) => emu * PX_PER_EMU * SCALE;

  ctx.drawImage(pic, toX(picX), toY(picY), toS(picCx), toS(picCy));

  ctx.lineCap = "round";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const ov of overlays) {
    ctx.strokeStyle = ov.color;
    ctx.fillStyle = ov.color;
    if (ov.kind === "ellipse") {
      ctx.lineWidth = Math.max(1.25, toS(ov.strokeEmu));
      ctx.beginPath();
      ctx.ellipse(
        toX(ov.x + ov.cx / 2),
        toY(ov.y + ov.cy / 2),
        Math.max(1, toS(ov.cx) / 2),
        Math.max(1, toS(ov.cy) / 2),
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      continue;
    }
    if (ov.kind === "brace") {
      ctx.strokeStyle = "#111";
      const pointRight = ov.geom === "rightBrace" ? !ov.flipH : ov.flipH;
      drawBrace(
        ctx,
        toX(ov.x),
        toY(ov.y),
        Math.max(2, toS(ov.cx)),
        Math.max(8, toS(ov.cy)),
        pointRight,
        Math.max(1.2, toS(Math.min(ov.strokeEmu, ov.cx * 0.18))),
      );
      continue;
    }
    if (ov.kind === "line") {
      ctx.strokeStyle = "#111";
      const x1 = toX(ov.x + (ov.flipH ? ov.cx : 0));
      const y1 = toY(ov.y + (ov.flipV ? ov.cy : 0));
      const x2 = toX(ov.x + (ov.flipH ? 0 : ov.cx));
      const y2 = toY(ov.y + (ov.flipV ? 0 : ov.cy));
      ctx.lineWidth = Math.max(1, toS(ov.strokeEmu));
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      continue;
    }
    const fontPx = Math.max(11, ov.fontPt * (96 / 72) * SCALE);
    ctx.font = `${ov.bold ? "bold " : ""}${fontPx}px SimSun, "Microsoft YaHei", Tahoma, Arial, sans-serif`;
    const textX = toX(ov.x + ov.cx / 2);
    if (ov.textAnchor === "top") {
      ctx.textBaseline = "top";
      ctx.fillText(ov.text, textX, toY(ov.y) + fontPx * 0.2);
      ctx.textBaseline = "middle";
    } else {
      ctx.fillText(ov.text, textX, toY(ov.y + ov.cy / 2));
    }
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("导出图片失败"))), "image/png");
  });
  const url = URL.createObjectURL(blob);
  return { blob, url, widthEmu, heightEmu };
}

function replaceOnce(haystack: string, start: number, end: number, insert: string) {
  return haystack.slice(0, start) + insert + haystack.slice(end);
}

export async function flattenPatentFigures(file: File, onProgress: FlattenProgress = () => undefined): Promise<FlattenResult> {
  onProgress("正在读取 Word…");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const docFile = zip.file("word/document.xml");
  const relsFile = zip.file("word/_rels/document.xml.rels");
  if (!docFile || !relsFile) throw new Error("不是有效的 .docx（缺少 document.xml）");

  let xml = await docFile.async("string");
  let rels = await relsFile.async("string");
  const { contentW, left, top } = parsePage(xml);

  const relMap = new Map<string, string>();
  for (const m of rels.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    relMap.set(m[1], m[2].replace(/\\/g, "/"));
  }

  const inlines = parseInlines(xml);
  if (inlines.length === 0) throw new Error("文档里没有嵌入图片。");

  const alts = findBlocks(xml, "<mc:AlternateContent>", "</mc:AlternateContent>");
  const picts = findBlocks(xml, "<w:pict", "</w:pict>");
  onProgress(`找到 ${inlines.length} 张图，${alts.length + picts.length} 个浮动对象`);

  const previews: { label: string; url: string }[] = [];
  const removals: { start: number; end: number }[] = [];
  const inlinePatches: { start: number; end: number; xml: string }[] = [];
  let flattened = 0;
  let skipped = 0;

  for (let i = 0; i < inlines.length; i++) {
    const pic = inlines[i];
    const prevEnd = i === 0 ? 0 : inlines[i - 1].end;
    const owned = alts.filter((a) => a.start >= prevEnd && a.end <= pic.start);
    const vmlOwned = picts
      .filter((a) => a.start >= prevEnd && a.end <= pic.start)
      .map((block) => ({ block, overlays: parseVmlPict(block.xml, left, top) }))
      .filter((item) => item.overlays.length > 0);
    const overlays = [
      ...owned.map((a) => parseOverlay(a.xml)).filter((x): x is Overlay => Boolean(x)),
      ...vmlOwned.flatMap((item) => item.overlays),
    ];

    if (overlays.length === 0) {
      skipped += 1;
      continue;
    }

    const target = relMap.get(pic.embed);
    if (!target) {
      skipped += 1;
      continue;
    }
    const mediaPath = target.startsWith("word/") ? target : `word/${target}`;
    const media = zip.file(mediaPath);
    if (!media) {
      skipped += 1;
      continue;
    }

    onProgress(`正在合成第 ${i + 1} / ${inlines.length} 张图（${overlays.length} 个标号/引线）`);
    const image = await loadImage(await media.async("uint8array"));
    // DrawingML callouts are column-relative and those pictures sit in the center
    // of the column. Legacy VML uses the same column, and follows the paragraph
    // alignment: a centered picture starts at (contentW - width) / 2.
    const picX =
      vmlOwned.length > 0 && owned.length === 0 && !pic.centered
        ? 0
        : Math.max(0, (contentW - pic.cx) / 2);
    const picY = 0;
    const out = await composite(image, picX, picY, pic.cx, pic.cy, overlays);
    image.close();

    const newName = `media/flat-${String(i + 1).padStart(2, "0")}.png`;
    zip.file(`word/${newName}`, await out.blob.arrayBuffer());
    const rid = nextRelId(rels);
    rels = rels.replace(
      "</Relationships>",
      `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${newName}"/></Relationships>`,
    );
    relMap.set(rid, newName);

    const nextXml = pic.xml
      .replace(/r:embed="[^"]+"/, `r:embed="${rid}"`)
      .replace(/<wp:extent cx="\d+" cy="\d+"/, `<wp:extent cx="${Math.round(out.widthEmu)}" cy="${Math.round(out.heightEmu)}"`)
      .replace(/<a:ext cx="\d+" cy="\d+"/, `<a:ext cx="${Math.round(out.widthEmu)}" cy="${Math.round(out.heightEmu)}"`);
    inlinePatches.push({ start: pic.start, end: pic.end, xml: nextXml });
    for (const a of owned) removals.push({ start: a.start, end: a.end });
    for (const item of vmlOwned) removals.push({ start: item.block.start, end: item.block.end });
    previews.push({ label: `图 ${i + 1}`, url: out.url });
    flattened += 1;
  }

  onProgress("正在写回 Word…");
  const edits = [
    ...removals.map((r) => ({ ...r, xml: "" })),
    ...inlinePatches,
  ].sort((a, b) => b.start - a.start);
  for (const edit of edits) {
    xml = replaceOnce(xml, edit.start, edit.end, edit.xml);
  }

  zip.file("word/document.xml", xml);
  zip.file("word/_rels/document.xml.rels", rels);
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
  });
  const base = file.name.replace(/\.docx$/i, "");
  return {
    blob,
    fileName: `${base}-embedded.docx`,
    previews,
    flattened,
    skipped,
  };
}
