module.exports = {
    apps: [{
        name: 'taas-sentinel',
        script: 'src/index.ts',
        interpreter: 'node_modules/.bin/ts-node',
        interpreter_args: '--transpile-only',
        env: {
            NODE_ENV: 'development',
            NODE_MODE: 'sentinel'
        },
        env_production: {
            NODE_ENV: 'production',
            NODE_MODE: 'sentinel'
        }
    }, {
        name: 'taas-challenger',
        script: 'src/index.ts',
        interpreter: 'node_modules/.bin/ts-node',
        interpreter_args: '--transpile-only',
        env: {
            NODE_ENV: 'development',
            NODE_MODE: 'challenger'
        }
    }]
};
