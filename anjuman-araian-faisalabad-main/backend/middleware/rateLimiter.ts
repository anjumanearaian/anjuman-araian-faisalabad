import rateLimit from "express-rate-limit";

// Auth routes: strict in production, relaxed only for local development
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 1000,
  message: {
    error: "Too many login attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration: max 3 attempts per hour in production
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 3 : 1000,
  message: {
    error:
      "Too many registration attempts. Please try again after 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API: max 100 requests per minute
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload: max 10 uploads per 10 minutes
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    error: "Too many upload attempts. Please wait 10 minutes.",
  },
});
