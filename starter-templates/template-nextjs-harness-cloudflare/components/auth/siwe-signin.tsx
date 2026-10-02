"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { Loader2, Wallet, ExternalLink } from "lucide-react"
import { BrowserProvider } from "ethers"
import { SiweMessage } from "siwe"

declare global {
  interface Window {
    ethereum: any
  }
}

export function SiweSignIn() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSiweSignIn = async () => {
    setIsLoading(true)
    try {
      if (!window.ethereum) {
        window.open(
          "https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en",
          "_blank",
        )
        setIsLoading(false)
        return
      }

      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)

      // 1. Get Nonce from backend
      const nonceResponse = await (authClient as any).siwe.nonce({
        walletAddress: address,
        chainId: chainId,
      })

      if (nonceResponse.error || !nonceResponse.data?.nonce) {
        console.error("Failed to get nonce:", nonceResponse.error)
        throw new Error("Failed to generate nonce")
      }

      const nonce = nonceResponse.data.nonce

      console.log("SIWE Debug:", { domain: window.location.host, address, uri: window.location.origin, chainId, nonce })

      // 2. Create SIWE Message
      // Standard SIWE message format
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in with Ethereum to the app.",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce,
      })

      const preparedMessage = message.prepareMessage()

      // 3. Sign Message with Wallet
      const signature = await signer.signMessage(preparedMessage)

      // 4. Verify Signature & Create Session
      const { data, error } = await (authClient as any).siwe.verify({
        message: preparedMessage,
        signature,
        walletAddress: address,
        chainId: chainId,
      })

      if (error) {
        console.error("SIWE Verify Error:", error)
        setIsLoading(false)
        return
      }

      if (data) {
        router.refresh()

        // Check if user has completed the survey
        try {
          router.push("/dashboard")
        } catch (error) {
          console.error("Error checking survey status:", error)
          // Default to dashboard if check fails
          router.push("/dashboard")
        }
      }
    } catch (error) {
      console.error("SIWE Error:", error)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        onClick={handleSiweSignIn}
        variant="outline"
        size="lg"
        className="w-full bg-transparent"
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wallet className="mr-2 h-5 w-5" />}
        Sign in with MetaMask
      </Button>
      {!window.ethereum && (
        <div className="flex items-start gap-2 p-3 text-sm text-muted-foreground border rounded-lg bg-muted/50">
          <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p className="text-xs">
            MetaMask allows you to sign in with your Ethereum blockchain address. Click the button above to install the
            extension.
          </p>
        </div>
      )}
    </div>
  )
}
