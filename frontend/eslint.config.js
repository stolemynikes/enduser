import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // The GraphQL documents in this app are untyped (no codegen), so the hooks
      // are given `any` deliberately — that was Apollo Client 3's default and
      // v4 made it explicit. Worth seeing, not worth failing a build over.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Context providers legitimately export their hook next to the component.
    files: ['src/components/ConfirmDialog.tsx', 'src/components/Toast.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
