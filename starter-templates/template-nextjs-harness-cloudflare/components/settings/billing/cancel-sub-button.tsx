"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelSubscription() {
	const router = useRouter();
	const [isPending, setIsPending] = useState(false);

	async function handleSubCancellation() {
		try {
			setIsPending(true);
			const loadingToast = toast.loading("Canceling subscription...");

			await authClient.subscription.cancel({
				returnUrl: "/dashboard/plans",
			});

			toast.dismiss(loadingToast);
			toast.success("Subscription canceled successfully");
			
			setTimeout(() => {
				router.refresh();
			}, 3000);
		} catch (error) {
			console.log(error);
			toast.error("Failed to cancel subscription");
		} finally {
			setIsPending(false);
		}
	}

	return (
		<Button
			variant="destructive"
			onClick={handleSubCancellation}
			disabled={isPending}
		>
			{isPending ? "Processing..." : "Cancel subscription"}
		</Button>
	);
}
