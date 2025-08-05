/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    './src/components/**/*.{astro,js,jsx,ts,tsx}',
    './src/layouts/**/*.astro',
    './src/pages/**/*.astro',
  ],
  safelist: [
    'bg-blue-500',
    'text-white',
    'rounded-lg',
    'p-4',
    'm-4',
    'grid-cols-1',
    'md:grid-cols-2',
    'lg:grid-cols-3',
    'gap-6',
    'flex',
    'flex-col',
    'md:flex-row',
    'md:space-x-4',
    'space-y-3',
    'md:space-y-0',
    'shadow-md',
    'hover:shadow-lg',
    'transition',
    'bg-white',
    'border-l-4',
    'border-b-2',
    'border-blue-500',
  ],
  theme: {
    extend: {
      fontFamily: {
        'meta': ['"Meta Pro"', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}