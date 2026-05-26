"use server";
import { auth } from "@/auth";

export async function getPendingTasks() {
  const session = await auth();
  if (!session) return { count: 0, error: "Not authenticated" };

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1000);
    
    // Attempt real connection, fallback to mock if Odoo not ready
    const response = await fetch("http://workspace_odoo:8069/api/tasks", {
      method: "GET",
      headers: { "Authorization": `Bearer ${session.user?.email}` },
      signal: controller.signal
    });
    clearTimeout(id);
    
    if (response.ok) {
      const data = await response.json();
      return { count: data.length };
    }
    throw new Error("Odoo API error");
  } catch (error) {
    // Fallback Mock Data
    return { count: 8, isMock: true };
  }
}
