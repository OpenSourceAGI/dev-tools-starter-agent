"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { plans, type Plan } from "@/lib/payments/plans";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function PremiumUpgrade() {
    const { data: session } = authClient.useSession();
    const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null);

    const handleUpgrade = async (plan: Plan) => {
        setLoadingPlanId(plan.id);
        try {
            // Direct link to Stripe checkout
            window.location.href = plan.paymentURL;
        } catch (error) {
            console.error("Subscription error:", error);
            toast.error("Failed to start subscription process");
        } finally {
            setLoadingPlanId(null);
        }
    };

    // Filter out free plans if you only want to show upgrades,
    // or show all. Typically upgrades are paid.
    // Assuming 'price > 0' means paid.
    const upgradePlans = plans.filter(p => p.price > 0);

    return (
        <Card className="w-full border-primary/20 bg-primary/5 mb-8">
            <CardHeader>
                <CardTitle className="text-2xl text-primary">Upgrade Your Plan</CardTitle>
                <CardDescription>
                    Unlock advanced features and higher limits with our premium plans.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upgradePlans.map((plan) => {
                        return (
                            <Card key={plan.id} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-center">
                                        {plan.name.charAt(0).toUpperCase() + plan.name.slice(1)}
                                    </CardTitle>
                                    <div className="text-3xl font-bold">
                                        ${plan.price}
                                        <span className="text-sm font-normal text-muted-foreground">/month</span>
                                    </div>
                                    {plan.trialDays > 0 && (
                                        <div className="text-sm text-green-600 font-medium">
                                            {plan.trialDays}-day free trial
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <ul className="space-y-2 text-sm">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-2">
                                                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        className="w-full"
                                        onClick={() => handleUpgrade(plan)}
                                        disabled={loadingPlanId === plan.id}
                                    >
                                        {loadingPlanId === plan.id ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Redirecting...
                                            </>
                                        ) : (
                                            `Upgrade to ${plan.name}`
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
