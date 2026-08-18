// Idempotency cache — clients send a unique X-Idempotency-Key header on
// risky writes (checkout, payment confirm). If the same key is replayed
// within the TTL, we return the original response instead of executing again.
//
// Memory-only by design — single-process safe. For multi-instance deploys,
// swap the Map for Redis with the same `get/set` shape.

const TTL_MS = (parseInt(process.env.IDEMPOTENCY_TTL_SEC || '30', 10)) * 1000;

const store = new Map();

function _gc(now) {
  for (const [k, v] of store) {
    if (now - v.timestamp > TTL_MS) store.delete(k);
  }
}

function idempotency(req, res, next) {
  const key = req.headers['x-idempotency-key'];
  if (!key) return next();

  const now = Date.now();
  _gc(now);

  const cached = store.get(key);
  if (cached) {
    res.set('X-Idempotent-Replay', 'true');
    return res.status(cached.status).json(cached.body);
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      store.set(String(key), { status: res.statusCode, body, timestamp: now });
    }
    return originalJson(body);
  };
  next();
}

module.exports = { idempotency };
