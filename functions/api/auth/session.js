// 获取当前登录用户信息
export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    // 从 Cookie 获取 session
    const cookie = request.headers.get('Cookie');
    const sessionMatch = cookie?.match(/session=([^;]+)/);
    
    if (!sessionMatch) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const sessionToken = sessionMatch[1];
    const sessionData = await env.SESSIONS.get(sessionToken);
    
    if (!sessionData) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const session = JSON.parse(sessionData);
    
    return new Response(JSON.stringify({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        picture: session.picture
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Session check error:', error);
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 登出
export async function onRequestDelete(context) {
  const { request, env } = context;
  
  try {
    const cookie = request.headers.get('Cookie');
    const sessionMatch = cookie?.match(/session=([^;]+)/);
    
    if (sessionMatch) {
      // 删除会话
      await env.SESSIONS.delete(sessionMatch[1]);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/' 
      }
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ error: 'Logout failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}