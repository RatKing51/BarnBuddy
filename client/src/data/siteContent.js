import { newsPosts } from './newsPosts'
import { landingReviews } from './reviews'

export const defaultStatus = {
  headline: 'All systems normal',
  summary: 'BarnBuddy services are running normally.',
  overallStatus: 'Operational',
  overallTone: 'green',
  services: [
    { name: 'Web app', status: 'Operational', tone: 'green' },
    { name: 'Login and accounts', status: 'Operational', tone: 'green' },
    { name: 'Animal records', status: 'Operational', tone: 'green' },
    { name: 'Notifications', status: 'Operational', tone: 'green' },
  ],
  recentUpdateTitle: 'Recent updates',
  recentUpdateBody: 'No incidents reported.',
}

export const defaultSiteContent = {
  newsPosts,
  reviews: landingReviews,
  status: defaultStatus,
  announcement: {
    enabled: false,
    tone: 'blue',
    title: '',
    message: '',
    linkText: '',
    linkUrl: '',
  },
  maintenance: {
    enabled: false,
    title: 'BarnBuddy is down for maintenance',
    message: 'We are making a few updates and will be back soon.',
    estimatedReturn: '',
  },
}
