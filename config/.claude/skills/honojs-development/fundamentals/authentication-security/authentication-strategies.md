# Hono.js Authentication Strategies

## Overview

Authentication is a critical component of any backend service. Hono.js provides flexible middleware patterns that support various authentication strategies from simple API keys to complex OAuth 2.0 flows. This guide covers comprehensive authentication implementations with best practices.

## Authentication Architecture

### Authentication Flow Types

```typescript
// Authentication strategy interface
interface AuthStrategy {
  authenticate(request: Request): Promise<AuthResult>
  challenge(response: Response): Promise<Response>
}

interface AuthResult {
  success: boolean
  user?: User
  error?: string
  token?: string
}

interface User {
  id: string
  email: string
  role: string
  permissions: string[]
}
```

### Authentication Context

```typescript
// Authentication context for type safety
interface AuthContext {
  isAuthenticated: boolean
  user?: User
  token?: string
  permissions: string[]
  sessionId?: string
}

// Extend Hono Context with authentication
declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext
  }
}
```

## JWT (JSON Web Token) Authentication

### JWT Service Implementation

```typescript
// src/services/JWTService.ts
import jwt from 'jsonwebtoken'
import { Context } from 'hono'

interface JWTPayload {
  sub: string // user ID
  email: string
  role: string
  permissions: string[]
  iat: number
  exp: number
  type: 'access' | 'refresh'
}

export class JWTService {
  private accessTokenSecret: string
  private refreshTokenSecret: string
  private accessTokenExpiry: string
  private refreshTokenExpiry: string

  constructor(
    accessTokenSecret: string,
    refreshTokenSecret: string,
    accessTokenExpiry: string = '15m',
    refreshTokenExpiry: string = '7d'
  ) {
    this.accessTokenSecret = accessTokenSecret
    this.refreshTokenSecret = refreshTokenSecret
    this.accessTokenExpiry = accessTokenExpiry
    this.refreshTokenExpiry = refreshTokenExpiry
  }

  generateAccessToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      type: 'access',
    }

    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'hono-backend',
      audience: 'hono-frontend',
    })
  }

  generateRefreshToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      type: 'refresh',
    }

    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'hono-backend',
      audience: 'hono-frontend',
    })
  }

  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'hono-backend',
        audience: 'hono-frontend',
      }) as JWTPayload

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type')
      }

      return decoded
    } catch (error) {
      throw new AuthenticationError('Invalid access token')
    }
  }

  verifyRefreshToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'hono-backend',
        audience: 'hono-frontend',
      }) as JWTPayload

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type')
      }

      return decoded
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token')
    }
  }

  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload
    } catch {
      return null
    }
  }

  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token)
    if (!decoded) return true

    return Date.now() >= decoded.exp * 1000
  }
}
```

### JWT Authentication Middleware

```typescript
// src/middleware/auth.ts
import { Context, Next, createMiddleware } from 'hono'
import { jwtService } from '../services/JWTService'

export const jwtAuth = () => {
  return createMiddleware(async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader) {
      return c.json({
        error: 'No authorization header provided',
        code: 'NO_AUTH_HEADER'
      }, 401)
    }

    if (!authHeader.startsWith('Bearer ')) {
      return c.json({
        error: 'Invalid authorization header format',
        code: 'INVALID_AUTH_FORMAT'
      }, 401)
    }

    const token = authHeader.substring(7)

    try {
      const payload = jwtService.verifyAccessToken(token)

      // Check if token is blacklisted (optional)
      const isBlacklisted = await checkTokenBlacklist(token)
      if (isBlacklisted) {
        return c.json({
          error: 'Token has been revoked',
          code: 'TOKEN_REVOKED'
        }, 401)
      }

      // Fetch fresh user data
      const user = await userService.findById(payload.sub)
      if (!user) {
        return c.json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        }, 401)
      }

      // Set authentication context
      c.set('auth', {
        isAuthenticated: true,
        user,
        token,
        permissions: payload.permissions,
      })

      await next()
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return c.json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        }, 401)
      } else if (error instanceof jwt.JsonWebTokenError) {
        return c.json({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        }, 401)
      } else {
        return c.json({
          error: 'Authentication failed',
          code: 'AUTH_FAILED'
        }, 401)
      }
    }
  })
}

// Optional JWT authentication (doesn't fail if no token)
export const optionalJwtAuth = () => {
  return createMiddleware(async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization')

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)

      try {
        const payload = jwtService.verifyAccessToken(token)
        const user = await userService.findById(payload.sub)

        if (user) {
          c.set('auth', {
            isAuthenticated: true,
            user,
            token,
            permissions: payload.permissions,
          })
        }
      } catch (error) {
        // Ignore errors for optional auth
        c.set('auth', {
          isAuthenticated: false,
          permissions: [],
        })
      }
    } else {
      c.set('auth', {
        isAuthenticated: false,
        permissions: [],
      })
    }

    await next()
  })
}
```

