"use client"
import { Button } from "@/components/ui/button"
import type { Plan } from "@/lib/payments/plans"
import { authClient } from "@/lib/auth-client"
import { updateExistingSubscription } from "@/lib/payments/actions"
import { toast } from "sonner"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface SubscriptionButtonProps {
    buttonText: string
    plan: Plan
    activeSub?: any
    subId?: string
}

export default function SubscriptionButton({
    buttonText,
    plan,
    activeSub,
    subId
}: SubscriptionButtonProps) {
    const router = useRouter()
    const [isPending, setIsPending] = useState(false)

    const handleSubscription = async () => {
        try {
            setIsPending(true)

            if (activeSub && subId) {
                // Update existing subscription
                const loadingToast = toast.loading("Updating subscription...")
                
                const result = await updateExistingSubscription(subId, plan.priceId)
                console.log({ result })

                toast.dismiss(loadingToast)

                if (result.status) {
                    toast.success(
                        result.message || "Subscription updated successfully"
                    )
                    setTimeout(() => {
                        router.refresh()
                    }, 3000)
                } else {
                    toast.error(result.message || "Failed to update subscription")
                }
            } else {
                // Create new subscription
                const { error } = await authClient.subscription.upgrade({
                    plan: plan.name,
                    successUrl: "/dashboard/billing",
                    cancelUrl: "/dashboard/billing"
                })
                
                if (error) {
                    console.log(error)
                    toast.error("Failed to create subscription")
                }
            }
        } catch (err) {
            console.log(err)
            toast.error("An unexpected error occurred")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Button
            onClick={handleSubscription}
            disabled={isPending}
        >
            {isPending ? "Processing..." : buttonText}
        </Button>
    )
}
