import type { z } from "zod";
import { ApiError, jsonError, jsonOk } from "@/server/api/response";
import { securityLog } from "@/server/security/logger";
import { rateLimit } from "@/server/security/rate-limit";

type RouteHandler = (request: Request, context?: unknown) => Promise<Response>;

export function withApiHandler(
  handler: RouteHandler,
  options?: { rateLimitKey?: (req: Request) => string }
): RouteHandler {
  return async (request, context) => {
    try {
      if (options?.rateLimitKey) {
        const key = options.rateLimitKey(request);
        const rl = await rateLimit(key);
        if (!rl.ok) {
          securityLog("rate_limit", { key });
          return jsonError(new ApiError(429, "Too many requests"));
        }
      }
      return await handler(request, context);
    } catch (e) {
      return jsonError(e);
    }
  };
}

export async function parseJson<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "Validation failed", "VALIDATION_ERROR");
  }
  return parsed.data;
}

export { jsonOk, jsonError };
