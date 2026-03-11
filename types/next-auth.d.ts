import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      phoneNumber?: string;
      role: string;
      gradeTagId?: string | null;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
    role: string;
    gradeTagId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
    role: string;
    gradeTagId?: string | null;
  }
} 