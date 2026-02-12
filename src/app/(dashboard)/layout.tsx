import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Navigation } from "@/components/navigation";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardLayoutFallback() {
    return (
        <div className="min-h-screen">
            <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
                <Skeleton className="h-full w-full" />
            </div>
            <main className="md:pl-64">
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                    <Skeleton className="h-8 w-64 mb-4" />
                    <Skeleton className="h-4 w-40" />
                </div>
            </main>
        </div>
    );
}

async function DashboardShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    return (
        <div className="min-h-screen">
            <Navigation />
            <main className="md:pl-64">
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={<DashboardLayoutFallback />}>
            <DashboardShell>{children}</DashboardShell>
        </Suspense>
    );
}
