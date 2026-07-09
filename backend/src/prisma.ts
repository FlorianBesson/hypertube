import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import "dotenv/config";

// Build Postgres connection string using variables injected from .env file
const DATABASE_URL = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@postgres_db:5432/${process.env.POSTGRES_DB}?schema=public`;

// Initialize the Prisma Pg adapter for Postgres compatibility
const adapter = new PrismaPg({
    connectionString: DATABASE_URL
});

// Instantiate and export the Prisma Client instance to perform database operations
export const prisma = new PrismaClient({
    adapter,
});
