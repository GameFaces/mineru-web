import express from 'express'
import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

const port = Number(process.env.PORT || 8787)
const defaultMineruApiBaseUrl =
  process.env.MINERU_API_BASE_URL || 'http://127.0.0.1:8000'

function isValidHttpUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

function getMineruApiBaseUrl(input) {
  const candidate = input || defaultMineruApiBaseUrl
  if (!isValidHttpUrl(candidate)) {
    throw new Error(`Invalid MinerU API URL: ${candidate}`)
  }
  return candidate.replace(/\/$/, '')
}

function normalizeList(value, fallback = []) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(','))
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return fallback
}

function normalizeBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'boolean') return value
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

function normalizeInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

async function fetchOpenApi(baseUrl) {
  const response = await fetch(`${baseUrl}/openapi.json`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}

app.get('/api/meta', async (req, res) => {
  let baseUrl
  try {
    baseUrl = getMineruApiBaseUrl(req.query.api_base_url)
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error.message,
      apiBaseUrl: req.query.api_base_url || defaultMineruApiBaseUrl
    })
  }

  try {
    const openapi = await fetchOpenApi(baseUrl)
    res.json({
      ok: true,
      apiBaseUrl: baseUrl,
      title: openapi.info?.title || 'MinerU API',
      version: openapi.info?.version || '',
      hasFileParse: Boolean(openapi.paths?.['/file_parse']?.post)
    })
  } catch (error) {
    res.status(502).json({
      ok: false,
      apiBaseUrl: baseUrl,
      error: `Failed to reach MinerU API: ${error.message}`
    })
  }
})

app.post('/api/file-parse', upload.array('files'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' })
  }

  let baseUrl
  try {
    baseUrl = getMineruApiBaseUrl(req.body.api_base_url)
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }

  const form = new FormData()

  for (const file of req.files) {
    const blob = new Blob([file.buffer], {
      type: file.mimetype || 'application/octet-stream'
    })
    form.append('files', blob, file.originalname)
  }

  const langList = normalizeList(req.body.lang_list, ['ch'])
  for (const lang of langList) {
    form.append('lang_list', lang)
  }

  const textFields = {
    output_dir: req.body.output_dir || './output',
    backend: req.body.backend || 'hybrid-auto-engine',
    parse_method: req.body.parse_method || 'auto',
    server_url: req.body.server_url || '',
    start_page_id: String(normalizeInteger(req.body.start_page_id, 0)),
    end_page_id: String(normalizeInteger(req.body.end_page_id, 99999))
  }

  for (const [key, value] of Object.entries(textFields)) {
    if (value !== '') {
      form.append(key, value)
    }
  }

  const booleanFields = {
    formula_enable: normalizeBoolean(req.body.formula_enable, true),
    table_enable: normalizeBoolean(req.body.table_enable, true),
    return_md: normalizeBoolean(req.body.return_md, true),
    return_middle_json: normalizeBoolean(req.body.return_middle_json, false),
    return_model_output: normalizeBoolean(req.body.return_model_output, false),
    return_content_list: normalizeBoolean(req.body.return_content_list, false),
    return_images: normalizeBoolean(req.body.return_images, false),
    response_format_zip: normalizeBoolean(req.body.response_format_zip, false)
  }

  for (const [key, value] of Object.entries(booleanFields)) {
    form.append(key, String(value))
  }

  try {
    const upstream = await fetch(`${baseUrl}/file_parse`, {
      method: 'POST',
      body: form
    })

    const contentType = upstream.headers.get('content-type') || ''

    if (contentType.includes('application/zip')) {
      const buffer = Buffer.from(await upstream.arrayBuffer())
      res.status(upstream.status)
      res.setHeader('Content-Type', 'application/zip')
      res.setHeader(
        'Content-Disposition',
        upstream.headers.get('content-disposition') ||
          'attachment; filename="results.zip"'
      )
      return res.send(buffer)
    }

    const payload = await upstream
      .json()
      .catch(() => ({ error: 'MinerU API returned invalid JSON.' }))
    return res.status(upstream.status).json(payload)
  } catch (error) {
    return res.status(502).json({
      error: `Failed to call MinerU API: ${error.message}`
    })
  }
})

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(port, '0.0.0.0', () => {
  console.log(`MinerU Official Web proxy running at http://0.0.0.0:${port}`)
  console.log(`Proxy target default: ${defaultMineruApiBaseUrl}`)
})
