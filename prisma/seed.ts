import { prisma } from "../src/lib/prisma";

async function main() {
  // ----------------------------
  // 1) Create or reuse demo shop
  // ----------------------------
  const shop = await prisma.shop.upsert({
    where: { shopDomain: "demo-store.myshopify.com" },
    update: {},
    create: { shopDomain: "demo-store.myshopify.com" },
  });

  // ----------------------------
  // 2) Create demo customer
  // ----------------------------
  const customer = await prisma.customer.create({
    data: {
      shopId: shop.id,
      email: "demo@example.com",
      firstName: "Demo",
      lastName: "Customer",
      ordersCount: 1,
      totalSpentCents: 4999,
      firstOrderAt: new Date(),
      lastOrderAt: new Date(),
    },
  });

  // ----------------------------
  // 3) Create demo order
  // ----------------------------
  const order = await prisma.order.create({
    data: {
      shopId: shop.id,
      customerId: customer.id,
      orderNumber: "1001",
      currency: "USD",
      totalPriceCents: 4999,
      processedAt: new Date(),
    },
  });

  // ----------------------------
  // 4) Create demo lifecycle events
  // ----------------------------
  await prisma.event.createMany({
    data: [
      {
        shopId: shop.id,
        customerId: customer.id,
        type: "PRODUCT_VIEW",
        occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        data: {
          productHandle: "demo-product",
          source: "seed",
        },
      },
      {
        shopId: shop.id,
        customerId: customer.id,
        type: "ADD_TO_CART",
        occurredAt: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
        data: {
          productHandle: "demo-product",
          qty: 1,
          source: "seed",
        },
      },
      {
        shopId: shop.id,
        customerId: customer.id,
        type: "PURCHASE",
        occurredAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        data: {
          orderNumber: order.orderNumber,
          totalPriceCents: order.totalPriceCents,
          source: "seed",
        },
      },
      {
        shopId: shop.id,
        customerId: customer.id,
        type: "EMAIL_SENT",
        occurredAt: new Date(), // now
        data: {
          templateKey: "post_purchase_1",
          subject: "Thanks for your order!",
          source: "seed",
        },
      },
    ],
  });

  console.log("Seed complete ✅ (Shop, Customer, Order, Events created)");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
