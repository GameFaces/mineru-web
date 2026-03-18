export async function fetchServerMeta(apiBaseUrl) {
  const query = apiBaseUrl ? `?api_base_url=${encodeURIComponent(apiBaseUrl)}` : ''
  const response = await fetch(`/api/meta${query}`)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Failed to probe MinerU API.')
  }
  return data
}

export async function parseFiles(formData) {
  const response = await fetch('/api/file-parse', {
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
