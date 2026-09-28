import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role?: "LIDER" | "ADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "LIDER" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "LIDER" | "ADMIN";
  }
}
