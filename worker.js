/**
 * Ontario Family Finder — Cloudflare Worker
 * Proxies requests to the Anthropic API, injecting your secret key server-side.
 *
 * Deploy at: https://dash.cloudflare.com → Workers & Pages → Create Worker
 * Then add a secret: Settings → Variables → ANTHROPIC_API_KEY → your key
 */

const ANTHROPIC_URL = 'https://api.anthropic.com';

// Allowed origins — add your real domain once it's live
const ALLOWED_ORIGINS = [
  'https://aware-family.pages.dev',
  'https://aware.family',
  'http://localhost:3000',
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const isAllowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(isAllowed ? origin : ''),
      });
    }

    // Only allow POST to /v1/messages
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/v1/messages') {
      return new Response('Not found', { status: 404 });
    }

    if (!isAllowed) {
      return new Response('Forbidden', { status: 403 });
    }

    // Read the request body
    const body = await request.json();

    // Forward to Anthropic, injecting the secret key
    const anthropicResp = await fetch(`${ANTHROPIC_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
        'x-api-key': env.ANTHROPIC_API_KEY,   // injected from Worker secret
      },
      body: JSON.stringify(body),
    });

    const data = await anthropicResp.json();

    return new Response(JSON.stringify(data), {
      status: anthropicResp.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
      },
    });
  },
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
