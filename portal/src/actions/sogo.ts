"use server";
import { auth } from "@/auth";

export async function getUnreadEmails() {
  const session = await auth();
  if (!session) return { count: 0, error: "Not authenticated" };

  // Mock implementation for SOGo
  return {
    count: 12,
    lastFetch: new Date().toISOString(),
  };
}