### Authentication Routes

```typescript
// src/routes/auth.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { jwtService } from '../services/JWTService'
import { UserService } from '../services/UserService'
import { bcrypt } from '../utils/crypto'

const authRoutes = new Hono()
const userService = new UserService()

// Login route
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  remember: z.boolean().optional(),
})

authRoutes.post('/login',
  zValidator('json', loginSchema),
  async (c) => {
    try {
      const { email, password, remember = false } = c.req.valid('json')

      // Find user by email
      const user = await userService.findByEmail(email)
      if (!user) {
        return c.json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        }, 401)
      }

      // Check if user is active
      if (!user.isActive) {
        return c.json({
          error: 'Account is disabled',
          code: 'ACCOUNT_DISABLED'
        }, 401)
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        return c.json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        }, 401)
      }

      // Generate tokens
      const accessToken = jwtService.generateAccessToken(user)
      const refreshToken = jwtService.generateRefreshToken(user)

      // Store refresh token (optional - for token revocation)
      await storeRefreshToken(user.id, refreshToken)

      // Update last login
      await userService.updateLastLogin(user.id)

      // Create session
      const sessionId = await createSession(user.id, c.req.header('user-agent'))

      // Set secure cookies
      setAuthCookies(c, accessToken, refreshToken, remember)

      return c.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
          },
          sessionId,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: {
            access: 15 * 60, // 15 minutes
            refresh: 7 * 24 * 60 * 60, // 7 days
          },
        },
      })
    } catch (error) {
      console.error('Login error:', error)
      return c.json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }, 500)
    }
  }
)

// Refresh token route
const refreshSchema = z.object({
  refreshToken: z.string(),
})

authRoutes.post('/refresh',
  zValidator('json', refreshSchema),
  async (c) => {
    try {
      const { refreshToken } = c.req.valid('json')

      // Verify refresh token
      const payload = jwtService.verifyRefreshToken(refreshToken)

      // Check if refresh token is valid and not revoked
      const isValidRefreshToken = await validateRefreshToken(payload.sub, refreshToken)
      if (!isValidRefreshToken) {
        return c.json({
          error: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        }, 401)
      }

      // Get fresh user data
      const user = await userService.findById(payload.sub)
      if (!user || !user.isActive) {
        return c.json({
          error: 'User not found or inactive',
          code: 'USER_INACTIVE'
        }, 401)
      }

      // Generate new access token
      const newAccessToken = jwtService.generateAccessToken(user)

      // Optionally generate new refresh token for security
      const newRefreshToken = jwtService.generateRefreshToken(user)

      // Update stored refresh token
      await updateRefreshToken(user.id, refreshToken, newRefreshToken)

      return c.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: {
            access: 15 * 60,
            refresh: 7 * 24 * 60 * 60,
          },
        },
      })
    } catch (error) {
      return c.json({
        error: 'Token refresh failed',
        code: 'REFRESH_FAILED'
      }, 401)
    }
  }
)

// Logout route
authRoutes.post('/logout',
  jwtAuth(),
  async (c) => {
    try {
      const auth = c.get('auth')
      const refreshToken = c.req.header('X-Refresh-Token')

      // Revoke refresh token
      if (refreshToken) {
        await revokeRefreshToken(auth.user!.id, refreshToken)
      }

      // Clear session
      if (auth.sessionId) {
        await revokeSession(auth.sessionId)
      }

      // Clear cookies
      clearAuthCookies(c)

      return c.json({
        success: true,
        message: 'Logged out successfully',
      })
    } catch (error) {
      console.error('Logout error:', error)
      return c.json({
        error: 'Logout failed',
        code: 'LOGOUT_FAILED'
      }, 500)
    }
  }
)

// Register route
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one lowercase, one uppercase, and one number',
  }),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
})

authRoutes.post('/register',
  zValidator('json', registerSchema),
  async (c) => {
    try {
      const { name, email, password } = c.req.valid('json')

      // Check if user already exists
      const existingUser = await userService.findByEmail(email)
      if (existingUser) {
        return c.json({
          error: 'User with this email already exists',
          code: 'USER_EXISTS'
        }, 409)
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12)

      // Create user
      const user = await userService.create({
        name,
        email,
        password: hashedPassword,
        role: 'user',
        isActive: true,
      })

      // Send verification email (optional)
      await sendVerificationEmail(user.email)

      return c.json({
        success: true,
        message: 'Registration successful. Please check your email for verification.',
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      }, 201)
    } catch (error) {
      console.error('Registration error:', error)
      return c.json({
        error: 'Registration failed',
        code: 'REGISTRATION_FAILED'
      }, 500)
    }
  }
)

export { authRoutes }
```

