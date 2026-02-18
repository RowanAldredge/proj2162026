import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { computeLifecycleDecision } from "@/src/server/lifecycle/engine";

export async function GET() {
  // Grab your seeded customer
  const customer = await prisma.customer.findFirst({
    where: { email: "demo@example.com" },
    orderBy: { createdAt: "desc" },
  });

  if (!customer) {
    return NextResponse.json({ ok: false, error: "No demo customer found. Run seed." }, { status: 404 });
  }

  const events = await prisma.event.findMany({
    where: { customerId: customer.id },
    select: { type: true, occurredAt: true },
    orderBy: { occurredAt: "asc" },
  });

  const decision = computeLifecycleDecision({
    customer: {
      ordersCount: customer.ordersCount,
      totalSpentCents: customer.totalSpentCents,
      lastOrderAt: customer.lastOrderAt,
    },
    events,
  });

  return NextResponse.json({
    ok: true,
    customer: { id: customer.id, email: customer.email, ordersCount: customer.ordersCount, totalSpentCents: customer.totalSpentCents, lastOrderAt: customer.lastOrderAt },
    events,
    decision,
  });
}
