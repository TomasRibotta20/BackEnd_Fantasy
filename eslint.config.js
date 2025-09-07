// eslint.config.js
import pluginTs from '@typescript-eslint/eslint-plugin';
import parserTs from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: parserTs,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': pluginTs,
      prettier: prettierPlugin,
    },
    rules: {
      ...pluginTs.configs.recommended.rules,
      'prettier/prettier': 'error',
      'no-console': 'warn',
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'docs/**'],
  }
);
