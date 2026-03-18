<template>
  <div class="page-shell">
    <header class="hero">
      <div>
        <p class="eyebrow">MinerU Official API Workbench</p>
        <h1>轻量前端，直接映射官方 `mineru-api` 参数</h1>
        <p class="hero-copy">
          面向 `docker compose -f compose.yaml --profile api up -d` 启动的官方接口。
          页面负责批量上传、解析参数配置、结果预览与 ZIP 下载，不引入第三方任务系统。
        </p>
      </div>
      <div class="hero-actions">
        <button class="primary-btn" @click="checkServer" :disabled="checkingServer">
          {{ checkingServer ? '检测中...' : '检测官方 API' }}
        </button>
        <div class="status-pill" :class="serverMeta.ok ? 'status-ok' : 'status-warn'">
          <span>{{ serverMeta.ok ? '接口可用' : '待确认' }}</span>
          <small>{{ serverMeta.apiBaseUrl }}</small>
        </div>
      </div>
    </header>

    <main class="grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="section-kicker">System Config</p>
            <h2>官方接口与解析参数</h2>
          </div>
          <div class="inline-actions">
            <button class="ghost-btn" @click="resetSettings">恢复默认</button>
            <button class="primary-btn" @click="persistSettings">保存配置</button>
          </div>
        </div>

        <div class="form-grid">
          <label class="field span-2">
            <span>MinerU API 地址</span>
            <input v-model.trim="settings.apiBaseUrl" placeholder="http://127.0.0.1:8000" />
          </label>

          <label class="field">
            <span>后端模式</span>
            <select v-model="settings.backend">
              <option value="pipeline">pipeline</option>
              <option value="vlm-auto-engine">vlm-auto-engine</option>
              <option value="vlm-http-client">vlm-http-client</option>
              <option value="hybrid-auto-engine">hybrid-auto-engine</option>
              <option value="hybrid-http-client">hybrid-http-client</option>
            </select>
          </label>

          <label class="field">
            <span>解析方法</span>
            <select v-model="settings.parseMethod">
              <option value="auto">auto</option>
              <option value="txt">txt</option>
              <option value="ocr">ocr</option>
            </select>
          </label>

          <label class="field span-2">
            <span>语言列表</span>
            <input v-model.trim="settings.langListText" placeholder="ch 或 ch,en" />
          </label>

          <label class="field span-2">
            <span>远端 VLM Server URL</span>
            <input
              v-model.trim="settings.serverUrl"
              placeholder="http://127.0.0.1:30000，仅 -http-client 模式需要"
            />
          </label>

          <label class="field">
            <span>起始页</span>
            <input v-model.number="settings.startPageId" type="number" min="0" />
          </label>

          <label class="field">
            <span>结束页</span>
            <input v-model.number="settings.endPageId" type="number" min="0" />
          </label>

          <label class="field span-2">
            <span>输出目录</span>
            <input v-model.trim="settings.outputDir" placeholder="./output" />
          </label>
        </div>

        <div class="toggle-grid">
          <label class="check-card">
            <input v-model="settings.formulaEnable" type="checkbox" />
            <div>
              <strong>公式识别</strong>
              <small>对应 `formula_enable`</small>
            </div>
          </label>
          <label class="check-card">
            <input v-model="settings.tableEnable" type="checkbox" />
            <div>
              <strong>表格识别</strong>
              <small>对应 `table_enable`</small>
            </div>
          </label>
          <label class="check-card">
            <input v-model="settings.returnMd" type="checkbox" />
            <div>
              <strong>返回 Markdown</strong>
              <small>对应 `return_md`</small>
            </div>
          </label>
          <label class="check-card">
            <input v-model="settings.returnMiddleJson" type="checkbox" />
            <div>
              <strong>返回 Middle JSON</strong>
              <small>对应 `return_middle_json`</small>
            </div>
          </label>
          <label class="check-card">
            <input v-model="settings.returnModelOutput" type="checkbox" />
            <div>
              <strong>返回 Model JSON</strong>
              <small>对应 `return_model_output`</small>
            </div>
          </label>
          <label class="check-card">
            <input v-model="settings.returnContentList" type="checkbox" />
            <div>
              <strong>返回 Content List</strong>
              <small>对应 `return_content_list`</small>
            </div>
          </label>
          <label class="check-card">
            <input v-model="settings.returnImages" type="checkbox" />
            <div>
              <strong>返回图片</strong>
              <small>对应 `return_images`</small>
            </div>
          </label>
          <label class="check-card accent">
            <input v-model="settings.responseFormatZip" type="checkbox" />
            <div>
              <strong>ZIP 响应</strong>
              <small>启用后直接下载归档，不返回 JSON 内容</small>
            </div>
          </label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="section-kicker">Batch Parse</p>
            <h2>批量文件上传与解析</h2>
          </div>
          <div class="inline-actions">
            <button class="ghost-btn" @click="clearFiles" :disabled="!selectedFiles.length">清空文件</button>
            <button class="primary-btn" @click="submitParse" :disabled="submitting || !selectedFiles.length">
              {{ submitting ? '解析中...' : '开始解析' }}
            </button>
          </div>
        </div>

        <label
          class="dropzone"
          @dragenter.prevent
          @dragover.prevent
          @drop.prevent="handleDrop"
        >
          <input class="visually-hidden" type="file" multiple @change="handleFileInput" />
          <strong>拖拽 PDF / 图片到这里，或点击选择</strong>
          <small>官方 `file_parse` 支持多文件；当前批次将合并成一次请求发送。</small>
        </label>

        <ul class="file-list" v-if="selectedFiles.length">
          <li v-for="file in selectedFiles" :key="file.key" class="file-row">
            <div>
              <strong>{{ file.file.name }}</strong>
              <small>{{ formatSize(file.file.size) }}</small>
            </div>
            <button class="text-btn" @click="removeFile(file.key)">移除</button>
          </li>
        </ul>
        <div v-else class="empty-copy">当前没有待解析文件。</div>

        <p class="helper">
          当前请求会把页面配置完整映射到官方 `/file_parse` 表单参数。若勾选 ZIP 响应，页面会直接生成下载链接并保留任务记录。
        </p>
      </section>

      <section class="panel span-2">
        <div class="panel-header">
          <div>
            <p class="section-kicker">Results</p>
            <h2>解析任务与返回结果</h2>
          </div>
        </div>

        <div v-if="jobs.length" class="jobs">
          <article v-for="job in jobs" :key="job.id" class="job-card">
            <div class="job-topline">
              <div>
                <h3>任务 {{ job.id }}</h3>
                <p>{{ formatTime(job.createdAt) }} · {{ job.files.join(', ') }}</p>
              </div>
              <span class="job-status" :class="`job-${job.status}`">{{ statusText(job.status) }}</span>
            </div>

            <div class="job-meta">
              <span>backend: {{ job.backend }}</span>
              <span v-if="job.version">version: {{ job.version }}</span>
              <span>API: {{ job.apiBaseUrl }}</span>
            </div>

            <p v-if="job.error" class="job-error">{{ job.error }}</p>

            <div v-if="job.type === 'zip' && job.downloadUrl" class="zip-box">
              <p>官方接口返回 ZIP 结果，适合下载完整解析产物。</p>
              <a class="primary-btn inline-link" :href="job.downloadUrl" :download="job.downloadName">下载结果 ZIP</a>
            </div>

            <div v-if="job.type === 'json' && job.results.length" class="result-groups">
              <section v-for="result in job.results" :key="result.name" class="result-card">
                <div class="result-header">
                  <h4>{{ result.name }}</h4>
                  <div class="view-switch">
                    <button
                      v-for="view in availableViews(result)"
                      :key="view"
                      class="switch-btn"
                      :class="{ active: result.activeView === view }"
                      @click="result.activeView = view"
                    >
                      {{ viewLabels[view] }}
                    </button>
                  </div>
                </div>

                <div v-if="result.activeView === 'md'" class="markdown-body" v-html="result.renderedMarkdown"></div>
                <pre v-else-if="result.activeView === 'middle_json'" class="code-block">{{ stringifyPayload(result.middle_json) }}</pre>
                <pre v-else-if="result.activeView === 'model_output'" class="code-block">{{ stringifyPayload(result.model_output) }}</pre>
                <pre v-else-if="result.activeView === 'content_list'" class="code-block">{{ stringifyPayload(result.content_list) }}</pre>
                <div v-else-if="result.activeView === 'images'" class="images-grid">
                  <figure v-for="image in result.imageEntries" :key="image.name" class="image-card">
                    <img :src="image.src" :alt="image.name" />
                    <figcaption>{{ image.name }}</figcaption>
                  </figure>
                </div>
              </section>
            </div>

            <div v-else-if="job.type === 'json' && !job.error" class="empty-copy">
              当前任务返回 JSON，但没有可展示内容。通常是返回项全部关闭，或官方接口只写出了空结果。
            </div>
          </article>
        </div>
        <div v-else class="empty-copy">还没有解析任务。</div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { marked } from 'marked'
