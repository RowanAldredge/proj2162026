import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  const shopCount = await prisma.shop.count();
  return NextResponse.json({ ok: true, shopCount });
}
