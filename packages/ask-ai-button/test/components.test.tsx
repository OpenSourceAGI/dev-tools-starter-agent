import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AskAIButton,
  AskAIPanel,
  clearMarkdownCache,
  CopyPageButton,
  STYLE_ELEMENT_ID,
  type AIProvider,
} from "../src";

let writeText: ReturnType<typeof vi.fn>;
let open: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  open = vi.fn();
  vi.stubGlobal("open", open);
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("# Intro\nBody text"),
      }),
  );
});

afterEach(() => {
  cleanup();
  clearMarkdownCache();
  vi.unstubAllGlobals();
  document.getElementById(STYLE_ELEMENT_ID)?.remove();
});

const props = {
  markdownUrl: "/docs/intro.mdx",
  pageUrl: "https://docs.example.com/docs/intro",
  title: "Intro",
};

describe("AskAIButton (dropdown)", () => {
  it("opens the panel, injects styles once and closes on Escape", () => {
    render(<AskAIButton {...props} />);
    const trigger = screen.getByRole("button", { name: /ask ai/i });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(document.querySelectorAll(`#${STYLE_ELEMENT_ID}`)).toHaveLength(1);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on an outside click", () => {
    render(<AskAIButton {...props} defaultOpen />);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sends the typed message to the chosen provider", () => {
    const onSend = vi.fn();
    render(<AskAIButton {...props} defaultOpen onSend={onSend} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "How do I install?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Claude" }));
    const expected =
      "Read http://localhost:3000/docs/intro.mdx, How do I install?";
    expect(open).toHaveBeenCalledWith(
      `https://claude.ai/new?q=${encodeURIComponent(expected)}`,
      "_blank",
      "noopener,noreferrer",
    );
    expect(onSend).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expected }),
    );
  });

  it("sends with Ctrl+Enter to the first provider", () => {
    render(
      <AskAIButton {...props} defaultOpen providers={["chatgpt", "claude"]} />,
    );
    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "Enter",
      ctrlKey: true,
    });
    expect(open.mock.calls[0][0]).toMatch(/^https:\/\/chatgpt\.com/);
  });
});

describe("AskAIButton (fab)", () => {
  it("renders a fixed corner trigger", () => {
    const { container } = render(
      <AskAIButton {...props} variant="fab" position="bottom-left" />,
    );
    expect(
      container.querySelector(".aai-fab-root.aai-pos-bottom-left"),
    ).toBeTruthy();
  });
});

describe("AskAIPanel", () => {
  it("includes the page markdown in content mode", async () => {
    render(<AskAIPanel {...props} inline />);
    fireEvent.click(screen.getByRole("button", { name: "Include page text" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Claude" }).hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy prompt" }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const prompt = writeText.mock.calls[0][0] as string;
    expect(prompt).toContain("<page>\n# Intro\nBody text\n</page>");
  });

  it("falls back to a link and copies the full prompt when the URL is too long", async () => {
    render(
      <AskAIPanel
        {...props}
        inline
        defaultMode="content"
        maxUrlLength={60}
        providers={["claude"]}
      />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Claude" }).hasAttribute("disabled"),
      ).toBe(false),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Claude" }));
    });
    expect(open.mock.calls[0][0]).toContain(
      encodeURIComponent("Read http://localhost:3000/docs/intro.mdx"),
    );
    expect(writeText.mock.calls[0][0]).toContain("<page>");
    expect(screen.getByRole("status").textContent).toMatch(/clipboard/);
  });

  it("hands the prompt to onSelect providers instead of opening a tab", async () => {
    const onSelect = vi.fn();
    const api: AIProvider = {
      id: "api",
      title: "My API",
      icon: null,
      onSelect,
    };
    render(<AskAIPanel {...props} inline providers={[api]} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "My API" }));
    });
    expect(onSelect).toHaveBeenCalledWith(
      expect.stringContaining("intro.mdx"),
      expect.objectContaining({ title: "Intro" }),
    );
    expect(open).not.toHaveBeenCalled();
  });

  it("copies the page markdown", async () => {
    render(<AskAIPanel {...props} inline />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy page" }));
    });
    expect(writeText).toHaveBeenCalledWith("# Intro\nBody text");
  });

  it("reports a failed fetch and keeps working in link mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    render(<AskAIPanel {...props} inline defaultMode="content" />);
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/Couldn't load/),
    );
    fireEvent.click(screen.getByRole("button", { name: "Claude" }));
    expect(open.mock.calls[0][0]).toContain("Read");
  });

  it("shows a GitHub link when githubUrl is set", () => {
    render(
      <AskAIPanel
        {...props}
        inline
        githubUrl="https://github.com/o/r/blob/main/intro.mdx"
      />,
    );
    expect(
      screen.getByRole("link", { name: /github/i }).getAttribute("href"),
    ).toContain("github.com/o/r");
  });
});

describe("CopyPageButton", () => {
  it("copies the fetched markdown", async () => {
    render(<CopyPageButton markdownUrl="/docs/intro.mdx" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy page/i }));
    });
    expect(writeText).toHaveBeenCalledWith("# Intro\nBody text");
    expect(screen.getByRole("button").textContent).toBe("Copied");
  });
});
