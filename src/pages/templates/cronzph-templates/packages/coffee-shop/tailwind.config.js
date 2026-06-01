/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,jsx}',
        '../../shared/**/*.{js,jsx}',
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#fdf8f0',
                    100: '#f9eddb',
                    200: '#f2d7b0',
                    300: '#e9bc7e',
                    400: '#df9a4a',
                    500: '#d6802a',
                    600: '#c76820',
                    700: '#a5501d',
                    800: '#854120',
                    900: '#6c371d',
                },
            },
        },
    },
    plugins: [],
};
