import restart from 'vite-plugin-restart';
import wasm from 'vite-plugin-wasm';
import tailwindcss from '@tailwindcss/vite';
import glsl from 'vite-plugin-glsl'

export default {
    root: 'sources/',
    publicDir: '../static/',
    base: '/car-grass-generation/',
    server: {
        host: true,
        open: true,
    },
    plugins: [
        wasm(),
        glsl(),
        tailwindcss(),
        restart({ restart:['../static/**'] })
    ]
}
