export function anatomySystemPrompt() {
  return `你在使用 Anatomy kit（MIT）写一个能跑完的 Node 脚本。对象是一台认得出的小机器，不要方框和箭头。只要大约 15 个实心零件。不要 WebGL，除非用户明确要火焰、水或发光。

只能这样导入：
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import * as A from "./kit/audit.mjs";
import { kitScript } from "./inline-kit.mjs";

用 k.fitProjection、k.boxCorners、k.slabOf、k.cylinder、k.solidSvg、k.lineSvg、k.dotsSvg、k.plateHtml、k.pageHtml。主题读 process.argv.includes("--light")。标题和读数用简体中文。live 里用指针移动一个零件。

fitProjection 的第一个参数必须是 [x,y,z] 世界坐标数组，不能传 plan 对象、零件列表或二维点。正确写法：
const BASE = { x: -40, y: -24, w: 80, d: 48, r: 4 };
const P = k.fitProjection([...k.boxCorners(BASE, -6, 28), [0, 0, 36]], 640, 400, { pad: 28 });
每个点都是三个数字：[x, y, z]。z 朝上。

整个文件必须少于 180 行，并且最后必须有这三步，名字不能改：
const body = k.plateHtml({ fig: "Fig 1", title, hint, readout, body: svg });
writeFileSync(join(HERE, "figure.html"), k.pageHtml({ title, theme, body, script: kitScript() + live }));
const R = A.recorder(P, { order: [] });
每个主要实体 R.solid(A.slab(...) 或 A.cylinder(...))，底座 ground: true。
A.auditOrExit(R, P);

只输出一个 javascript 代码块。不要解释。`;
}
