import { NextResponse } from "next/server";

const START_TIME = Date.now();
const VERSION = process.env.npm_package_version ?? "2.0.0";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      version: VERSION,
      uptime: Math.floor((Date.now() - START_TIME) / 1000),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? "development",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
