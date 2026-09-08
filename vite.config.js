const { defineConfig, loadEnv } = require('vite');
const react = require('@vitejs/plugin-react');

const CLIENT_ENV_KEYS = [
  'PUBLIC_URL',
  'REACT_APP_BACKEND_BASE_URL',
  'REACT_APP_GOOGLE_CLIENT_ID',
  'REACT_APP_GEMINI_LIVE_WS_URL',
  'REACT_APP_OPENAI_REALTIME_CALLS_URL',
];

function getCraCompatibleEnv(mode) {
  const loaded = loadEnv(mode, process.cwd(), '');
  return CLIENT_ENV_KEYS.reduce((env, key) => {
    if (loaded[key] !== undefined) env[key] = loaded[key];
    return env;
  }, {
    NODE_ENV: mode === 'production' ? 'production' : 'development',
  });
}

module.exports = defineConfig(({ mode }) => {
  const env = getCraCompatibleEnv(mode);
  const define = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)])
  );

  return {
    plugins: [react()],
    define,
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.[jt]sx?$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    build: {
      outDir: 'dist-vite',
      emptyOutDir: true,
      sourcemap: false,
    },
    server: {
      host: '127.0.0.1',
      port: 3205,
      strictPort: true,
    },
    preview: {
      host: '127.0.0.1',
      port: 3206,
      strictPort: true,
    },
  };
});
