import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { announceReady, onAuthState } from "./bridge";
import { ControlPanel } from "./ControlPanel";
import { SignInView } from "./SignInView";
import type { AuthState, Bootstrap } from "./protocol";

export function App({ bootstrap }: { bootstrap: Bootstrap }) {
  const [auth, setAuth] = useState<AuthState | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthState(setAuth);
    announceReady();
    return unsubscribe;
  }, []);

  return (
    <>
      {auth === null ? (
        // The host answers `ready` immediately; this is only ever a flash.
        <div className="p-4 text-sm text-muted-foreground">Connecting to CCCP…</div>
      ) : auth.authenticated ? (
        // Remounting on sign-out clears every component's cached instance data.
        <ControlPanel key={auth.serverUrl} auth={auth} />
      ) : (
        <SignInView serverUrl={auth.serverUrl || bootstrap.serverUrl} />
      )}

      <Toaster />
    </>
  );
}
