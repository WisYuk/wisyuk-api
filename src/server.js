const Hapi = require('@hapi/hapi');
const routes = require('./routes');

const init = async () => {
    try {
        const server = Hapi.server({
            port: 6500,
            host: 'localhost',
            routes: {
                cors: {
                    origin: ['*'],
                },
            },
        });

        server.route(routes);

        await server.start();
        console.log(`Server running on ${server.info.uri}`);
    } catch (err) {
        // error checking
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

init();