## API Key Authentication

### API Key Service

```typescript
// src/services/APIKeyService.ts
import { Context, Next, createMiddleware } from 'hono'
import { v4 as uuidv4 } from 'uuid'

interface APIKey {
  id: string
  key: string
  name: string
  userId: string
  permissions: string[]
  rateLimit: number
  isActive: boolean
  createdAt: Date
  lastUsedAt?: Date
  expiresAt?: Date
}

export class APIKeyService {
  private keys: Map<string, APIKey> = new Map()

  generateAPIKey(name: string, userId: string, permissions: string[]): APIKey {
    const key = `hono_${uuidv4().replace(/-/g, '')}`

    const apiKey: APIKey = {
      id: uuidv4(),
      key,
      name,
      userId,
      permissions,
      rateLimit: 1000, // requests per hour
      isActive: true,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    }

    this.keys.set(key, apiKey)
    return apiKey
  }

  async validateAPIKey(key: string): Promise<APIKey | null> {
    const apiKey = this.keys.get(key)

    if (!apiKey) {
      return null
    }

    if (!apiKey.isActive) {
      return null
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null
    }

    // Update last used timestamp
    apiKey.lastUsedAt = new Date()
    this.keys.set(key, apiKey)

    return apiKey
  }

  revokeAPIKey(keyId: string): boolean {
    for (const [key, apiKey] of this.keys) {
      if (apiKey.id === keyId) {
        apiKey.isActive = false
        this.keys.set(key, apiKey)
        return true
      }
    }
    return false
  }
}
```

### API Key Middleware

```typescript
// src/middleware/apiKey.ts
import { Context, Next, createMiddleware } from 'hono'
import { APIKeyService } from '../services/APIKeyService'

const apiKeyService = new APIKeyService()

export const apiKeyAuth = () => {
  return createMiddleware(async (c: Context, next: Next) => {
    const apiKey = c.req.header('X-API-Key') ||
                   c.req.query('apiKey') ||
                   c.req.header('Authorization')?.replace('Bearer ', '')

    if (!apiKey) {
      return c.json({
        error: 'API key required',
        code: 'API_KEY_REQUIRED'
      }, 401)
    }

    const keyData = await apiKeyService.validateAPIKey(apiKey)

    if (!keyData) {
      return c.json({
        error: 'Invalid or expired API key',
        code: 'INVALID_API_KEY'
      }, 401)
    }

    // Get user from API key
    const user = await userService.findById(keyData.userId)
    if (!user) {
      return c.json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      }, 401)
    }

    // Set authentication context
    c.set('auth', {
      isAuthenticated: true,
      user,
      apiKey: keyData.key,
      permissions: keyData.permissions,
    })

    await next()
  })
}

// API Key with specific permissions
export const requireAPIKeyPermissions = (requiredPermissions: string[]) => {
  return createMiddleware(async (c: Context, next: Next) => {
    const auth = c.get('auth')

    if (!auth.isAuthenticated) {
      return c.json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, 401)
    }

    const hasPermission = requiredPermissions.every(permission =>
      auth.permissions.includes(permission)
    )

    if (!hasPermission) {
      return c.json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredPermissions,
      }, 403)
    }

    await next()
  })
}
```

