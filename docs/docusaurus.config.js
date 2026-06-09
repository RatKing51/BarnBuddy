// @ts-check

const config = {
  title: 'BarnBuddy Docs',
  tagline: 'Guides for livestock records, care tracking, herds, exports, and Premium tools.',
  favicon: 'img/logo.svg',

  url: 'https://doc.barnbuddy.pro',
  baseUrl: '/',

  organizationName: 'BarnBuddy',
  projectName: 'barnbuddy-docs',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    image: 'img/docs-hero.svg',
    navbar: {
      title: 'BarnBuddy Docs',
      logo: {
        alt: 'BarnBuddy Docs',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Guides',
        },
        {
          href: 'https://barnbuddy.pro',
          label: 'BarnBuddy',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/getting-started/create-account' },
            { label: 'Animal Records', to: '/records/animals' },
            { label: 'Premium Tools', to: '/premium/overview' },
          ],
        },
        {
          title: 'BarnBuddy',
          items: [
            { label: 'Main Website', href: 'https://barnbuddy.pro' },
            { label: 'Pricing', href: 'https://barnbuddy.pro/pricing' },
            { label: 'Contact', href: 'https://barnbuddy.pro/contact' },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} BarnBuddy.`,
    },
    prism: {
      additionalLanguages: ['bash', 'json'],
    },
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
  },
};

module.exports = config;
