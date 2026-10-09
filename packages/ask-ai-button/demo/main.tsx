import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AskAIButton, AskAIPanel, CopyPageButton } from "../src";

const markdownUrl = "./sample.md";

function App() {
  return (
    <article>
      <h1>Getting started</h1>
      <div className="row">
        <CopyPageButton markdownUrl={markdownUrl} />
        <AskAIButton
          markdownUrl={markdownUrl}
          title="Getting started"
          githubUrl="https://github.com/OpenSourceAGI/dev-tools-starter-agent"
          providers={[
            "claude",
            "chatgpt",
            "gemini",
            "perplexity",
            "grok",
            "copilot",
            {
              id: "api",
              title: "My API",
              onSelect: (prompt) => alert(`POST /api/ask\n\n${prompt}`),
            },
          ]}
        />
      </div>
      <p>
        Install the package, then render the button in your docs page header.
      </p>
      <h2>Inline panel</h2>
      <AskAIPanel markdownUrl={markdownUrl} title="Getting started" inline />
      <AskAIButton
        variant="fab"
        markdownUrl={markdownUrl}
        title="Getting started"
      />
    </article>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
