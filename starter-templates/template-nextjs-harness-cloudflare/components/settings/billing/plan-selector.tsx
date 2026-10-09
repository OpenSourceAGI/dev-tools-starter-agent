"use client"

import { useState, useId } from "react"
import { CheckIcon } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter
} from "@/components/ui/card"
import { plans } from "@/lib/payments/plans"
import SubscriptionButton from "./subscription-button"

interface PlanSelectorProps {
    activeSub: any
    session: any
}

export default function PlanSelector({
    activeSub,
    session
}: PlanSelectorProps) {
    const [selectedPlan, setSelectedPlan] = useState(
        activeSub?.plan
            ? plans.find((p) => p.name === activeSub.plan)?.id.toString() ||
                  plans[0].id.toString()
            : plans[0].id.toString()
    )
    const id = useId()

    const currentPlan = plans.find(
        (plan) => plan.id.toString() === selectedPlan
    )
    const buttonText = activeSub ? "Switch to this plan" : "Subscribe"

    return (
        <Card className="mx-auto max-w-3xl">
            <CardHeader>
                <CardTitle>Choose Your Plan</CardTitle>
                <CardDescription>
                    Select the plan that best fits your needs
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                <RadioGroup
                    className="gap-2"
                    value={selectedPlan}
                    onValueChange={setSelectedPlan}
                >
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className="relative flex w-full items-center gap-2 rounded-md border border-input px-4 py-3 shadow-xs outline-none has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-accent"
                        >
                            <RadioGroupItem
                                value={plan.id.toString()}
                                id={`${id}-${plan.id}`}
                                aria-describedby={`${id}-${plan.id}-description`}
                                className="order-1 after:absolute after:inset-0"
                            />
                            <div className="grid grow gap-1">
                                <Label
                                    htmlFor={`${id}-${plan.id}`}
                                    className="font-medium capitalize"
                                >
                                    {plan.name}
                                </Label>
                                <p
                                    id={`${id}-${plan.id}-description`}
                                    className="text-muted-foreground text-sm"
                                >
                                    ${plan.price} per month
                                </p>
                                {plan.trialDays > 0 && (
                                    <span className="text-xs">
                                    {plan.trialDays}-day free trial
                                    </span>
                                )}
                            </div>
                            {activeSub?.plan === plan.name && (
                                <div className="font-medium text-green-500 text-sm">
                                    Current Plan
                                </div>
                            )}
                        </div>
                    ))}
                </RadioGroup>

                {currentPlan && (
                    <div className="space-y-3">
                        <p>
                            <strong className="font-medium text-sm">
                                Features include:
                            </strong>
                        </p>
                        <ul className="space-y-2 text-muted-foreground text-sm">
                            {currentPlan.features.map((feature, index) => (
                                <li key={index} className="flex gap-2">
                                    <CheckIcon
                                        size={16}
                                        className="mt-0.5 shrink-0 text-primary"
                                        aria-hidden="true"
                                    />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>

            <CardFooter className="flex items-center justify-end gap-4">
                <div className="flex flex-col items-end gap-2">
                    {activeSub?.plan === currentPlan?.name ? (
                        <>
                            {activeSub.cancelAtPeriodEnd ? (
                                <p className="text-right text-destructive text-xs">
                                    Your subscription will be cancelled on:{" "}
                                    {activeSub.periodEnd?.toLocaleDateString()}
                                </p>
                            ) : (
                                <p className="text-right font-bold text-green-500 text-sm">
                                    You are subscribed to this plan.
                                </p>
                            )}
                        </>
                    ) : currentPlan ? (
                        <SubscriptionButton
                            buttonText={buttonText}
                            plan={currentPlan}
                            activeSub={activeSub}
                            subId={activeSub?.stripeSubscriptionId as string}
                        />
                    ) : null}
                </div>
            </CardFooter>
        </Card>
    )
}
