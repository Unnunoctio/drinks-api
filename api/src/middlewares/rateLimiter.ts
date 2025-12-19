import { Context, Next } from 'hono'

interface RateLimitOptions {
    windowMs: number    // Window in ms
    max: number         // Maximum requests in the window
    monthlyMax: number  // Maximum requests per month
}

export function rateLimiter(options: RateLimitOptions) {
    return async (c: Context, next: Next) => {
        const ip = c.req.header('cf-connecting-ip') || 'unknown'
        const now = Date.now()

        // key for tracking short window
        const shortKey = `ratelimit:short:${ip}:${Math.floor(now / options.windowMs)}`

        // key for tracking monthly window
        const monthKey = `ratelimit:month:${ip}:${new Date().getMonth()}`
        
        // verify short limit
        const shortCount = await c.env.RATE_LIMIT_KV.get(shortKey)
        if (shortCount && parseInt(shortCount) >= options.max) {
            return c.json({
                error: 'Too many requests',
                retryAfter: Math.ceil(options.windowMs / 1000)
            }, 429)
        }

        // verify month limit
        const monthCount = await c.env.RATE_LIMIT_KV.get(monthKey)
        if (monthCount && parseInt(monthCount) >= options.monthlyMax) {
            return c.json({
                error: 'Monthly limit exceeded',
                limit: options.monthlyMax
            }, 429)
        }

        // Increment short and month counters
        await c.env.RATE_LIMIT_KV.put(
            shortKey,
            ((shortCount ? parseInt(shortCount) : 0) + 1).toString(),
            { expirationTtl: Math.ceil(options.windowMs / 1000) * 2 }
        )

        await c.env.RATE_LIMIT_KV.put(
            monthKey,
            ((monthCount ? parseInt(monthCount) : 0) + 1).toString(),
            { expirationTtl: 60 * 60 * 24 * 32 } // 32 days
        )

        await next()
    }
}