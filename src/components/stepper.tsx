"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
    title: string;
    description?: string;
}

interface StepperProps {
    steps: Step[];
    currentStep: number;
    className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
    return (
        <div className={cn("w-full", className)}>
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;
                    const isLast = index === steps.length - 1;

                    return (
                        <div
                            key={step.title}
                            className="flex items-center flex-1 last:flex-none"
                        >
                            {/* Step Circle */}
                            <div className="flex flex-col items-center gap-2">
                                <div
                                    className={cn(
                                        "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 border-2",
                                        isCompleted
                                            ? "bg-primary border-primary text-primary-foreground"
                                            : isCurrent
                                                ? "border-primary text-primary bg-primary/10"
                                                : "border-muted text-muted-foreground bg-muted/50"
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check className="h-5 w-5" />
                                    ) : (
                                        index + 1
                                    )}
                                </div>
                                <div className="text-center">
                                    <p
                                        className={cn(
                                            "text-xs font-medium transition-colors",
                                            isCurrent || isCompleted
                                                ? "text-foreground"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {step.title}
                                    </p>
                                    {step.description && (
                                        <p className="text-xs text-muted-foreground hidden sm:block mt-0.5">
                                            {step.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Connector Line */}
                            {!isLast && (
                                <div className="flex-1 mx-3 mt-[-1.75rem]">
                                    <div
                                        className={cn(
                                            "h-0.5 transition-all duration-300",
                                            isCompleted ? "bg-primary" : "bg-muted"
                                        )}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
