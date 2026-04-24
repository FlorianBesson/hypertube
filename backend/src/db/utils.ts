import { prisma } from "../server";

export async function checkDbConnection() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log("Database connection established.");
    } catch (error) {
        console.error("Failed to connect to database:", error);
        process.exit(1);
    }
}