## Session-based Authentication

### Session Service

```typescript
// src/services/SessionService.ts
import { Context, Next, createMiddleware } from 'hono'

interface Session {
  id: string
  userId: string
  data: Record<string, any>
  createdAt: Date
  lastAccessedAt: Date
  expiresAt: Date
  ipAddress?: string
  userAgent?: string
}

export class SessionService {
  private sessions: Map<string, Session> = new Map()

  createSession(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
    expiresIn: number = 24 * 60 * 60 * 1000 // 24 hours
  ): Session {
    const session: Session = {
      id: uuidv4(),
      userId,
      data: {},
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      expiresAt: new Date(Date.now() + expiresIn),
      ipAddress,
      userAgent,
    }

    this.sessions.set(session.id, session)
    return session
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return null
    }

    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId)
      return null
    }

    // Update last accessed time
    session.lastAccessedAt = new Date()
    this.sessions.set(sessionId, session)

    return session
  }

  updateSession(sessionId: string, data: Partial<Session>): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    Object.assign(session, data, {
      lastAccessedAt: new Date(),
    })

    this.sessions.set(sessionId, session)
    return true
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId)
  }

  clearExpiredSessions(): void {
    const now = new Date()

    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId)
      }
    }
  }
}
```

### Session Middleware

```typescript
// src/middleware/session.ts
import { Context, Next, createMiddleware } from 'hono'
import { sessionService } from '../services/SessionService'

export const sessionAuth = () => {
  return createMiddleware(async (c: Context, next: Next) => {
    const sessionId = c.req.header('X-Session-ID') ||
                     getCookie(c, 'session_id') ||
                     c.req.query('sessionId')

    if (!sessionId) {
      c.set('auth', {
        isAuthenticated: false,
        permissions: [],
      })
      await next()
      return
    }

    const session = await sessionService.getSession(sessionId)

    if (!session) {
      c.set('auth', {
        isAuthenticated: false,
        permissions: [],
      })
      await next()
      return
    }

    // Get user from session
    const user = await userService.findById(session.userId)
    if (!user || !user.isActive) {
      // Invalid session - delete it
      await sessionService.deleteSession(sessionId)
      c.set('auth', {
        isAuthenticated: false,
        permissions: [],
      })
      await next()
      return
    }

    // Set authentication context
    c.set('auth', {
      isAuthenticated: true,
      user,
      sessionId: session.id,
      permissions: user.permissions,
    })

    await next()
  })
}

// Session management routes
app.post('/auth/login/session',
  zValidator('json', loginSchema),
  async (c) => {
    const { email, password } = c.req.valid('json')

    // Authenticate user (same as JWT login)
    const user = await authenticateUser(email, password)
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Create session
    const session = sessionService.createSession(
      user.id,
      c.req.header('user-agent'),
      c.req.header('x-forwarded-for')
    )

    // Set session cookie
    setCookie(c, 'session_id', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 24 * 60 * 60, // 24 hours
    })

    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        sessionId: session.id,
      },
    })
  }
)

app.post('/auth/logout/session',
  sessionAuth(),
  async (c) => {
    const auth = c.get('auth')

    if (auth.sessionId) {
      await sessionService.deleteSession(auth.sessionId)
    }

    deleteCookie(c, 'session_id')

    return c.json({
      success: true,
      message: 'Logged out successfully',
    })
  }
)
```

## OAuth 2.0 Authentication

### OAuth Service

