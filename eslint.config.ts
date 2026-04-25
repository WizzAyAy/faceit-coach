import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  vue: true,
  unocss: true,
  ignores: [
    'docs/**',
    '**/dist/**',
    '**/.turbo/**',
    '**/auto-imports.d.ts',
    '**/components.d.ts',
    '.vscode/**',
  ],
})
