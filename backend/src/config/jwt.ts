if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from environment variables");
}

export const JWT_SECRET: string = process.env.JWT_SECRET;
