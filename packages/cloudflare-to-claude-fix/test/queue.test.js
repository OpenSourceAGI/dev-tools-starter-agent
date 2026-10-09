import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index.js";

const env = {
  ROUTINE_FIRE_URL: "https://claude.example/fire",
  ROUTINE_FIRE_TOKEN: "tok-123",
};

const failedEvt = {
  status: "failed",
  worker_name: "my-worker",
  build_id: "b-1",
  branch: "main",
  commit_hash: "abcdef1234567",
  author: "dev@example.com",
  timestamp: "2026-01-02T03:04:05Z",
  error_messages: ["line one", "line two"],
};

const msg = (body) => ({ body, ack: vi.fn(), retry: vi.fn() });
const ok = (json) => ({ ok: true, json: async () => json, text: async () => "" });

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("queue consumer", () => {
  it("acks non-failed builds without firing the routine", async () => {
    const m = msg({ ...failedEvt, status: "success" });
    await worker.queue({ messages: [m] }, env);
    expect(m.ack).toHaveBeenCalledTimes(1);
    expect(m.retry).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fires the routine with a formatted failure report and acks", async () => {
    fetchMock.mockResolvedValueOnce(ok({ claude_code_session_url: "https://s/1" }));
    const m = msg(failedEvt);

    await worker.queue({ messages: [m] }, env);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(env.ROUTINE_FIRE_URL);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer tok-123");
    expect(init.headers["anthropic-version"]).toBe("2023-06-01");
    const { text } = JSON.parse(init.body);
    expect(text).toContain("Cloudflare Workers build FAILED");
    expect(text).toContain("Worker : my-worker");
    expect(text).toContain("Build  : b-1");
    expect(text).toContain("Branch : main");
    expect(text).toContain("Commit : abcdef1234567");
    expect(text).toContain("Author : dev@example.com");
    expect(text).toContain("=== Error log ===\nline one\nline two");
    expect(m.ack).toHaveBeenCalledTimes(1);
  });

  it("falls back to placeholders when optional fields are missing", async () => {
    fetchMock.mockResolvedValueOnce(ok({ claude_code_session_url: "u" }));
    const m = msg({
      status: "failed",
      worker_name: "w",
      build_id: "b",
      timestamp: "t",
      error_messages: [],
    });

    await worker.queue({ messages: [m] }, env);

    const { text } = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(text).toContain("Branch : (unknown)");
    expect(text).toContain("Commit : (unknown)");
    expect(text).toContain("Author : (unknown)");
    expect(text).toContain("no structured error messages");
  });

  it("truncates oversized logs to fit the 65,536 char limit", async () => {
    fetchMock.mockResolvedValueOnce(ok({ claude_code_session_url: "u" }));
    const m = msg({ ...failedEvt, error_messages: ["x".repeat(100_000)] });

    await worker.queue({ messages: [m] }, env);

    const { text } = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(text.length).toBeLessThanOrEqual(65_536);
    expect(text).toContain("log truncated to fit 65,536-char limit");
  });

  it("notifies the webhook with a short commit when NOTIFY_WEBHOOK_URL is set", async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ claude_code_session_url: "https://s/2" }))
      .mockResolvedValueOnce({ ok: true });
    const m = msg(failedEvt);

    await worker.queue({ messages: [m] }, { ...env, NOTIFY_WEBHOOK_URL: "https://hook" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [hookUrl, hookInit] = fetchMock.mock.calls[1];
    expect(hookUrl).toBe("https://hook");
    const body = JSON.parse(hookInit.body);
    expect(body.text).toBe(body.content);
    expect(body.text).toContain("`my-worker`");
    expect(body.text).toContain("`abcdef1`");
    expect(body.text).toContain("https://s/2");
    expect(m.ack).toHaveBeenCalled();
  });

  it("uses '?' placeholders in the webhook text when branch/commit are absent", async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ claude_code_session_url: "u" }))
      .mockResolvedValueOnce({ ok: true });
    const m = msg({ status: "failed", worker_name: "w", build_id: "b", timestamp: "t" });

    await worker.queue({ messages: [m] }, { ...env, NOTIFY_WEBHOOK_URL: "https://hook" });

    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.text).toContain("branch: `?`");
    expect(body.text).toContain("commit: `?`");
  });

  it("retries when the routine endpoint responds with an error", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => "oops" });
    const m = msg(failedEvt);

    await worker.queue({ messages: [m] }, env);

    expect(m.retry).toHaveBeenCalledTimes(1);
    expect(m.ack).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
    const err = console.error.mock.calls[0][1];
    expect(err.message).toContain("Routine fire failed (500): oops");
  });

  it("retries when fetch itself rejects", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    const m = msg(failedEvt);
    await worker.queue({ messages: [m] }, env);
    expect(m.retry).toHaveBeenCalled();
  });

  it("processes each message in a batch independently", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, text: async () => "bad" });
    fetchMock.mockResolvedValueOnce(ok({ claude_code_session_url: "u" }));
    const a = msg(failedEvt);
    const b = msg({ ...failedEvt, build_id: "b-2" });
    const c = msg({ ...failedEvt, status: "success" });

    await worker.queue({ messages: [a, b, c] }, env);

    expect(a.retry).toHaveBeenCalled();
    expect(b.ack).toHaveBeenCalled();
    expect(c.ack).toHaveBeenCalled();
  });
});
