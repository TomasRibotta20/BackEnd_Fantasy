import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';

export default tseslint.config(
  // Reglas base de JS
  js.configs.recommended,
  // Reglas recomendadas de TypeScript (sin type-checking para que sea rápido)
  ...tseslint.configs.recommended,
  // Config general para TS
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
      // Globals de Node y lo que usás en scripts
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
      },
    },
    plugins: { prettier },
    rules: {
      'prettier/prettier': 'warn',
      'no-console': 'warn', // avisá en general...
    },
  },
  // Excepciones para scripts (permitir console y await en loops)
  {
    files: ['src/scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
      'no-await-in-loop': 'off',
    },
  },
  // Ignorar carpetas
  {
    ignores: ['dist/**', 'node_modules/**', 'docs/**'],
  }
);
