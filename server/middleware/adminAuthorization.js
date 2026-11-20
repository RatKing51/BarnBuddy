function readEnvList(name) {
  return (process.env[name] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isAdminUser(user = {}) {
  const allowedClerkIds = readEnvList("ADMIN_CLERK_USER_IDS");
  return Boolean(user.clerkUserId && allowedClerkIds.includes(user.clerkUserId));
}

function requireAdmin(req, res, next) {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  return next();
}

module.exports = {
  isAdminUser,
  readEnvList,
  requireAdmin,
};