```typescript
// src/services/OAuthService.ts
import { Context } from 'hono'

interface OAuthProvider {
  name: string
  authUrl: string
  tokenUrl: string
  userInfoUrl: string
  clientId: string
  clientSecret: string
  scopes: string[]
}

export class OAuthService {
  private providers: Map<string, OAuthProvider> = new Map()

  constructor() {
    // Initialize OAuth providers
    this.providers.set('google', {
      name: 'google',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scopes: ['openid', 'email', 'profile'],
    })

    this.providers.set('github', {
      name: 'github',
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scopes: ['user:email'],
    })
  }

  getAuthUrl(provider: string, redirectUri: string, state?: string): string {
    const oauthProvider = this.providers.get(provider)
    if (!oauthProvider) {
      throw new Error(`Unsupported OAuth provider: ${provider}`)
    }

    const params = new URLSearchParams({
      client_id: oauthProvider.clientId,
      redirect_uri: redirectUri,
      scope: oauthProvider.scopes.join(' '),
      response_type: 'code',
    })

    if (state) {
      params.append('state', state)
    }

    return `${oauthProvider.authUrl}?${params.toString()}`
  }

  async exchangeCodeForToken(
    provider: string,
    code: string,
    redirectUri: string
  ): Promise<OAuthToken> {
    const oauthProvider = this.providers.get(provider)
    if (!oauthProvider) {
      throw new Error(`Unsupported OAuth provider: ${provider}`)
    }

    const response = await fetch(oauthProvider.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_id: oauthProvider.clientId,
        client_secret: oauthProvider.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code for token')
    }

    return response.json()
  }

  async getUserInfo(provider: string, accessToken: string): Promise<OAuthUser> {
    const oauthProvider = this.providers.get(provider)
    if (!oauthProvider) {
      throw new Error(`Unsupported OAuth provider: ${provider}`)
    }

    const response = await fetch(oauthProvider.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user info')
    }

    return response.json()
  }
}

interface OAuthToken {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope?: string
}

interface OAuthUser {
  id: string
  email?: string
  name?: string
  avatar_url?: string
  login?: string // GitHub username
}
```

### OAuth Routes

```typescript
// src/routes/oauth.ts
import { Hono } from 'hono'
import { OAuthService } from '../services/OAuthService'
import { UserService } from '../services/UserService'
import { jwtService } from '../services/JWTService'

const oauthRoutes = new Hono()
const oauthService = new OAuthService()
const userService = new UserService()

// OAuth login initiation
oauthRoutes.get('/login/:provider', async (c) => {
  const provider = c.req.param('provider')
  const redirectUri = `${c.req.url.replace(/\/login.*$/, '/callback')}`
  const state = generateRandomState()

  // Store state in session/cookie for validation
  setCookie(c, 'oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60, // 10 minutes
  })

  try {
    const authUrl = oauthService.getAuthUrl(provider, redirectUri, state)
    return c.redirect(authUrl)
  } catch (error) {
    return c.json({
      error: 'Invalid OAuth provider',
      code: 'INVALID_PROVIDER',
    }, 400)
  }
})

// OAuth callback
oauthRoutes.get('/callback/:provider', async (c) => {
  const provider = c.req.param('provider')
  const code = c.req.query('code')
  const state = c.req.query('state')
  const storedState = getCookie(c, 'oauth_state')

  // Validate state
  if (!state || state !== storedState) {
    return c.json({
      error: 'Invalid state parameter',
      code: 'INVALID_STATE',
    }, 400)
  }

  // Clear state cookie
  deleteCookie(c, 'oauth_state')

  if (!code) {
    return c.json({
      error: 'Authorization code required',
      code: 'NO_CODE',
    }, 400)
  }

  try {
    // Exchange code for token
    const redirectUri = `${c.req.url.replace(/\/callback.*/, '/callback')}/${provider}`
    const token = await oauthService.exchangeCodeForToken(provider, code, redirectUri)

    // Get user info
    const userInfo = await oauthService.getUserInfo(provider, token.access_token)

    // Find or create user
    let user = await userService.findByOAuthProvider(provider, userInfo.id)

    if (!user) {
      // Check if user exists with same email
      if (userInfo.email) {
        user = await userService.findByEmail(userInfo.email)
        if (user) {
          // Link OAuth account to existing user
          await userService.linkOAuthAccount(user.id, provider, userInfo.id, token)
        }
      }

      if (!user) {
        // Create new user
        user = await userService.createFromOAuth(provider, userInfo, token)
      }
    } else {
      // Update OAuth token
      await userService.updateOAuthToken(user.id, provider, token)
    }

    // Generate JWT tokens
    const accessToken = jwtService.generateAccessToken(user)
    const refreshToken = jwtService.generateRefreshToken(user)

    // Set auth cookies
    setAuthCookies(c, accessToken, refreshToken)

    return c.redirect('/dashboard')
  } catch (error) {
    console.error('OAuth callback error:', error)
    return c.json({
      error: 'OAuth authentication failed',
      code: 'OAUTH_FAILED',
    }, 500)
  }
})

// Link OAuth account to existing user
oauthRoutes.post('/link/:provider',
  jwtAuth(),
  zValidator('json', z.object({
    code: z.string(),
    state: z.string(),
  })),
  async (c) => {
    const auth = c.get('auth')
    const provider = c.req.param('provider')
    const { code, state } = c.req.valid('json')

    try {
      const redirectUri = `${c.req.url.replace(/\/link.*$/, '/callback')}/${provider}`
      const token = await oauthService.exchangeCodeForToken(provider, code, redirectUri)
      const userInfo = await oauthService.getUserInfo(provider, token.access_token)

      // Link account
      await userService.linkOAuthAccount(auth.user!.id, provider, userInfo.id, token)

      return c.json({
        success: true,
        message: `${provider} account linked successfully`,
      })
    } catch (error) {
      return c.json({
        error: 'Failed to link account',
        code: 'LINK_FAILED',
      }, 500)
    }
  }
)

export { oauthRoutes }
```