import { fetchServerMeta, parseFiles } from './api'
import { loadSettings, saveSettings } from './storage'

const defaultSettings = {
  apiBaseUrl: 'http://127.0.0.1:8000',
  backend: 'hybrid-auto-engine',
  parseMethod: 'auto',
  langListText: 'ch',
  serverUrl: '',
  outputDir: './output',
  startPageId: 0,
  endPageId: 99999,
  formulaEnable: true,
  tableEnable: true,
  returnMd: true,
  returnMiddleJson: false,
  returnModelOutput: false,
  returnContentList: false,
  returnImages: false,
  responseFormatZip: false
}

const viewLabels = {
  md: 'Markdown',
  middle_json: 'Middle JSON',
  model_output: 'Model JSON',
  content_list: 'Content List',
  images: 'Images'
}

const settings = reactive(loadSettings(defaultSettings))
const serverMeta = reactive({
  ok: false,
  apiBaseUrl: settings.apiBaseUrl,
  title: '',
  version: '',
  hasFileParse: false
})

const selectedFiles = ref([])
const jobs = ref([])
const checkingServer = ref(false)
const submitting = ref(false)

function buildJobId() {
  return String(Date.now()).slice(-6)
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatTime(value) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function persistSettings() {
  saveSettings({ ...settings })
}

function resetSettings() {
  Object.assign(settings, defaultSettings)
  persistSettings()
}

async function checkServer() {
  checkingServer.value = true
  try {
    const meta = await fetchServerMeta(settings.apiBaseUrl)
    Object.assign(serverMeta, meta)
  } catch (error) {
    Object.assign(serverMeta, {
      ok: false,
      apiBaseUrl: settings.apiBaseUrl,
      title: '',
      version: '',
      hasFileParse: false
    })
    window.alert(error.message)
  } finally {
    checkingServer.value = false
  }
}

function addFiles(fileList) {
  const incoming = Array.from(fileList).map((file) => ({
    key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2, 8)}`,
    file
  }))
  selectedFiles.value = [...selectedFiles.value, ...incoming]
}

function handleFileInput(event) {
  addFiles(event.target.files || [])
  event.target.value = ''
}

function handleDrop(event) {
  addFiles(event.dataTransfer?.files || [])
}

function removeFile(key) {
  selectedFiles.value = selectedFiles.value.filter((item) => item.key !== key)
}

function clearFiles() {
  selectedFiles.value = []
}

function buildFormData() {
  const formData = new FormData()
  formData.append('api_base_url', settings.apiBaseUrl)
  selectedFiles.value.forEach((item) => {
    formData.append('files', item.file)
  })

  settings.langListText
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((lang) => formData.append('lang_list', lang))

  formData.append('output_dir', settings.outputDir)
  formData.append('backend', settings.backend)
  formData.append('parse_method', settings.parseMethod)
  formData.append('start_page_id', String(settings.startPageId))
  formData.append('end_page_id', String(settings.endPageId))
  formData.append('formula_enable', String(settings.formulaEnable))
  formData.append('table_enable', String(settings.tableEnable))
  formData.append('return_md', String(settings.returnMd))
  formData.append('return_middle_json', String(settings.returnMiddleJson))
  formData.append('return_model_output', String(settings.returnModelOutput))
  formData.append('return_content_list', String(settings.returnContentList))
  formData.append('return_images', String(settings.returnImages))
  formData.append('response_format_zip', String(settings.responseFormatZip))

  if (settings.serverUrl.trim()) {
    formData.append('server_url', settings.serverUrl.trim())
  }

  return formData
}

function parseMaybeJson(value) {
  if (!value) return null
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function makeResultView(result) {
  const imageEntries = result.images
    ? Object.entries(result.images).map(([name, src]) => ({ name, src }))
    : []

  const available = []
  if (result.md_content) available.push('md')
  if (result.middle_json) available.push('middle_json')
  if (result.model_output) available.push('model_output')
  if (result.content_list) available.push('content_list')
  if (imageEntries.length) available.push('images')

  return {
    name: result.name,
    md_content: result.md_content || '',
    middle_json: parseMaybeJson(result.middle_json),
    model_output: parseMaybeJson(result.model_output),
    content_list: parseMaybeJson(result.content_list),
    imageEntries,
    activeView: available[0] || 'md',
    renderedMarkdown: result.md_content ? marked.parse(result.md_content) : ''
  }
}

function stringifyPayload(payload) {
  if (payload === null || payload === undefined || payload === '') return '无内容'
  if (typeof payload === 'string') return payload
  return JSON.stringify(payload, null, 2)
}

function statusText(status) {
  return {
    running: '运行中',
    success: '完成',
    error: '失败'
  }[status] || status
}

function availableViews(result) {
  const list = []
  if (result.md_content) list.push('md')
  if (result.middle_json) list.push('middle_json')
  if (result.model_output) list.push('model_output')
  if (result.content_list) list.push('content_list')
  if (result.imageEntries.length) list.push('images')
  return list
}

async function submitParse() {
  if (!selectedFiles.value.length) return

  persistSettings()

  const job = {
    id: buildJobId(),
    createdAt: Date.now(),
    files: selectedFiles.value.map((item) => item.file.name),
    backend: settings.backend,
    apiBaseUrl: settings.apiBaseUrl,
    version: '',
    status: 'running',
    type: settings.responseFormatZip ? 'zip' : 'json',
    results: [],
    error: '',
    downloadUrl: '',
    downloadName: 'results.zip'
  }

  jobs.value = [job, ...jobs.value]
  submitting.value = true

  try {
    const response = await parseFiles(buildFormData())

    if (!response.ok) {
      throw new Error(
        response.type === 'json'
          ? response.data.error || '官方接口返回错误。'
          : `HTTP ${response.status}`
      )
    }

    if (response.type === 'zip') {
      job.type = 'zip'
      job.downloadUrl = URL.createObjectURL(response.blob)
      job.downloadName = `mineru-results-${job.id}.zip`
    } else {
      job.type = 'json'
      job.version = response.data.version || ''
      job.backend = response.data.backend || job.backend
      job.results = Object.entries(response.data.results || {}).map(([name, result]) =>
        makeResultView({ name, ...result })
      )
    }

    job.status = 'success'
    clearFiles()
  } catch (error) {
    job.status = 'error'
    job.error = error.message
  } finally {
    submitting.value = false
  }
}

checkServer()
</script>
