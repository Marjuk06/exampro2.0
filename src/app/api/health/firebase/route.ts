import { NextResponse } from "next/server";
import { validateFirebaseAdminConfig } from "@/lib/firebase/admin";
import { requireAdmin } from "@/server/auth/require-admin";
import { jsonError } from "@/server/api/response";

/**
 * Admin-only diagnostic — validates Firebase Admin credential parsing.
 * GET /api/health/firebase
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    try {
      await requireAdmin();
    } catch (e) {
      return jsonError(e);
    }
  }
  const validation = validateFirebaseAdminConfig();

  if (!validation.ok) {
    return NextResponse.json(
      {
        status: "error",
        admin: false,
        error: validation.error,
        hint:
          "Place service-account.json in project root (recommended), or set FIREBASE_PRIVATE_KEY / FIREBASE_SERVICE_ACCOUNT_JSON.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "ok",
    admin: true,
    projectId: validation.projectId,
    clientEmail: validation.clientEmail,
  });
}
