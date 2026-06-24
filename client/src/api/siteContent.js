import api from './axios'
import { normalizeSiteContentImages } from '../config/siteImages'

export async function getSiteContent() {
  const { data } = await api.get('/site-content')
  return normalizeSiteContentImages(data)
}

export async function getAdminSiteContent() {
  const { data } = await api.get('/site-content/admin')
  return normalizeSiteContentImages(data)
}

export async function updateAdminSiteContent(content) {
  const { data } = await api.put('/site-content/admin', content)
  return normalizeSiteContentImages(data)
}
