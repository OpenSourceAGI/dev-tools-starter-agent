"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Key, ExternalLink, AlertCircle, X, Trash2, Loader2, ShieldCheck } from "lucide-react"
import { DEFAULT_AWS_REGION } from "@/lib/constants"

export interface StoredCredentials {
  provider: string
  label: string
  region: string
  /** Only the masked key id ever reaches the browser — never the secret. */
  accessKeyIdMasked: string
  updatedAt?: string | null
  lastVerifiedAt?: string | null
}

interface CredentialsSettingsProps {
  stored: StoredCredentials | null
  hasServerCredentials: boolean
  onSaved: () => void | Promise<void>
  /** Omitted while the user has no credentials at all — the form can't be dismissed then. */
  onClose?: () => void
}

export function CredentialsSettings({
  stored,
  hasServerCredentials,
  onSaved,
  onClose,
}: CredentialsSettingsProps) {
  const [formData, setFormData] = useState({
    accessKeyId: "",
    secretAccessKey: "",
    region: stored?.region || DEFAULT_AWS_REGION,
  })
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Failed to save credentials")
        return
      }

      setFormData({ accessKeyId: "", secretAccessKey: "", region: data.credentials?.region || formData.region })
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save credentials")
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    setError("")

    try {
      const response = await fetch("/api/credentials", { method: "DELETE" })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.message || "Failed to remove credentials")
        return
      }

      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove credentials")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            IAM Credentials Management
          </CardTitle>
          <CardDescription>
            {stored
              ? "Replace the AWS credentials stored for your account"
              : "Save AWS credentials to your account"}
          </CardDescription>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {stored && (
          <Alert className="mb-6 bg-green-500/5 border-green-500/20">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-500">Credentials saved</AlertTitle>
            <AlertDescription className="text-sm">
              Using <span className="font-mono">{stored.accessKeyIdMasked}</span> in{" "}
              <span className="font-mono">{stored.region}</span>. The secret key is encrypted at rest and is only
              decrypted on the server when a request is made on your behalf.
            </AlertDescription>
          </Alert>
        )}

        {!stored && hasServerCredentials && (
          <Alert className="mb-6 bg-blue-500/5 border-blue-500/20">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-500">Using environment variables</AlertTitle>
            <AlertDescription className="text-sm">
              This server has AWS credentials in its environment. Save your own below to use them instead.
            </AlertDescription>
          </Alert>
        )}

        <Alert className="mb-6 bg-blue-500/5 border-blue-500/20">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-500">How to get AWS IAM credentials</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <p className="text-sm">Follow these guides to create or manage your programmatic access credentials:</p>
            <div className="flex flex-col gap-2 mt-2">
              <a
                href="https://www.youtube.com/watch?v=lntWTStctIE"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Video Tutorial: Creating AWS IAM User
              </a>
              <a
                href="https://www.simplified.guide/aws/iam/create-programmatic-access-user"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Step-by-Step Guide: AWS IAM Programmatic Access
              </a>
            </div>
          </AlertDescription>
        </Alert>

        <form id="credentials-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="accessKeyId">AWS Access Key ID</Label>
            <Input
              id="accessKeyId"
              value={formData.accessKeyId}
              onChange={(e) => setFormData({ ...formData, accessKeyId: e.target.value })}
              placeholder="AKIAXXXXXXXXXXXXXXXX"
              className="font-mono"
              autoComplete="off"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secretAccessKey">AWS Secret Access Key</Label>
            <Input
              id="secretAccessKey"
              type="password"
              value={formData.secretAccessKey}
              onChange={(e) => setFormData({ ...formData, secretAccessKey: e.target.value })}
              placeholder="Your AWS secret access key"
              className="font-mono"
              autoComplete="off"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Default Region</Label>
            <Input
              id="region"
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              placeholder={DEFAULT_AWS_REGION}
              className="font-mono"
            />
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button type="submit" form="credentials-form" className="flex-1" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saving ? "Verifying with AWS…" : stored ? "Replace credentials" : "Save credentials"}
        </Button>
        {stored && (
          <Button variant="destructive" onClick={handleRemove} disabled={removing}>
            {removing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Remove
          </Button>
        )}
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
