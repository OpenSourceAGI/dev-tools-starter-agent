import { NextResponse } from "next/server";
import json from "@/lib/openapi/core-api.json";

export async function GET() {
  return NextResponse.json(json);
}