## Multi-Strategy Authentication

### Universal Auth Middleware

```typescript
// src/middleware/universalAuth.ts
import { Context, Next, createMiddleware } from 'hono'
import { jwtService } from '../services/JWTService'
import { APIKeyService } from '../services/APIKeyService'
import { sessionService } from '../services/SessionService'

const apiKeyService = new APIKeyService()

export const universalAuth = () => {
  return createMiddleware(async (c: Context, next: Next) => {
    let authResult: AuthResult | null = null

    // Try JWT authentication
    const authHeader = c.req.header('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const payload = jwtService.verifyAccessToken(token)
        const user = await userService.findById(payload.sub)

        if (user) {
          authResult = {
            success: true,
            user,
            token,
            strategy: 'jwt',
          }
        }
      } catch (error) {
        // JWT failed, try other methods
      }
    }

    // Try API key authentication
    if (!authResult) {
      const apiKey = c.req.header('X-API-Key') ||
                     c.req.query('apiKey')

      if (apiKey) {
        const keyData = await apiKeyService.validateAPIKey(apiKey)
        if (keyData) {
          const user = await userService.findById(keyData.userId)
          if (user) {
            authResult = {
              success: true,
              user,
              apiKey: keyData.key,
              strategy: 'api_key',
            }
          }
        }
      }
    }

    // Try session authentication
    if (!authResult) {
      const sessionId = getCookie(c, 'session_id') ||
                       c.req.header('X-Session-ID')

      if (sessionId) {
        const session = await sessionService.getSession(sessionId)
        if (session) {
          const user = await userService.findById(session.userId)
          if (user) {
            authResult = {
              success: true,
              user,
              sessionId: session.id,
              strategy: 'session',
            }
          }
        }
      }
    }

    // Set authentication context
    if (authResult) {
      c.set('auth', {
        isAuthenticated: true,
        user: authResult.user!,
        strategy: authResult.strategy,
        ...(authResult.token && { token: authResult.token }),
        ...(authResult.apiKey && { apiKey: authResult.apiKey }),
        ...(authResult.sessionId && { sessionId: authResult.sessionId }),
        permissions: authResult.user!.permissions,
      })
    } else {
      c.set('auth', {
        isAuthenticated: false,
        permissions: [],
      })
    }

    await next()
  })
}
```

