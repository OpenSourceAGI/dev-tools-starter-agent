// Must come first: CCCP modules read `process.env` at import time.
import "./processShim";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { installApiBridge, installExternalLinkBridge } from "./bridge";
import { readBootstrap } from "./protocol";
import { applyTheme } from "./theme";
import { App } from "./App";
import "./styles.css";

const bootstrap = readBootstrap();

// Installed before React mounts so the first request a CCCP component fires on
// mount already goes through the extension host.
installApiBridge();
installExternalLinkBridge();
applyTheme(bootstrap);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App bootstrap={bootstrap} />
  </StrictMode>,
);
