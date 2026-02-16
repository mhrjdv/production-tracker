"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { supabaseUserSync } from "@/lib/auth/providers/supabase/sync";
import { createSupabaseServerClient } from "@/lib/auth/providers/supabase/server-client";

/** Server action to ensure Prisma user exists after Supabase signup */
export async function ensurePrismaUserAction(authUser: {
  id: string;
  email: string;
  name: string | null;
}) {
  await supabaseUserSync.ensurePrismaUser({
    id: authUser.id,
    email: authUser.email,
    name: authUser.name,
    image: null,
    emailVerified: false,
  });
}

/** Server action to update user profile (name) */
export async function updateProfileAction(data: { name: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Update Prisma user
  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: data.name },
  });

  // Update Supabase user metadata
  const supabase = await createSupabaseServerClient();
  await supabase.auth.updateUser({
    data: { name: data.name },
  });

  revalidatePath("/settings/profile");
}
