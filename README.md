# MinerU Official Web

轻量版 MinerU 官方接口工作台。

目标：

- 直接对接官方 `mineru-api`
- 不依赖第三方 `mineru-web` 的 Redis / Worker / MinIO 架构
- 页面完整映射官方 `/file_parse` 的核心参数
- 支持批量文件上传、系统配置、JSON 结果预览、ZIP 下载
- 当前不做持久化，任务结果仅保存在浏览器内存中

## 官方接口

官方 `api` profile 会启动 `mineru-api` 服务，默认端口是 `8000`。

```bash
docker compose -f compose.yaml --profile api up -d
```

页面默认按 `http://127.0.0.1:8000` 访问该接口，也可以在页面中改成其他地址。
如果官方接口未开启 CORS，需要你自行通过 nginx 等方式做反向代理后再访问。

## 启动

```bash
cd official-web
npm install
npm run dev
```

启动后前端地址：

- `http://127.0.0.1:5174`

## 生产构建

```bash
cd official-web
npm install
npm run build
npm run preview
```
