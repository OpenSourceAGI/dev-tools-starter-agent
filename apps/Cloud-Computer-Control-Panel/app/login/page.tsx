"use client"

import Link from "next/link"
import { Cloud } from "lucide-react"
import { Card } from "@/components/ui/card"
import { EmailSignIn } from "@/components/auth/email-signin"
import { GoogleSignIn } from "@/components/auth/google-signin"
import { hasGoogleSignIn } from "@/lib/auth-client"
import { APP_NAME } from "@/lib/constants"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Cloud className="h-6 w-6 text-rose-800" />
            </div>
            <span className="text-2xl font-bold">{APP_NAME}</span>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
            <p className="text-muted-foreground">
              Sign in to manage your cloud instances and stored credentials
            </p>
          </div>

          <div className="w-full space-y-4">
            <GoogleSignIn />

            {hasGoogleSignIn && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>
            )}

            <EmailSignIn />
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <Link href="/" className="underline hover:text-foreground">
              Back to homepage
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
