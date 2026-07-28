import { prisma } from "../prisma";

export async function checkDbConnection() {
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
        console.error("Failed to connect to database:", error);
        process.exit(1);
    }
}