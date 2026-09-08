import { Cloud, LogIn, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requestServerUrlChange, requestSignIn } from "./bridge";

/**
 * Shown until the extension host holds a CCCP session. Sign-in itself runs in
 * the host through VS Code's own prompts, so the password never enters the
 * webview and the session cookie never leaves the extension.
 */
export function SignInView({ serverUrl }: { serverUrl: string }) {
  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 w-fit rounded-lg bg-blue-500/10 p-2">
            <Cloud className="h-6 w-6 text-blue-500" />
          </div>
          <CardTitle>Cloud Computer Control Panel</CardTitle>
          <CardDescription>
            Sign in to manage your cloud instances and stored AWS credentials.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <Button className="w-full" onClick={requestSignIn}>
            <LogIn className="mr-2 h-4 w-4" />
            Sign in to CCCP
          </Button>

          <Button variant="outline" className="w-full" onClick={requestServerUrlChange}>
            <Server className="mr-2 h-4 w-4" />
            Change server
          </Button>

          <p className="break-all text-center text-xs text-muted-foreground">{serverUrl}</p>
        </CardContent>
      </Card>
    </div>
  );
}
