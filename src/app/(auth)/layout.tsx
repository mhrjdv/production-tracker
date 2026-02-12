export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
            <div className="w-full max-w-md px-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Production Tracker
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Manage your film & animation productions
                    </p>
                </div>
                {children}
            </div>
        </div>
    );
}
