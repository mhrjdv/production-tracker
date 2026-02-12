import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-64" />
                    <Skeleton className="h-5 w-40" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                        <CardHeader className="space-y-2">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-2 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
