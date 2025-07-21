import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { createRequire } from 'module'

// --- Lucide Icon Import Checker ---
let lucideIcons = [];
let lucideIconsLoaded = false;

function loadLucideIcons() {
  if (lucideIconsLoaded) return;
  
  try {
    // Use dynamic import to avoid blocking ESLint startup
    const require = createRequire(import.meta.url);
    const lucideReact = require("lucide-react");
    lucideIcons = Object.keys(lucideReact);
    lucideIconsLoaded = true;
  } catch (error) {
    // Gracefully handle when lucide-react is not available
    console.warn('ESLint: lucide-react not found, skipping icon validation');
    lucideIcons = [];
    lucideIconsLoaded = true;
  }
}

function suggestClosestIcon(name) {
  if (!lucideIconsLoaded) loadLucideIcons();
  if (lucideIcons.length === 0) return "";
  
  const threshold = 3;
  // Basic Levenshtein distance
  const distance = (a, b) => {
    const dp = Array(a.length + 1)
      .fill(null)
      .map(() => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 +
              Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[a.length][b.length];
  };
  
  const scored = lucideIcons
    .map((icon) => ({
      icon,
      score: distance(name.toLowerCase(), icon.toLowerCase()),
    }))
    .filter((r) => r.score <= threshold)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((r) => r.icon);
  return scored.length ? `Did you mean: ${scored.join(", ")}?` : "";
}

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
        CanvasRenderingContext2D: 'readonly', 
        CanvasTextAlign: 'readonly',
        HTMLCanvasElement: 'readonly',
        Image: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly'
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // === CRITICAL ERRORS ONLY: Things that BREAK the app ===
      ...reactHooks.configs.recommended.rules, // Prevent React crashes
      
      // === ONLY CATCH ACTUAL BREAKING TEMPORAL DEAD ZONE ERRORS ===
      // Only catch class usage before declaration (real TDZ error)
      '@typescript-eslint/no-use-before-define': ['error', { 
        functions: false,        // Functions are hoisted - never an error
        classes: true,          // Classes cause real TDZ errors
        variables: true,        // KEEP TRUE - catches the original TDZ bug
        enums: false,           // Enums are hoisted - never an error  
        typedefs: false,        // Types don't cause runtime errors
        ignoreTypeReferences: true // Type references don't cause runtime errors
      }],
      
      // Turn off the base rule to avoid conflicts
      'no-use-before-define': 'off',
      
      // Turn off no-undef for TS files - TypeScript compiler handles this better
      'no-undef': 'off',
      
      // === TURN OFF EVERYTHING ELSE ===
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true }
      ],
      'no-debugger': 'off',
      'no-unreachable': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-shadow': 'off',
      '@typescript-eslint/no-redeclare': 'off',
      'block-scoped-var': 'off',
      'no-shadow': 'off',
      'no-redeclare': 'off'
    },
  },
  // Override for shadcn/ui components - disable react-refresh rule and TDZ checks
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-use-before-define': 'off', // Third-party components
    },
  },
  // Lucide icon checker config block - KEEP THIS! Prevents empty pages
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      lucide: {
        rules: {
          "no-invalid-icon-import": {
            create(context) {
              return {
                ImportDeclaration(node) {
                  if (node.source.value !== "lucide-react") return;
                  
                  // Lazy load icons only when needed
                  if (!lucideIconsLoaded) loadLucideIcons();
                  
                  // Skip validation if lucide-react is not available
                  if (lucideIcons.length === 0) return;
                  
                  for (const specifier of node.specifiers) {
                    if (specifier.type === 'ImportSpecifier') {
                      const name = specifier.imported?.name;
                      if (name && !lucideIcons.includes(name)) {
                        context.report({
                          node: specifier,
                          message: `'${name}' is not a valid lucide-react icon. ${suggestClosestIcon(name)}`,
                        });
                      }
                    }
                  }
                },
              };
            },
          },
        },
      },
    },
    rules: {
      "lucide/no-invalid-icon-import": "error", // KEEP AS ERROR - prevents empty pages!
    },
  }
)