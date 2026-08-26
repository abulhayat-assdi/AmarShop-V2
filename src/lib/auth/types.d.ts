import type { DefaultSession } from "next-auth";

type StaffRole = "owner" | "admin" | "staff";

declare module "next-auth" {
  interface User {
    storeId: string;
    role: StaffRole;
    isPlatformAdmin: boolean;
  }

  interface Session {
    user: {
      storeId: string;
      role: StaffRole;
      isPlatformAdmin: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    storeId?: string;
    role?: StaffRole;
    isPlatformAdmin?: boolean;
  }
}
