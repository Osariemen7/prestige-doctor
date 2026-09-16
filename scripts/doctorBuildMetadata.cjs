const { execFileSync } = require('node:child_process');

const DEFAULT_DOCTOR_API_ORIGIN = 'https://api.prestigedelta.com';

function isPreviewOrTest(env = {}) {
  const vercelEnv = String(env.VERCEL_ENV || '').trim().toLowerCase();
  const appEnv = String(env.REACT_APP_ENV || '').trim().toLowerCase();
  const qaMode = String(env.REACT_APP_QA_MODE || '').trim().toLowerCase() === 'true';
  return (Boolean(vercelEnv) && vercelEnv !== 'production')
    || ['preview', 'test', 'qa'].includes(appEnv)
    || qaMode;
}

function resolveBuildApiOrigin(env = {}) {
  const qaMode = String(env.REACT_APP_QA_MODE || '').trim().toLowerCase() === 'true'
    || ['preview', 'test', 'qa'].includes(String(env.REACT_APP_ENV || '').trim().toLowerCase())
    || (Boolean(String(env.VERCEL_ENV || '').trim()) && String(env.VERCEL_ENV).trim().toLowerCase() !== 'production');
  const configuredApi = (qaMode && env.REACT_APP_QA_API_ORIGIN)
    || env.REACT_APP_API_BASE_URL
    || env.REACT_APP_BACKEND_BASE_URL
    || env.VITE_API_ORIGIN
    || env.VITE_BACKEND_BASE_URL
    || env.REACT_APP_QA_API_ORIGIN;
  if (configuredApi) {
    try { return new URL(String(configuredApi)).origin; } catch (_) {
      return isPreviewOrTest(env) ? null : DEFAULT_DOCTOR_API_ORIGIN;
    }
  }
  return isPreviewOrTest(env) ? null : DEFAULT_DOCTOR_API_ORIGIN;
}

function readLocalGitIdentity(cwd = process.cwd()) {
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const status = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return { sha: sha || null, dirty: status.trim().length > 0 };
  } catch (_) {
    return { sha: null, dirty: null };
  }
}

function resolveBuildIdentity(env = {}, gitIdentity = readLocalGitIdentity()) {
  const commitSha = [
    env.VERCEL_GIT_COMMIT_SHA,
    env.GITHUB_SHA,
    env.GIT_COMMIT_SHA,
    env.CI_COMMIT_SHA,
    env.SOURCE_VERSION,
    env.REACT_APP_BUILD_SHA,
    env.VITE_BUILD_SHA,
  ].map((value) => String(value || '').trim()).find(Boolean);
  const buildSha = commitSha || gitIdentity?.sha || 'unknown';
  const sourceState = gitIdentity?.dirty === true
    ? 'dirty'
    : gitIdentity?.dirty === false || (gitIdentity?.dirty == null && env.VERCEL_GIT_COMMIT_SHA)
      ? 'clean'
      : 'unknown';
  return { buildSha, sourceState };
}

function buildMetadataPlugin(env = {}, getGitIdentity = readLocalGitIdentity) {
  return {
    name: 'prestige-build-metadata',
    apply: 'build',
    generateBundle() {
      const identity = resolveBuildIdentity(env, getGitIdentity());
      this.emitFile({
        type: 'asset',
        fileName: '.well-known/prestige-build.json',
        source: JSON.stringify({
          schema_version: 'prestige_build_v1',
          application_role: 'doctor',
          build_sha: identity.buildSha,
          source_state: identity.sourceState,
          contract_version: 'care-pilot-contract-v1',
          public_api_origin: resolveBuildApiOrigin(env),
        }) + String.fromCharCode(10),
      });
    },
  };
}

module.exports = {
  buildMetadataPlugin,
  isPreviewOrTest,
  readLocalGitIdentity,
  resolveBuildApiOrigin,
  resolveBuildIdentity,
};
