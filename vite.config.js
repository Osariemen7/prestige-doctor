const { defineConfig, loadEnv } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('node:path');
const { injectManifest } = require('workbox-build');
const { createShellEntries } = require('./scripts/doctorPwaManifest.cjs');

const CLIENT_ENV_KEYS = [
  'PUBLIC_URL',
  'REACT_APP_BACKEND_BASE_URL',
  'REACT_APP_GOOGLE_CLIENT_ID',
  'REACT_APP_GEMINI_LIVE_WS_URL',
  'REACT_APP_OPENAI_REALTIME_CALLS_URL',
  'REACT_APP_API_BASE_URL',
  'REACT_APP_QA_API_ORIGIN',
  'REACT_APP_QA_MODE',
  'REACT_APP_ENV',
  'REACT_APP_BUILD_SHA',
  'REACT_APP_DOCTOR_ANALYTICS_ENDPOINT',
  'VITE_API_ORIGIN',
  'VITE_BACKEND_BASE_URL',
  'VITE_BUILD_SHA',
];

function getCraCompatibleEnv(mode) {
  const loaded = loadEnv(mode, process.cwd(), '');
  return CLIENT_ENV_KEYS.reduce((env, key) => {
    env[key] = process.env[key] ?? loaded[key] ?? '';
    return env;
  }, {
    NODE_ENV: mode === 'production' ? 'production' : 'development',
    REACT_APP_ENABLE_DEMO: 'false',
    VITE_ENABLE_DEMO: 'false',
  });
}

module.exports = defineConfig(({ mode, command }) => {
  const env = getCraCompatibleEnv(mode);
  env.NODE_ENV = command === 'build' ? 'production' : 'development';
  env.REACT_APP_BUILD_SHA ||= process.env.VERCEL_GIT_COMMIT_SHA || '';
  const define = mode === 'test' ? {} : { 'process.env': JSON.stringify(env) };

  return {
    test: { globals: true, environment: 'jsdom', setupFiles: './src/setupTests.js', css: false, maxWorkers: 1, fileParallelism: false, testTimeout: 30000 },
    plugins: [{
      name: 'direct-mui-icon-imports', enforce: 'pre',
      transform(code, id) {
        if (!id.replaceAll('\\', '/').includes('/src/') || !/\.[jt]sx?$/.test(id)) return null;
        return code.replace(/import\s*\{([^}]+)\}\s*from\s*['"]@mui\/icons-material['"];?/g, (statement, names) => {
          const symbols = names.split(',').map((name) => name.trim()).filter(Boolean).map((name) => name.match(/^(\w+)(?:\s+as\s+(\w+))?$/));
          return symbols.every(Boolean) ? symbols.map((symbol) => `import ${symbol[2] || symbol[1]} from '@mui/icons-material/${symbol[1]}';`).join('\n') : statement;
        });
      },
    }, react(), {
      name: 'prestige-doctor-pwa',
      async closeBundle() {
        const output = path.resolve('dist');
        const assets = createShellEntries(output);
        await injectManifest({
          swSrc: path.resolve('public/service-worker.js'),
          swDest: path.join(output, 'service-worker.js'),
          globDirectory: output,
          globPatterns: [],
          additionalManifestEntries: assets,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        });
      },
    }],
    define,
    resolve: { alias: [{ find: /^\.\/demoFixtures$/, replacement: path.resolve(command === 'build' ? 'src/vnext/demoUnavailable.js' : 'src/vnext/demoFixtures.js') }] },
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
      outDir: 'dist',
      manifest: true,
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
