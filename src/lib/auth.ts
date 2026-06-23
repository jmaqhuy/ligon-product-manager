import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "./db";
import type { Role } from "./permissions";

declare module "next-auth" {
  interface User {
    role: Role;
    fullName: string;
    nameAbbreviation: string;
    status: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      role: Role;
      fullName: string;
      nameAbbreviation: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    fullName: string;
    nameAbbreviation: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        // Check if account is active
        if (user.status !== "active") {
          throw new Error("Tài khoản đã bị vô hiệu hoá");
        }

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role as Role,
          fullName: user.fullName,
          nameAbbreviation: user.nameAbbreviation,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.fullName = user.fullName;
        token.nameAbbreviation = user.nameAbbreviation;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.fullName = token.fullName;
      session.user.nameAbbreviation = token.nameAbbreviation;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
