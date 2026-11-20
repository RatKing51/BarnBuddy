import axios from 'axios'
import api from './axios'
import { API_BASE_URL } from '../config/env'
import { normalizeSiteContentImages } from '../config/siteImages'

export async function getSiteContent() {
  const { data } = await axios.get(API_BASE_URL + '/site-content', { timeout: 8000 })
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
