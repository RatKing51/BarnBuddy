const sidebars = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/create-account',
        'getting-started/dashboard-tour',
        'getting-started/setup-first-herd',
        'getting-started/add-first-animal',
      ],
    },
    {
      type: 'category',
      label: 'Records',
      items: [
        'records/herds',
        'records/animals',
        'records/health-records',
        'records/vet-visits',
        'records/farm-overview',
      ],
    },
    {
      type: 'category',
      label: 'Premium',
      items: [
        'premium/overview',
        'premium/reproduction',
        'premium/finance',
        'premium/feed',
        'premium/exports',
        'premium/reminders',
      ],
    },
    {
      type: 'category',
      label: 'Account',
      items: [
        'account/preferences',
        'account/billing',
        'account/delete-account',
      ],
    },
    {
      type: 'category',
      label: 'Support',
      items: [
        'support/faq',
        'support/troubleshooting',
        'support/contact',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/railway-docs-site',
      ],
    },
  ],
};

module.exports = sidebars;
