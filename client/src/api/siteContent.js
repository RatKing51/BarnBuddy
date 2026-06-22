import api from './axios'

export async function getSiteContent() {
  const { data } = await api.get('/site-content')
  return data
}

export async function getAdminSiteContent() {
  const { data } = await api.get('/site-content/admin')
  return data
}

export async function updateAdminSiteContent(content) {
  const { data } = await api.put('/site-content/admin', content)
  return data
}
