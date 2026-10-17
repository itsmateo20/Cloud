import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function isPrivateAccess(userId) {
    const token = (await cookies()).get("private_access")?.value;
    if (!token) return false;
    try {
        const payload = jwt.verify(token, process.env.AUTH_SECRET);
        return payload?.typ === "private" && Number(payload.userId) === Number(userId);
    } catch {
        return false;
    }
}
