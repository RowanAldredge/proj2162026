import { Customer, Event, EventType } from "@prisma/client";

export type LifecycleStage =
  | "WINDOW_SHOPPER"
  | "FIRST_TIME_BUYER"
  | "REPEAT_BUYER"
  | "VIP";

export type Mission = "CART_RECOVERY" | "WINBACK";

export type NextEmailKey = "cart_recovery_1" | "winback_1" | "stage_nurture_1";

export type LifecycleDecision = {
  stage: LifecycleStage;
  missions: Mission[];
  nextEmailKey: NextEmailKey;
  reason: string[];
};

// -----------------------------
// Config (make configurable later)
// -----------------------------
const VIP_MIN_ORDERS = 5;
const VIP_MIN_SPEND_CENTS = 50_000; // $500
const CART_LOOKBACK_HOURS = 24;
const WINBACK_INACTIVE_DAYS = 75;

// -----------------------------
// Stage = stable identity
// -----------------------------
export function computeStage(customer: Pick<Customer, "ordersCount" | "totalSpentCents">): LifecycleStage {
  if (customer.ordersCount >= VIP_MIN_ORDERS || customer.totalSpentCents >= VIP_MIN_SPEND_CENTS) return "VIP";
  if (customer.ordersCount >= 2) return "REPEAT_BUYER";
  if (customer.ordersCount === 1) return "FIRST_TIME_BUYER";
  return "WINDOW_SHOPPER";
}

// -----------------------------
// Missions = situational overlays
// -----------------------------
export function computeMissions(args: {
  customer: Pick<Customer, "ordersCount" | "lastOrderAt">;
  events: Pick<Event, "type" | "occurredAt">[];
  now?: Date;
}): { missions: Mission[]; reason: string[] } {
  const now = args.now ?? new Date();
  const reason: string[] = [];
  const missions: Mission[] = [];

  // WINBACK: bought before, inactive for N days
  if (args.customer.ordersCount >= 1 && args.customer.lastOrderAt) {
    const daysSince = diffDays(now, args.customer.lastOrderAt);
    if (daysSince >= WINBACK_INACTIVE_DAYS) {
      missions.push("WINBACK");
      reason.push(`WINBACK: lastOrderAt was ${daysSince}d ago (>= ${WINBACK_INACTIVE_DAYS}d).`);
    }
  }

  // CART_RECOVERY: cart/checkout in last 24h and no purchase AFTER that event
  const lookback = new Date(now.getTime() - CART_LOOKBACK_HOURS * 60 * 60 * 1000);

  const recentCartOrCheckout = args.events
    .filter((e) => e.occurredAt >= lookback)
    .filter((e) => e.type === EventType.ADD_TO_CART || e.type === EventType.CHECKOUT_STARTED)
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];

  if (recentCartOrCheckout) {
    const purchaseAfter = args.events.some(
      (e) => e.type === EventType.PURCHASE && e.occurredAt > recentCartOrCheckout.occurredAt,
    );

    if (!purchaseAfter) {
      missions.push("CART_RECOVERY");
      reason.push(
        `CART_RECOVERY: ${recentCartOrCheckout.type} at ${recentCartOrCheckout.occurredAt.toISOString()} with no PURCHASE after.`,
      );
    }
  }

  // Priority order (optional): CART should generally be first in list
  missions.sort((a, b) => missionPriority(b) - missionPriority(a));

  return { missions, reason };
}

// -----------------------------
// Next Best Email (simple V1)
// -----------------------------
export function decideNextEmail(stage: LifecycleStage, missions: Mission[]): { nextEmailKey: NextEmailKey; reason: string } {
  if (missions.includes("CART_RECOVERY")) {
    return { nextEmailKey: "cart_recovery_1", reason: "CART_RECOVERY mission active → send cart_recovery_1." };
  }
  if (missions.includes("WINBACK")) {
    return { nextEmailKey: "winback_1", reason: "WINBACK mission active → send winback_1." };
  }
  return { nextEmailKey: "stage_nurture_1", reason: `No missions active → send stage_nurture_1 for stage ${stage}.` };
}

// -----------------------------
// Full decision
// -----------------------------
export function computeLifecycleDecision(args: {
  customer: Pick<Customer, "ordersCount" | "totalSpentCents" | "lastOrderAt">;
  events: Pick<Event, "type" | "occurredAt">[];
  now?: Date;
}): LifecycleDecision {
  const stage = computeStage(args.customer);
  const { missions, reason: missionReason } = computeMissions({ customer: args.customer, events: args.events, now: args.now });
  const next = decideNextEmail(stage, missions);

  return {
    stage,
    missions,
    nextEmailKey: next.nextEmailKey,
    reason: [`STAGE: ${stage}.`, ...missionReason, `NEXT: ${next.reason}`],
  };
}

// -----------------------------
// Helpers
// -----------------------------
function diffDays(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function missionPriority(m: Mission) {
  switch (m) {
    case "CART_RECOVERY":
      return 2;
    case "WINBACK":
      return 1;
    default:
      return 0;
  }
}
