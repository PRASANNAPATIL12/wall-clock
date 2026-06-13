/**
 * Cloudflare Worker — Blog Proxy
 *
 * Proxies requests from focusclock.app/blog/* to blog.focusclock.app/*
 * This keeps all content under the root domain for maximum SEO PageRank flow.
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Go to Cloudflare Dashboard → Workers & Pages → Create Worker
 * 2. Paste this script
 * 3. Deploy the Worker
 * 4. Add a Route: focusclock.app/blog/* → this Worker
 * 5. Also route: focusclock.app/glossary/* → this Worker (optional, for future)
 *
 * Without this Worker, /blog/* requests hit the React SPA catch-all.
 * The Worker intercepts those requests and proxies them to the Astro site.
 */

const BLOG_ORIGIN = 'https://blog.focusclock.app';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Only proxy /blog/* paths
    if (!url.pathname.startsWith('/blog')) {
      return fetch(request);
    }

    // Rewrite: /blog/some-article → blog.focusclock.app/blog/some-article
    const targetUrl = `${BLOG_ORIGIN}${url.pathname}${url.search}`;

    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    });

    const response = await fetch(proxyRequest);

    // Clone and fix any absolute URLs in the response that point to blog.focusclock.app
    // so internal links work correctly from the main domain context
    const responseHeaders = new Headers(response.headers);

    // Allow the response to be cached by Cloudflare
    responseHeaders.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};
