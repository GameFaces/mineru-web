# MinerU Official Web

轻量版 MinerU 官方接口工作台。

目标：

- 直接对接官方 `mineru-api`
- 不依赖第三方 `mineru-web` 的 Redis / Worker / MinIO 架构
- 页面完整映射官方 `/file_parse` 的核心参数
- 支持批量文件上传、系统配置、JSON 结果预览、ZIP 下载

## 官方接口

官方 `api` profile 会启动 `mineru-api` 服务，默认端口是 `8000`。

```bash
docker compose -f compose.yaml --profile api up -d
```

页面默认按 `http://127.0.0.1:8000` 访问该接口，也可以在页面中改成其他地址。

## 启动

```bash
cd official-web
npm install
npm run dev
```

启动后：

- 前端开发服务器: `http://127.0.0.1:5174`
- 本地代理服务: `http://127.0.0.1:8787`

## 生产构建

```bash
cd official-web
npm install
npm run build
npm start
```

`npm start` 会启动同一个 Node 服务，同时提供静态页面和 `/api/*` 代理。

## 可配环境变量

- `MINERU_API_BASE_URL`
  - 默认值: `http://127.0.0.1:8000`
  - 用于设置代理层默认转发目标

- `PORT`
  - 默认值: `8787`
  - Node 服务监听端口
