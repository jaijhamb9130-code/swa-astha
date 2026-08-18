// Token-bucket rate limiter — keeps timestamps in memory and rejects when the
// per-key bucket exceeds max requests in the rolling window.

class TokenBucket {
  constructor({ maxRequests, windowSeconds }) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
    this.buckets = new Map();
  }

  _prune(key, now) {
    const stamps = this.buckets.get(key) || [];
    const fresh = stamps.filter(t => now - t < this.windowMs);
    this.buckets.set(key, fresh);
    return fresh;
  }

  consume(key) {
    const now = Date.now();
    const fresh = this._prune(key, now);
    if (fresh.length >= this.maxRequests) {
      const oldest = fresh[0];
      const retryAfterSec = Math.max(1, Math.ceil((this.windowMs - (now - oldest)) / 1000));
      return { allowed: false, retryAfterSec };
    }
    fresh.push(now);
    this.buckets.set(key, fresh);
    return { allowed: true, remaining: this.maxRequests - fresh.length };
  }
}

const otpBucket = new TokenBucket({
  maxRequests: parseInt(process.env.OTP_RATE_MAX || '3', 10),
  windowSeconds: parseInt(process.env.OTP_RATE_WINDOW_SEC || '60', 10)
});

function otpRateLimiter(req, res, next) {
  const key = (req.body && req.body.phone) || req.ip;
  if (!key) return next();
  const result = otpBucket.consume(String(key));
  if (!result.allowed) {
    res.set('Retry-After', String(result.retryAfterSec));
    return res.status(429).json({
      success: false,
      message: `Too many OTP requests. Try again in ${result.retryAfterSec}s.`,
      retryAfter: result.retryAfterSec
    });
  }
  next();
}

module.exports = { TokenBucket, otpRateLimiter };
