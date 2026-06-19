import "../env.js";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { upsertGoogleUser } from "../controllers/authController.js";

export const isGoogleOAuthConfigured = () => {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL &&
    process.env.FRONTEND_URL
  );
};

const isGoogleEmailVerified = (profile) => {
  const googleJson = profile?._json || {};
  return (
    googleJson.email_verified === true ||
    googleJson.email_verified === "true" ||
    googleJson.verified_email === true ||
    googleJson.verified_email === "true"
  );
};

export const configureGooglePassport = () => {
  if (!isGoogleOAuthConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("Missing Google OAuth environment variables");
    }
    return false;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: false
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          if (!isGoogleEmailVerified(profile)) {
            const error = new Error("Google email is not verified");
            error.statusCode = 401;
            return done(error);
          }

          const user = await upsertGoogleUser(profile);
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  return true;
};
