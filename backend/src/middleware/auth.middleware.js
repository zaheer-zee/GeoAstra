import { verifyJwt } from "../utils/jwt.js";
import { ApiError } from "../utils/ApiError.js";
import prisma from "../config/database.js";

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(ApiError.unauthorized("Authentication token required"));
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyJwt(token);

    if (!decoded || !decoded.userId) {
      return next(ApiError.unauthorized("Invalid or expired token"));
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) {
      return next(ApiError.unauthorized("User account no longer exists"));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

