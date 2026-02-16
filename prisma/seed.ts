import { prisma } from "../src/lib/prisma";

async function main() {
  const shop = await prisma.shop.upsert({
    where: { shopDomain: "demo-store.myshopify.com" },
    update: {},
    create: { shopDomain: "demo-store.myshopify.com" },
  });

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

  await prisma.order.create({
    data: {
      shopId: shop.id,
      customerId: customer.id,
      orderNumber: "1001",
      currency: "USD",
      totalPriceCents: 4999,
      processedAt: new Date(),
    },
  });

  console.log("Seed complete ✅");
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
