import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/',
    component: ComponentCreator('/', '93a'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', 'd84'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', '911'),
            routes: [
              {
                path: '/account/billing',
                component: ComponentCreator('/account/billing', 'f79'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/account/delete-account',
                component: ComponentCreator('/account/delete-account', 'dfe'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/account/preferences',
                component: ComponentCreator('/account/preferences', '4ed'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/deployment/railway-docs-site',
                component: ComponentCreator('/deployment/railway-docs-site', 'c22'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/getting-started/add-first-animal',
                component: ComponentCreator('/getting-started/add-first-animal', '515'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/getting-started/create-account',
                component: ComponentCreator('/getting-started/create-account', 'deb'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/getting-started/dashboard-tour',
                component: ComponentCreator('/getting-started/dashboard-tour', 'e8a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/getting-started/setup-first-herd',
                component: ComponentCreator('/getting-started/setup-first-herd', '62b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/premium/exports',
                component: ComponentCreator('/premium/exports', '08c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/premium/feed',
                component: ComponentCreator('/premium/feed', '529'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/premium/finance',
                component: ComponentCreator('/premium/finance', '35e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/premium/overview',
                component: ComponentCreator('/premium/overview', '03a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/premium/reminders',
                component: ComponentCreator('/premium/reminders', '3bd'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/premium/reproduction',
                component: ComponentCreator('/premium/reproduction', '8d9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/records/animals',
                component: ComponentCreator('/records/animals', '079'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/records/farm-overview',
                component: ComponentCreator('/records/farm-overview', 'ff9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/records/health-records',
                component: ComponentCreator('/records/health-records', '580'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/records/herds',
                component: ComponentCreator('/records/herds', '9ba'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/records/vet-visits',
                component: ComponentCreator('/records/vet-visits', '591'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/support/contact',
                component: ComponentCreator('/support/contact', 'a44'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/support/faq',
                component: ComponentCreator('/support/faq', '400'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/support/troubleshooting',
                component: ComponentCreator('/support/troubleshooting', '5f1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/',
                component: ComponentCreator('/', 'fc9'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
