"use client"

import { GoogleSignIn } from "@/components/auth/google-signin"
import { SiweSignIn } from "@/components/auth/siwe-signin"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME;

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden">
              <Image
                src="/apple-touch-icon.png"
                alt="Logo"
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="text-2xl font-bold">{APP_NAME}</span>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">
              Sign in to access your dashboard
            </p>
          </div>

          <div className="w-full space-y-4">
            <GoogleSignIn />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <SiweSignIn />
          </div>

          <div className="text-center text-sm text-muted-foreground">
            {/* <Link href="/demo" className="underline hover:text-foreground">
              Try the demo
            </Link> */}
            <Link href="/" className="underline hover:text-foreground">
              Homepage
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
