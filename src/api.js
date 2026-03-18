export async function fetchServerMeta(apiBaseUrl) {
  const baseUrl = normalizeBaseUrl(apiBaseUrl)
  const response = await fetch(`${baseUrl}/openapi.json`)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || data.error || 'Failed to probe MinerU API.')
  }
  return {
    ok: true,
    apiBaseUrl: baseUrl,
    title: data.info?.title || 'MinerU API',
    version: data.info?.version || '',
    hasFileParse: Boolean(data.paths?.['/file_parse']?.post)
  }
}

export async function parseFiles(formData) {
  const baseUrl = normalizeBaseUrl(formData.get('api_base_url'))
  formData.delete('api_base_url')

  const response = await fetch(`${baseUrl}/file_parse`, {
    method: 'POST',
    body: formData
  })

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/zip')) {
    return {
      ok: response.ok,
      status: response.status,
      type: 'zip',
      blob: await response.blob()
    }
  }

  const data = await response
    .json()
    .catch(() => ({ error: 'Invalid JSON response.' }))
  return {
    ok: response.ok,
    status: response.status,
    type: 'json',
    data
  }
}

function normalizeBaseUrl(apiBaseUrl) {
  const value = String(apiBaseUrl || '').trim()
  if (!value) {
    throw new Error('MinerU API 地址不能为空。')
  }
  return value.replace(/\/$/, '')
}
