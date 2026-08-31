import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

type StaffLoginRow = {
  id: string;
  store_id: string;
  password_hash: string;
  role: "owner" | "admin" | "staff";
  is_platform_admin: boolean;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Self-hosted behind a trusted proxy (Caddy) and used on more than one
  // origin in dev (http://localhost via Caddy AND http://localhost:3000
  // via `pnpm dev`). Trust the forwarded Host so auth works on both
  // without juggling AUTH_URL — the recommended setting for non-Vercel
  // Auth.js deployments.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        // Runs on the shared platform host, before any store_id is known —
        // see auth_lookup_staff_by_email() in src/db/migrations for why this
        // one lookup can't go through the normal RLS-gated query path.
        const rows = await db.execute<StaffLoginRow>(
          sql`select * from auth_lookup_staff_by_email(${email})`
        );
        const staff = rows[0];
        if (!staff) return null;

        const passwordMatches = await bcrypt.compare(password, staff.password_hash);
        if (!passwordMatches) return null;

        return {
          id: staff.id,
          email,
          storeId: staff.store_id,
          role: staff.role,
          isPlatformAdmin: staff.is_platform_admin,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.storeId = user.storeId;
        token.role = user.role;
        token.isPlatformAdmin = user.isPlatformAdmin;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.storeId = token.storeId as string;
        session.user.role = token.role as "owner" | "admin" | "staff";
        session.user.isPlatformAdmin = token.isPlatformAdmin as boolean;
      }
      return session;
    },
  },
});
