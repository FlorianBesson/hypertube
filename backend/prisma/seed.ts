import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import "dotenv/config";

const DATABASE_URL = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@postgres_db:5432/${process.env.POSTGRES_DB}?schema=public`;

const adapter = new PrismaPg({
    connectionString: DATABASE_URL
})

const prisma = new PrismaClient({
    adapter,
})

const users = [
  { email: "antoine@magneto.com", name: "Antoine", password: "password" },
  { email: "florian@magneto.com", name: "Florian", password: "password" },
  { email: "françois@magneto.com", name: "François", password: "password" },
  { email: "jutha@magneto.com", name: "Jutha", password: "password" },
];

async function main() {
  console.log("Seeding database...");
  for (const user of users) {
    const upsertedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        password: user.password,
      },
      create: {
        email: user.email,
        name: user.name,
        password: user.password,
      },
    });
    console.log(`Upserted user: ${upsertedUser.email}`);
  }
  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
