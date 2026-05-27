const { getAuth } = require("@clerk/express");
const { findOrCreateLocalUserFromAuth } = require("../services/clerkUserSync");

module.exports = async function authMiddleware(req, res, next) {
    try {
        const auth = getAuth(req);

        if (!auth.isAuthenticated || !auth.userId) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const user = await findOrCreateLocalUserFromAuth(auth);
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            clerkUserId: auth.userId,
        };
        next();
    } catch (err) {
        console.error("Auth middleware failed:", err);
        return res.status(500).json({ message: "Authentication failed" });
    }
}
