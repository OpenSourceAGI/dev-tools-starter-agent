import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AskAIButton,
  AskAIPanel,
  CopyPageButton,
  qwkSearchSuggestions,
  type SuggestionContext,
} from "../src";

const markdownUrl = "./sample.md";

// QwkSearch's follow-up generator; if the API can't be reached from this
// origin, fall back to a fixed list so the demo still shows the section.
const fromQwkSearch = qwkSearchSuggestions();
const suggestedQuestions = (ctx: SuggestionContext) =>
  fromQwkSearch(ctx)
    .then((list) => (list.length ? list : Promise.reject()))
    .catch(() => [
      "How do I install the package?",
      "Where do I render the button in my docs layout?",
      "How do I add my own AI provider?",
    ]);

function App() {
  const [floating, setFloating] = useState(false);
  const [suggest, setSuggest] = useState(true);
  return (
    <article>
      <h1>Getting started</h1>
      <div className="row">
        <label>
          <input
            type="checkbox"
            checked={floating}
            onChange={(e) => setFloating(e.target.checked)}
          />{" "}
          Floating action button
        </label>
        <label>
          <input
            type="checkbox"
            checked={suggest}
            onChange={(e) => setSuggest(e.target.checked)}
          />{" "}
          Suggested questions
        </label>
      </div>
      <div className="row">
        <CopyPageButton markdownUrl={markdownUrl} />
        <AskAIButton
          floating={floating}
          markdownUrl={markdownUrl}
          title="Getting started"
          githubUrl="https://github.com/OpenSourceAGI/dev-tools-starter-agent"
          suggestedQuestions={suggest ? suggestedQuestions : undefined}
          providers={[
            "qwksearch",
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
      <AskAIPanel
        markdownUrl={markdownUrl}
        title="Getting started"
        suggestedQuestions={suggest ? suggestedQuestions : undefined}
        inline
      />
    </article>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
