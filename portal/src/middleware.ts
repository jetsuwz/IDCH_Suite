import NextAuth from "next-auth"

// Import auth.ts but since middleware cannot run Node.js APIs (only edge),
// we use NextAuth directly with our config if needed, but in next-auth@beta,
// we just export auth as middleware.
export { auth as middleware } from "@/auth"

export const config = {
  // Protects all routes except api, _next/static, _next/image, favicon.ico
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
