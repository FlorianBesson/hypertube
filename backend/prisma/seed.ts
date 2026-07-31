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
  { email: "antoine@magneto.com", firstName: "Antoine", lastName: "Griezmine", username: "antoine", password: "password", preferredLanguage: "fr", photo: "/antoine.jpg" },
  { email: "florian@magneto.com", firstName: "Florian", lastName: "Thauvin", username: "florian", password: "password", preferredLanguage: "en", photo: "/florian.jpg" },
  { email: "françois@magneto.com", firstName: "François", lastName: "Fillon", username: "francois", password: "password", preferredLanguage: "es", photo: "/francois.jpg" },
  { email: "jutha@magneto.com", firstName: "Jutha", lastName: "Kleinschmidt", username: "jutha", password: "password", preferredLanguage: "fr", photo: "/jutha.jpg" },
];

async function main() {
  console.log("Seeding database...");
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const upsertedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        password: hashedPassword,
        preferredLanguage: user.preferredLanguage,
        photo: user.photo,
      },
      create: {
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        password: hashedPassword,
        preferredLanguage: user.preferredLanguage,
        photo: user.photo,
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
