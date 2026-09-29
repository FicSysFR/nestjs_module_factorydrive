import { defineConfig } from 'vitepress'
import llmstxt from 'vitepress-plugin-llms'

const repository = 'https://github.com/FicSysFR/nestjs_module_factorydrive'
const base = process.env.NODE_ENV === 'production' ? '/nestjs_module_factorydrive/' : '/'

const frenchGuide = [
  { text: 'Installation et architecture', link: '/guide/installation' },
  { text: 'Configuration', link: '/guide/configuration' },
  { text: 'Opérations et erreurs', link: '/guide/operations' },
  { text: 'Drivers local, S3 et SFTP', link: '/guide/drivers' },
  { text: 'URLs signées', link: '/guide/signed-urls' },
  { text: 'Drivers personnalisés', link: '/guide/custom-drivers' },
  { text: 'Migration 2.0', link: '/guide/migration' },
  { text: 'Agents IA', link: '/guide/ai' },
]

const englishGuide = [
  { text: 'Installation and architecture', link: '/en/guide/installation' },
  { text: 'Configuration', link: '/en/guide/configuration' },
  { text: 'Operations and errors', link: '/en/guide/operations' },
  { text: 'Local, S3, and SFTP drivers', link: '/en/guide/drivers' },
  { text: 'Signed URLs', link: '/en/guide/signed-urls' },
  { text: 'Custom drivers', link: '/en/guide/custom-drivers' },
  { text: '2.0 scope migration', link: '/en/guide/migration' },
  { text: 'AI agents', link: '/en/guide/ai' },
]

export default defineConfig({
  title: 'Factorydrive',
  description: 'Portable file storage for NestJS with local, S3, and SFTP drivers.',
  base,
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ['conventions/**', 'references-patterns/**'],

  vite: {
    plugins: [
      ...(llmstxt({
        domain: 'https://ficsysfr.github.io',
        title: 'Factorydrive',
        description: 'Portable file storage for NestJS with local, S3, and SFTP drivers.',
        details: 'Configure named storage disks once and keep application services independent from filesystem, S3, or SFTP provider SDKs.',
        // Keep the machine-readable corpus English-only and exclude internal project notes.
        ignoreFiles: ['index.md', 'guide/**', 'en/index.md', 'conventions/**', 'references-patterns/**'],
      }) as never[]),
    ],
  },

  locales: {
    root: {
      label: 'Français',
      lang: 'fr-FR',
      description: 'Stockage de fichiers portable pour NestJS avec drivers local, S3 et SFTP.',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/installation' },
          { text: 'Migration 2.0', link: '/guide/migration' },
          { text: 'npm', link: 'https://www.npmjs.com/package/@ficsysfr/nestjs_module_factorydrive' },
        ],
        sidebar: [{ text: 'Guide Factorydrive', items: frenchGuide }],
        outline: { level: [2, 3], label: 'Sur cette page' },
        editLink: { pattern: `${repository}/edit/main/docs/:path`, text: 'Modifier cette page' },
        lastUpdated: { text: 'Mis à jour' },
        docFooter: { prev: 'Précédent', next: 'Suivant' },
        footer: { message: 'Publié sous licence Apache 2.0.', copyright: 'Copyright © 2026 FicSys et contributeurs' },
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      description: 'Portable file storage for NestJS with local, S3, and SFTP drivers.',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/installation' },
          { text: '2.0 migration', link: '/en/guide/migration' },
          { text: 'npm', link: 'https://www.npmjs.com/package/@ficsysfr/nestjs_module_factorydrive' },
        ],
        sidebar: [{ text: 'Factorydrive guide', items: englishGuide }],
        outline: { level: [2, 3], label: 'On this page' },
        editLink: { pattern: `${repository}/edit/main/docs/:path`, text: 'Edit this page' },
        lastUpdated: { text: 'Updated' },
        footer: { message: 'Released under the Apache License 2.0.', copyright: 'Copyright © 2026 FicSys and contributors' },
      },
    },
  },

  themeConfig: {
    siteTitle: 'Factorydrive',
    socialLinks: [{ icon: 'github', link: repository }],
    search: { provider: 'local' },
  },
})
