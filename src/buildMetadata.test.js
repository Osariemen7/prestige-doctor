import metadata from '../scripts/doctorBuildMetadata.cjs';

const { buildMetadataPlugin } = metadata;

function readMetadata(env, gitIdentity = { sha: 'local-head-sha', dirty: false }) {
  let asset;
  buildMetadataPlugin(env, () => gitIdentity).generateBundle.call({ emitFile: (value) => { asset = value; } });
  return JSON.parse(asset.source);
}

describe('doctor build metadata API origin', () => {
  it('does not advertise production for unconfigured preview or test builds', () => {
    expect(readMetadata({ VERCEL_ENV: 'preview' }).public_api_origin).toBeNull();
    expect(readMetadata({ VERCEL_ENV: 'test' }).public_api_origin).toBeNull();
    expect(readMetadata({ REACT_APP_ENV: 'test' }).public_api_origin).toBeNull();
  });

  it('prefers deployment commit identity and still marks a dirty checkout', () => {
    const metadata = readMetadata({
      VERCEL_GIT_COMMIT_SHA: 'vercel-commit-sha',
      GITHUB_SHA: 'github-commit-sha',
      REACT_APP_BUILD_SHA: 'legacy-build-sha',
    }, { sha: 'local-head-sha', dirty: true });
    expect(metadata.build_sha).toBe('vercel-commit-sha');
    expect(metadata.source_state).toBe('dirty');
  });

  it('falls back to local HEAD and distinguishes dirty, clean, and unavailable source state', () => {
    expect(readMetadata({}, { sha: 'local-head-sha', dirty: true })).toMatchObject({
      build_sha: 'local-head-sha',
      source_state: 'dirty',
    });
    expect(readMetadata({}, { sha: 'clean-head-sha', dirty: false })).toMatchObject({
      build_sha: 'clean-head-sha',
      source_state: 'clean',
    });
    expect(readMetadata({}, { sha: null, dirty: null })).toMatchObject({
      build_sha: 'unknown',
      source_state: 'unknown',
    });
  });

  it('uses an explicitly configured preview API and preserves production fallback', () => {
    expect(readMetadata({ VERCEL_ENV: 'preview', REACT_APP_QA_API_ORIGIN: 'https://qa-api.example.test/path' }).public_api_origin)
      .toBe('https://qa-api.example.test');
    expect(readMetadata({ VERCEL_ENV: 'production' }).public_api_origin).toBe('https://api.prestigedelta.com');
  });
});
