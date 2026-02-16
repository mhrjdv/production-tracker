import { BeamsBackground } from "@/components/ui/beams-background";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BeamsBackground>
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Lazer
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate anywhere, decide here, ship with traceability
          </p>
        </div>
        {children}
      </div>
    </BeamsBackground>
  );
}
