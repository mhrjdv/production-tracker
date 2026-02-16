import { prisma } from "@/lib/db";
import type { AuthUser, AuthUserSync } from "../../types";

export const supabaseUserSync: AuthUserSync = {
  async ensurePrismaUser(authUser: AuthUser): Promise<string> {
    // Check if user already exists by supabase ID
    const bySupabaseId = await prisma.user.findFirst({
      where: {
        OR: [{ id: authUser.id }, { supabaseId: authUser.id }],
      },
      select: { id: true },
    });

    if (bySupabaseId) {
      return bySupabaseId.id;
    }

    // Check by email (for migration: existing user from NextAuth era)
    const byEmail = await prisma.user.findUnique({
      where: { email: authUser.email },
      select: { id: true },
    });

    if (byEmail) {
      // Link existing Prisma user to Supabase
      await prisma.user.update({
        where: { id: byEmail.id },
        data: { supabaseId: authUser.id },
      });
      return byEmail.id;
    }

    // Create new Prisma user
    const created = await prisma.user.create({
      data: {
        supabaseId: authUser.id,
        email: authUser.email,
        name: authUser.name,
        image: authUser.image,
        emailVerified: authUser.emailVerified ? new Date() : null,
        passwordHash: "",
      },
      select: { id: true },
    });

    return created.id;
  },

  async syncProfile(
    authUserId: string,
    updates: Partial<Pick<AuthUser, "name" | "image">>,
  ): Promise<void> {
    // Find by either Prisma ID or Supabase ID
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: authUserId }, { supabaseId: authUserId }],
      },
      select: { id: true },
    });

    if (!user) return;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.image !== undefined ? { image: updates.image } : {}),
      },
    });
  },
};
