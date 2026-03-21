// Google OAuth 登录处理
// 部署到 Cloudflare Pages Functions

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { credential } = await request.json();
    
    if (!credential) {
      return new Response(JSON.stringify({ error: 'Missing credential' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 验证 Google ID Token
    const googleUser = await verifyGoogleToken(credential, env.GOOGLE_CLIENT_ID);
    
    if (!googleUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 创建或获取用户 (使用 D1 数据库)
    const user = await getOrCreateUser(env.DB, googleUser);
    
    // 生成会话 Token
    const sessionToken = await generateSessionToken();
    
    // 保存会话到 KV
    await env.SESSIONS.put(sessionToken, JSON.stringify({
      userId: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      createdAt: Date.now()
    }), { expirationTtl: 7 * 24 * 60 * 60 }); // 7天过期
    
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/`
      }
    });
    
  } catch (error) {
    console.error('Auth error:', error);
    return new Response(JSON.stringify({ error: 'Authentication failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 验证 Google ID Token
async function verifyGoogleToken(token, clientId) {
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Google token verification failed:', data);
      return null;
    }
    
    // 验证 aud (client ID)
    if (data.aud !== clientId) {
      console.error('Client ID mismatch');
      return null;
    }
    
    // 检查 token 是否过期
    const now = Math.floor(Date.now() / 1000);
    if (data.exp < now) {
      console.error('Token expired');
      return null;
    }
    
    return {
      sub: data.sub,  // Google user ID
      email: data.email,
      name: data.name,
      picture: data.picture,
      emailVerified: data.email_verified === 'true'
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// 获取或创建用户 (使用 D1 数据库，如果没有则降级处理)
async function getOrCreateUser(db, googleUser) {
  // 如果没有数据库绑定，直接返回 Google 用户信息
  if (!db) {
    return {
      id: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture
    };
  }
  
  try {
    // 查询现有用户
    const existing = await db.prepare(
      'SELECT * FROM users WHERE google_id = ?'
    ).bind(googleUser.sub).first();
    
    if (existing) {
      // 更新用户信息
      await db.prepare(
        'UPDATE users SET name = ?, picture = ?, last_login = ? WHERE id = ?'
      ).bind(googleUser.name, googleUser.picture, Date.now(), existing.id).run();
      
      return {
        id: existing.id,
        email: existing.email,
        name: googleUser.name,
        picture: googleUser.picture
      };
    }
    
    // 创建新用户
    const result = await db.prepare(
      'INSERT INTO users (google_id, email, name, picture, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(googleUser.sub, googleUser.email, googleUser.name, googleUser.picture, Date.now(), Date.now()).run();
    
    return {
      id: result.meta.last_row_id,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture
    };
    
  } catch (error) {
    console.error('Database error:', error);
    // 如果数据库出错，返回 Google 用户信息（降级处理）
    return {
      id: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture
    };
  }
}

// 生成随机会话 Token
async function generateSessionToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}