import { newsPosts } from './newsPosts'

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
  status: defaultStatus,
}
