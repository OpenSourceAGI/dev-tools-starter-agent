import { describe, it, expect, expectTypeOf } from "vitest";
import * as root from "./index";
import * as api from "./system-info-api";
import type { InfoContext } from "./systeminfo-types";

describe("about-system root entry", () => {
  it("re-exports the documented API", () => {
    expect(typeof root.getSystemInfo).toBe("function");
    expect(typeof root.loadCache).toBe("function");
    expect(typeof root.saveCache).toBe("function");
    expect(root.infoFunctions).toBe(api.infoFunctions);
  });

  it("exposes InfoContext as the context infoFunctions take", () => {
    expectTypeOf<Parameters<typeof root.infoFunctions.cpu>[0]>().toEqualTypeOf<InfoContext>();
    expectTypeOf<root.InfoContext>().toEqualTypeOf<api.InfoContext>();
  });
});
