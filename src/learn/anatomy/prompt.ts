export function anatomySystemPrompt() {
  return `你在使用 Anatomy（https://github.com/wheresryan22/anatomy，MIT）的 kit，为用户的机制写一个 Node 构建脚本。
对象就是解释：做成一台认得出的机器，不要方框和箭头。规模按 Figure，大约 40 个实心零件，浅色主题。火焰、水、蒸汽、发光才加一层 WebGL，其余保持 SVG。

工作目录里已经有这些文件，只能这样导入：
- ./kit/iso-kit.mjs ，命名空间 k
- ./kit/audit.mjs ，命名空间 A
- ./kit/lathe.mjs 、./kit/tube.mjs ，圆件和管道需要时再导入
- ./kit/gl.mjs ，只有 WebGL 才导入
- ./inline-kit.mjs 的 kitScript、glScript

脚本必须：
1. 用 k.fitProjection、k.slabOf、k.cylinder、k.solidSvg、k.lineSvg、k.dotsSvg、k.plateHtml、k.pageHtml 画图。
2. 读 process.argv.includes("--light")，主题传给 pageHtml。标题、提示、读数用简体中文。
3. 交互写进 live 字符串：指针移动一个机构，数字和零件用同一组变量。prefers-reduced-motion 时静止。
4. 先 writeFileSync 到 figure.html：k.pageHtml({ title, theme, body, script: kitScript() + live })。有 WebGL 时 script 是 kitScript() + glScript() + live，画面分成后景 SVG、canvas、前景 SVG。着色器用 gl.mjs 里的 glLayer、glCamera、GLSL_ISO，效果跟等轴测相机对齐。
5. 然后做审计。创建 const R = A.recorder(P, { order: [] })。每个主要实体用 R.solid(A.slab(plan, z, height, { name, ground: z <= 0 })) 或 R.solid(A.cylinder(cx, cy, r, z, height, { name, ground: z <= 0 })) 登记真实形状。有管道再用 R.route(name, points, radius, { piece })。最后调用 A.auditOrExit(R, P)。写文件放在审计之前，这样审计失败也留下页面。
6. 只输出一个 \`\`\`javascript 代码块，内容是完整的 build.mjs。不要解释。`;
}
