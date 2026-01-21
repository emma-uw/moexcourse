import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'MOEXAlgo',
  favicon: 'img/favicon.png',

  url: 'https://your-docusaurus-site.example.com',
  baseUrl: '/',
  organizationName: 'facebook', 
  projectName: 'docusaurus', 
  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'ru',
    locales: ['ru'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve("./sidebars.ts"),
          editUrl: ({docPath}) => {
            if (docPath.startsWith('examples/')) {
              const notebookPath = docPath.replace('.mdx', '.ipynb').replace('docs/', '');
              return `https://github.com/moexalgo/moexalgo.github.io/edit/main/${notebookPath}`;
            }
            return `https://github.com/moexalgo/moexalgo.github.io/edit/main/docs/${docPath}`;
          },
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'MOEX Algo',
      logo: {
        alt: 'My Site Logo',
        src: 'img/logo-moex.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Обучение',
        },
        {to: '/blog', label: 'Новости', position: 'left'},
        {
          type: 'docSidebar',
          sidebarId: 'contributeSidebar',
          position: 'left',
          label: 'Вклад',
        },
        {
          type: 'search',
          position: 'right', 
        },
        {
          href: 'https://github.com/moexalgo/moexalgo',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,

   plugins: [
    [
      require.resolve("@cmfcmf/docusaurus-search-local"),
      {
        indexDocs: true,
        indexBlog: true,
        indexPages: true,
        language: ["en", "ru"],
        maxSearchResults: 8,
      }
    ]
  ],
};

export default config;
