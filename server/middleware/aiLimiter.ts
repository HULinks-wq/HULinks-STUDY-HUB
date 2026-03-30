const activeRequests = new Map<string, number>();
const MAX = 3;

export function aiLimiter(req: any, res: any, next: any) {
  const uid = req.session?.userId || req.ip || "anon";
  const count = activeRequests.get(uid) || 0;

  if (count >= MAX) {
    return res.status(429).json({
      message: "Too many AI requests running. Wait a bit.",
    });
  }

  activeRequests.set(uid, count + 1);

  const release = () => {
    const c = activeRequests.get(uid) || 1;
    if (c <= 1) activeRequests.delete(uid);
    else activeRequests.set(uid, c - 1);
  };

  res.on("finish", release);
  res.on("close", release);

  next();
}
