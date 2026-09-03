# Flynt Tools

给自己用的网页工具箱，线上准备挂在 [https://tool.flynt.top](https://tool.flynt.top)。

第一期：RGB / Hex、快速翻译（Qwen MT Flash）、PDF 左右对照（按页翻译，不做 OCR）。

## 本地运行

需要 Node.js 20+。

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

- `SITE_PASSWORD`：打开网站用的密码
- `DASHSCOPE_API_KEY`：阿里云百炼 Key，翻译和 PDF 对照都靠它

```bash
npm install
npm run dev
```

浏览器打开 [http://localhost:3001](http://localhost:3001)。

## 加一个新工具

1. 新建 `src/app/(app)/tools/<id>/page.tsx`
2. 在 `src/lib/tools.ts` 的 `tools` 数组里加一条卡片

## 部署到 tool.flynt.top

应用默认跑在本机 `3001` 端口，避免和别的 Next 项目抢 `3000`。

1. 域名面板加一条：`tool.flynt.top` → 阿里云 ECS 公网 IP（A 记录）
2. 服务器上 clone 本仓库，复制 `.env.example` 为 `.env.local` 并填真实值
3. `npm install && npm run build`
4. `pm2 start npm --name flynt-tools -- start`
5. 把 `deploy/nginx-tool.flynt.top.conf` 放到 nginx 站点目录，按注释补证书
6. `certbot --nginx -d tool.flynt.top`（如果还没证书）
7. GitHub 仓库 Secrets 填 `SERVER_HOST` / `SERVER_USER` / `SERVER_SSH_KEY`，并把 workflow 里的服务器路径改成你的实际目录

推送到 `main` 后会 `git pull`、安装、构建、重启 pm2。
