module.exports = {
  extends: ['stylelint-config-standard'],
  rules: {
    // Enforce HSL format for custom properties
    'custom-property-pattern': [
      '^([a-z][a-z0-9]*)(-[a-z0-9]+)*$',
      {
        message: 'Custom property names should be kebab-case',
      },
    ],

    // Catch RGB values in custom properties - this is the main issue
    'declaration-property-value-disallowed-list': [
      {
        // For custom properties that are likely colors
        '/^--(background|foreground|primary|secondary|accent|destructive|muted|border|input|ring|card|popover|chart|sidebar).*$/': [
          '/^\\d+\\s+\\d+\\s+\\d+$/',              // space-separated RGB like "250 250 250"
          '/^\\d+,\\s*\\d+,\\s*\\d+$/',           // comma-separated RGB like "250, 250, 250"
          '/^rgb\\(/',                             // rgb() function
          '/^rgba\\(/',                            // rgba() function
        ],
      },
      {
        message: 'RGB values not allowed in color custom properties. Use HSL format like "220 13% 91%" instead',
      },
    ],

    // Allow modern CSS features
    'color-function-notation': 'modern',
    'alpha-value-notation': 'percentage',

    // Disable some rules that might conflict with Tailwind
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['tailwind', 'apply', 'variants', 'responsive', 'screen'],
      },
    ],

    // Allow @apply for Tailwind
    'at-rule-no-deprecated': null,

    // Allow Tailwind directives
    'function-no-unknown': [
      true,
      {
        ignoreFunctions: ['theme', 'screen'],
      },
    ],

    // Disable value keyword case for CSS custom properties
    'value-keyword-case': [
      'lower',
      {
        ignoreProperties: ['/^--/'],
      },
    ],
  },

  // Ignore node_modules and build directories
  ignoreFiles: ['node_modules/**/*', 'dist/**/*', 'build/**/*'],
}; 