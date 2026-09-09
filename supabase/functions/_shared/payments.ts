export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...extraHeaders,
    },
  })
}

export function handleCors(req) {
  return req.method === 'OPTIONS'
}

// Mock mobile money gateway. TODO: replace with the real provider API:
//  - request():  POST https://api.provider.com/momo/request
//  - verify():   GET  https://api.provider.com/momo/{externalId}
// The mock marks every charge as CONFIRMED after a small delay so the
// verify / webhook flows can be exercised end to end.
export function mockGateway() {
  return {
    async request() {
      return { external_id: crypto.randomUUID() }
    },
    async verify() {
      await new Promise((r) => setTimeout(r, 400))
      return { status: 'CONFIRMED', receipt_no: crypto.randomUUID() }
    },
  }
}