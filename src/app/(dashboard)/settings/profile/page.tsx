import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { ProfileClient } from "./profile-client";

export const metadata = {
  title: "Profile Settings",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      supabaseId: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>
      <ProfileClient
        user={{
          id: user.id,
          name: user.name ?? "",
          email: user.email,
          image: user.image,
          createdAt: user.createdAt.toISOString(),
        }}
      />
    </div>
  );
}
