import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const envDir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(envDir, ".env");

// Also try loading root .env as a fallback (user may have added keys there)
const rootEnvPath = path.join(envDir, "..", ".env");

// Load root .env first, then backend/.env to allow backend to override
try {
	const rootResult = dotenv.config({ path: rootEnvPath });
	if (rootResult.error) {
		// no root env present - that's fine
	} else {
		console.log(`[env] Loaded root .env from ${rootEnvPath}`);
	}
} catch (err) {
	// ignore
}

try {
	const backendResult = dotenv.config({ path: envPath });
	if (backendResult.error) {
		console.warn(`[env] No backend .env found at ${envPath}`);
	} else {
		console.log(`[env] Loaded backend .env from ${envPath}`);
	}
} catch (err) {
	console.error("[env] Failed to load backend .env", err && err.message);
}
