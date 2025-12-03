/**
 * Electrobun configuration for Argus GUI
 */
export default {
    app: {
        name: 'Argus',
        identifier: 'dev.argus.vrt',
        version: '0.1.0',
    },
    build: {
        bun: {
            entrypoint: 'src/bun/index.ts',
        },
        views: {
            main: {
                entrypoint: 'src/views/main/index.ts',
            },
        },
        copy: {
            'src/views/main/index.html': 'views/main/index.html',
            'src/views/main/styles.css': 'views/main/styles.css',
        },
    },
};
