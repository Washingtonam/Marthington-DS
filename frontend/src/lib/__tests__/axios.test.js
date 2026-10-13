import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import api from "../axios";

describe("API session handling", () => {
  const originalAdapter = api.defaults.adapter;
  const storage = new Map();
  const localStorageMock = {
    getItem: vi.fn((key) => storage.get(key) || null),
    removeItem: vi.fn((key) => storage.delete(key)),
  };

  beforeEach(() => {
    storage.set("token", "valid-token");
    storage.set("user", "{\"role\":\"user\"}");
    localStorageMock.getItem.mockClear();
    localStorageMock.removeItem.mockClear();
    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    vi.unstubAllGlobals();
  });

  it("preserves the session when the server returns forbidden", async () => {
    api.defaults.adapter = (config) => Promise.reject(Object.assign(new Error("Forbidden"), {
      config,
      response: { status: 403, config, data: { code: "ACCOUNT_PENDING_APPROVAL" } },
    }));

    await expect(api.get("/api/auth/login")).rejects.toMatchObject({ response: { status: 403 } });

    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    expect(storage.has("token")).toBe(true);
    expect(storage.has("user")).toBe(true);
  });
});