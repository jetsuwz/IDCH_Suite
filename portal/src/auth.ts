import NextAuth from "next-auth"
import Keycloak from "next-auth/providers/keycloak"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER, // External URL for iss validation
      authorization: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/auth`, // External URL for browser redirect
      token: `${process.env.KEYCLOAK_ISSUER_INTERNAL}/protocol/openid-connect/token`, // Internal Docker URL
      userinfo: `${process.env.KEYCLOAK_ISSUER_INTERNAL}/protocol/openid-connect/userinfo`, // Internal Docker URL
      jwks_endpoint: `${process.env.KEYCLOAK_ISSUER_INTERNAL}/protocol/openid-connect/certs`, // Internal Docker URL
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }
      
      return true;
    },
  },
})
