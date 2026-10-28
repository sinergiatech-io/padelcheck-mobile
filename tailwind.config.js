/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter_400Regular'],
        'inter-500': ['Inter_500Medium'],
        'inter-600': ['Inter_600SemiBold'],
        'inter-700': ['Inter_700Bold'],
        mono: ['ui-monospace', 'monospace'],
      },
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        divider: 'rgb(var(--color-divider) / <alpha-value>)',
        primary: {
          100: 'rgb(var(--color-primary-100) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700) / <alpha-value>)',
        },
        dark: {
          700: 'rgb(var(--color-dark-700) / <alpha-value>)',
          800: 'rgb(var(--color-dark-800) / <alpha-value>)',
          900: 'rgb(var(--color-dark-900) / <alpha-value>)',
        },
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        error: 'rgb(var(--color-error) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        'success-bg': 'rgb(var(--color-success-bg) / <alpha-value>)',
        'warning-bg': 'rgb(var(--color-warning-bg) / <alpha-value>)',
        'error-bg': 'rgb(var(--color-error-bg) / <alpha-value>)',
        'info-bg': 'rgb(var(--color-info-bg) / <alpha-value>)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      fontSize: {
        display: ['2rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        h2: ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        h3: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        h4: ['1.125rem', { lineHeight: '1.5rem', fontWeight: '500' }],
        body: ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        caption: ['0.75rem', { lineHeight: '1rem', fontWeight: '400' }],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
    },
  },
  plugins: [],
}
