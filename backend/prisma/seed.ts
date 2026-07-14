import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import "dotenv/config";
import bcrypt from "bcrypt";

const DATABASE_URL = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@postgres_db:5432/${process.env.POSTGRES_DB}?schema=public`;

const adapter = new PrismaPg({
    connectionString: DATABASE_URL
})

const prisma = new PrismaClient({
    adapter,
})

const users = [
  { email: "antoine@magneto.com", name: "Antoine", username: "antoine", password: "password" },
  { email: "florian@magneto.com", name: "Florian", username: "florian", password: "password" },
  { email: "françois@magneto.com", name: "François", username: "francois", password: "password" },
  { email: "jutha@magneto.com", name: "Jutha", username: "jutha", password: "password" },
];

async function main() {
  console.log("Seeding database...");
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const upsertedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        password: hashedPassword,
      },
      create: {
        email: user.email,
        username: user.username,
        name: user.name,
        password: hashedPassword,
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
