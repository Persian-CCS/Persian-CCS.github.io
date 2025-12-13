// Cloudflare Workers API for D1 access
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Verify API token (example for protected routes)
    if (!path.startsWith('/api/public')) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.replace('Bearer ', '') !== env.API_TOKEN) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // --- API Routes ---
    // Health check endpoint
    if (path === '/api/health' && request.method === 'GET') {
      return new Response(JSON.stringify({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Database example endpoint (GET all requests)
    if (path === '/api/requests' && request.method === 'GET') {
      try {
        const { results } = await env.ccs_resalat_db.prepare(
          "SELECT * FROM requests ORDER BY createdAt DESC"
        ).all();
        
        return new Response(JSON.stringify({
          success: true,
          data: results,
          count: results.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Database error',
          error: error.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Route not found
    return new Response(JSON.stringify({
      success: false,
      message: 'Route not found'
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};