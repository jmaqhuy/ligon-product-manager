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
    avatarUrl?: string | null;
    notificationSettings?: string | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      role: Role;
      fullName: string;
      nameAbbreviation: string;
      avatarUrl?: string | null;
      notificationSettings?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    fullName: string;
    nameAbbreviation: string;
    avatarUrl?: string | null;
    notificationSettings?: string | null;
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

        const email = credentials.email as string;
        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user) return null;

        // Check if account is active
        if (user.status !== "active") {
          throw new Error("Tài khoản đã bị vô hiệu hoá");
        }

        // Rate limiting: check recent failed attempts (last 15 min)
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
        const recentAttempts = await db.auditLog.count({
          where: {
            entityType: "login_attempt",
            fieldName: email,
            changedAt: { gte: fifteenMinAgo },
            oldValue: "failed",
          },
        });

        if (recentAttempts >= 5) {
          throw new Error("Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau 15 phút.");
        }

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        );
        
        if (!isValid) {
          // Log failed attempt
          await db.auditLog.create({
            data: {
              entityType: "login_attempt",
              entityId: user.id,
              fieldName: email,
              oldValue: "failed",
              newValue: String(recentAttempts + 1),
              changedById: user.id,
            },
          });
          return null;
        }

        // Log successful login
        await db.auditLog.create({
          data: {
            entityType: "login_attempt",
            entityId: user.id,
            fieldName: email,
            oldValue: "success",
            newValue: null,
            changedById: user.id,
          },
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role as Role,
          fullName: user.fullName,
          nameAbbreviation: user.nameAbbreviation,
          status: user.status,
          avatarUrl: user.avatarUrl,
          notificationSettings: user.notificationSettings,
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
        token.avatarUrl = user.avatarUrl;
        token.notificationSettings = user.notificationSettings;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.fullName = token.fullName;
        session.user.nameAbbreviation = token.nameAbbreviation;
        session.user.avatarUrl = token.avatarUrl;
        session.user.notificationSettings = token.notificationSettings;
      }
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