### Strategy-specific Authorization

```typescript
// src/middleware/strategyAuth.ts
export const requireAuthStrategy = (allowedStrategies: string[]) => {
  return createMiddleware(async (c: Context, next: Next) => {
    const auth = c.get('auth')

    if (!auth.isAuthenticated) {
      return c.json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      }, 401)
    }

    if (!allowedStrategies.includes(auth.strategy!)) {
      return c.json({
        error: 'Authentication method not allowed',
        code: 'STRATEGY_NOT_ALLOWED',
        allowed: allowedStrategies,
      }, 401)
    }

    await next()
  })
}

// Usage examples
app.get('/api/jwt-only',
  jwtAuth(),
  (c) => c.json({ message: 'JWT authentication only' })
)

app.get('/api/api-key-only',
  apiKeyAuth(),
  (c) => c.json({ message: 'API key authentication only' })
)

app.get('/api/session-only',
  sessionAuth(),
  (c) => c.json({ message: 'Session authentication only' })
)

app.get('/api/any-auth',
  universalAuth(),
  (c) => c.json({ message: 'Any authentication method' })
)

app.get('/api/webhook-only',
  requireAuthStrategy(['api_key']),
  (c) => c.json({ message: 'Webhook endpoints only accept API keys' })
)
```

## Security Best Practices

### Secure Token Storage

```typescript
// src/utils/cookies.ts
export const setAuthCookies = (
  c: Context,
  accessToken: string,
  refreshToken: string,
  remember: boolean = false
) => {
  const maxAge = remember ? 7 * 24 * 60 * 60 : 24 * 60 * 60 // 7 days vs 1 day

  // Access token cookie (short-lived)
  setCookie(c, 'access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  })

  // Refresh token cookie (long-lived)
  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge,
    path: '/',
  })
}

export const clearAuthCookies = (c: Context) => {
  deleteCookie(c, 'access_token')
  deleteCookie(c, 'refresh_token')
  deleteCookie(c, 'session_id')
}
```

### Rate Limiting

```typescript
// src/middleware/rateLimit.ts
import { Context, Next, createMiddleware } from 'hono'

const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export const rateLimit = (options: {
  windowMs: number
  maxRequests: number
  keyGenerator?: (c: Context) => string
  message?: string
}) => {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (c) => c.req.header('x-forwarded-for') || 'unknown',
    message = 'Too many requests',
  } = options

  return createMiddleware(async (c: Context, next: Next) => {
    const key = keyGenerator(c)
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean up old entries
    for (const [k, v] of rateLimitStore) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k)
      }
    }

    const current = rateLimitStore.get(key)

    if (!current || current.resetTime < now) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
      await next()
    } else if (current.count < maxRequests) {
      current.count++
      await next()
    } else {
      return c.json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
      }, 429)
    }
  })
}
```

### Token Blacklisting

```typescript
// src/services/TokenBlacklistService.ts
export class TokenBlacklistService {
  private blacklistedTokens = new Set<string>()

  async addToBlacklist(token: string, reason?: string): Promise<void> {
    this.blacklistedTokens.add(token)
    // In production, store in Redis with TTL
  }

  async isBlacklisted(token: string): Promise<boolean> {
    return this.blacklistedTokens.has(token)
  }

  async removeFromBlacklist(token: string): Promise<void> {
    this.blacklistedTokens.delete(token)
  }

  async clearExpired(): Promise<void> {
    // Remove expired tokens from blacklist
    const now = Date.now()
    for (const token of this.blacklistedTokens) {
      try {
        const decoded = jwtService.decodeToken(token)
        if (decoded && decoded.exp * 1000 < now) {
          this.blacklistedTokens.delete(token)
        }
      } catch {
        // Invalid token, remove from blacklist
        this.blacklistedTokens.delete(token)
      }
    }
  }
}
```

This comprehensive guide to Hono.js authentication strategies provides secure, production-ready implementations for various authentication methods with proper security measures and best practices.