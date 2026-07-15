export default {
  async fetch(request, env) {
    if (!env?.ASSETS?.fetch) {
      return new Response('Static asset binding is unavailable.', { status: 500 });
    }
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    if (request.method === 'GET' && (request.headers.get('accept') || '').includes('text/html')) {
      const url = new URL(request.url);
      url.pathname = '/index.html';
      return env.ASSETS.fetch(new Request(url, request));
    }
    return response;
  }
};
