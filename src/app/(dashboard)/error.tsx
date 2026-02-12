"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <Card className="mx-auto max-w-lg mt-16">
            <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
                <p className="text-muted-foreground text-center mb-6 text-sm">
                    {error.message || "An unexpected error occurred"}
                </p>
                <Button onClick={reset}>Try Again</Button>
            </CardContent>
        </Card>
    );
}
