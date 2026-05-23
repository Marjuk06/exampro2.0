import { createPrivateKey } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Normalizes Firebase service account credentials from environment variables.
 * Handles common .env / Vercel formatting issues with multiline private keys.
 */

export interface FirebaseAdminCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export class FirebaseCredentialsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebaseCredentialsError";
  }
}

/**
 * Converts escaped/newline variants into a valid PEM private key string.
 */
export function normalizePrivateKey(raw: string): string {
  let key = raw.trim();

  // Strip wrapping quotes (single or double)
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // Unescape literal \n sequences (dotenv, Vercel, JSON string exports)
  key = key.replace(/\\n/g, "\n");

  // Handle double-escaped \\n from some CI/CD secret stores
  if (key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n");
  }

  // Collapse accidental Windows CRLF artifacts
  key = key.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // If only base64 body was pasted, wrap in PEM headers
  if (!key.includes("BEGIN PRIVATE KEY") && !key.includes("BEGIN RSA PRIVATE KEY")) {
    const compact = key.replace(/\s/g, "");
    if (compact.length > 64 && /^[A-Za-z0-9+/=]+$/.test(compact)) {
      const lines = compact.match(/.{1,64}/g) ?? [compact];
      key = `-----BEGIN PRIVATE KEY-----\n${lines.join("\n")}\n-----END PRIVATE KEY-----\n`;
    }
  }

  if (
    !key.includes("BEGIN PRIVATE KEY") &&
    !key.includes("BEGIN RSA PRIVATE KEY")
  ) {
    throw new FirebaseCredentialsError(
      "FIREBASE_PRIVATE_KEY is not a valid PEM key. Copy the full `private_key` value from your " +
        "Firebase service account JSON (starts with -----BEGIN PRIVATE KEY-----). " +
        "In .env.local use: FIREBASE_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n\""
    );
  }

  return key.endsWith("\n") ? key : `${key}\n`;
}

function loadServiceAccountFromFile(): FirebaseAdminCredentials | null {
  const path =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    resolve(process.cwd(), "service-account.json");

  if (!existsSync(path)) return null;

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new FirebaseCredentialsError(
        `service account file at ${path} is missing project_id, client_email, or private_key`
      );
    }

    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: normalizePrivateKey(parsed.private_key),
    };
  } catch (e) {
    if (e instanceof FirebaseCredentialsError) throw e;
    throw new FirebaseCredentialsError(
      `Failed to read service account file (${path}): ${e instanceof Error ? e.message : "invalid JSON"}`
    );
  }
}

/**
 * Load credentials from env. Supports (in order):
 * - service-account.json file (or FIREBASE_SERVICE_ACCOUNT_PATH)
 * - FIREBASE_SERVICE_ACCOUNT_JSON (full JSON string)
 * - FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 */
export function getFirebaseAdminCredentials(): FirebaseAdminCredentials {
  const fromFile = loadServiceAccountFromFile();
  if (fromFile) return fromFile;

  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      const projectId = parsed.project_id ?? process.env.FIREBASE_PROJECT_ID;
      const clientEmail = parsed.client_email ?? process.env.FIREBASE_CLIENT_EMAIL;
      const privateKeyRaw = parsed.private_key ?? process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKeyRaw) {
        throw new FirebaseCredentialsError(
          "FIREBASE_SERVICE_ACCOUNT_JSON is missing project_id, client_email, or private_key"
        );
      }

      return {
        projectId,
        clientEmail,
        privateKey: normalizePrivateKey(privateKeyRaw),
      };
    } catch (e) {
      if (e instanceof FirebaseCredentialsError) throw e;
      throw new FirebaseCredentialsError(
        `Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: ${e instanceof Error ? e.message : "invalid JSON"}`
      );
    }
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new FirebaseCredentialsError(
      "Firebase Admin credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, " +
        "and FIREBASE_PRIVATE_KEY (or FIREBASE_SERVICE_ACCOUNT_JSON)."
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKeyRaw),
  };
}

/** Validates that Admin SDK can parse the private key without initializing Firebase. */
export function validatePrivateKeyPem(privateKey: string): boolean {
  try {
    createPrivateKey(privateKey);
    return true;
  } catch {
    return false;
  }
}

export function validateFirebaseAdminConfig(): {
  ok: boolean;
  error?: string;
  projectId?: string;
  clientEmail?: string;
} {
  try {
    const creds = getFirebaseAdminCredentials();
    if (!validatePrivateKeyPem(creds.privateKey)) {
      return {
        ok: false,
        error:
          "Private key PEM parsed but failed cryptographic validation. Re-copy private_key from service account JSON.",
      };
    }
    return {
      ok: true,
      projectId: creds.projectId,
      clientEmail: creds.clientEmail,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unknown credentials error",
    };
  }
}
