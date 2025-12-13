export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // تست اتصال به دیتابیس
    if (url.pathname === '/test') {
      try {
        const result = await env.DB.prepare("SELECT 1 as test").first();
        return new Response(JSON.stringify({
          success: true,
          message: "✅ دیتابیس متصل است",
          test: result?.test,
          timestamp: new Date().toISOString()
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // صفحه اصلی
    return new Response(JSON.stringify({
      service: "Request Management API",
      version: "2.0",
      status: "running",
      endpoints: [
        "/test - Test database connection",
        "/api/* - API endpoints"
      ]
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};