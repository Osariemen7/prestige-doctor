import { resolveBackendUrl } from './apiBase';

describe('backend transport configuration', () => {
  const originalBase = process.env.REACT_APP_BACKEND_BASE_URL;

  afterEach(() => {
    if (originalBase === undefined) delete process.env.REACT_APP_BACKEND_BASE_URL;
    else process.env.REACT_APP_BACKEND_BASE_URL = originalBase;
  });

  it('routes auth and refresh paths through the explicit local base', () => {
    process.env.REACT_APP_BACKEND_BASE_URL = 'http://127.0.0.1:4318/';
    expect(resolveBackendUrl('/login/')).toBe('http://127.0.0.1:4318/login/');
    expect(resolveBackendUrl('https://api.prestigedelta.com/api/tokenrefresh/'))
      .toBe('http://127.0.0.1:4318/api/tokenrefresh/');
  });
});
