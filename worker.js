const ANTHROPIC_URL = 'https://api.anthropic.com';

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
        headers: corsHeaders(isAllowed ? origin : '*'),
      });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Build forward headers — inject API key, pass through beta header
    const forwardHeaders = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': env.ANTHROPIC_API_KEY,
    };
    const beta = request.headers.get('anthropic-beta');
    if (beta) forwardHeaders['anthropic-beta'] = beta;

    // Forward to Anthropic
    const url = new URL(request.url);
    const anthropicResp = await fetch(`${ANTHROPIC_URL}${url.pathname}`, {
      method: 'POST',
      headers: forwardHeaders,
      body: request.body,
    });

    const isStream = anthropicResp.headers.get('content-type')?.includes('text/event-stream');

    return new Response(anthropicResp.body, {
      status: anthropicResp.status,
      headers: {
        'Content-Type': isStream ? 'text/event-stream' : 'application/json',
        'Cache-Control': 'no-cache',
        ...corsHeaders(isAllowed ? origin : '*'),
      },
    });
  },
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, anthropic-version, anthropic-beta, x-api-key',
    'Access-Control-Expose-Headers': 'Content-Type',
  };
}
