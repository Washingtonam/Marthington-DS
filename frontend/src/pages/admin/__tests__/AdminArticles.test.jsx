/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../lib/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock("../../../components/admin/ArticleBodyEditor", () => ({
  default: ({ value, onChange }) => (
    <textarea aria-label="Article body" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

import api from "../../../lib/axios";
import AdminArticles from "../AdminArticles";

describe("AdminArticles", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { articles: [] } });
  });

  test("saves the selected agent-only audience when publishing a guide", async () => {
    render(<AdminArticles />);

    fireEvent.change(await screen.findByLabelText("Title"), { target: { value: "Commission guide" } });
    fireEvent.change(screen.getByLabelText("Who can view this guide?"), { target: { value: "agents" } });
    fireEvent.change(screen.getByLabelText("Publication"), { target: { value: "published" } });
    fireEvent.change(screen.getByLabelText("Article body"), { target: { value: "How to use commissions." } });
    fireEvent.click(screen.getByRole("button", { name: "Publish article" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      "/api/admin/articles",
      expect.objectContaining({
        title: "Commission guide",
        audience: "agents",
        status: "published",
      }),
    ));
  });

  test("copies a published agent-only guide URL that requires agent access", async () => {
    api.get.mockResolvedValue({
      data: {
        articles: [{
          _id: "article-1",
          title: "Commission guide",
          slug: "commission-guide",
          audience: "agents",
          status: "published",
        }],
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<AdminArticles />);
    fireEvent.click(await screen.findByRole("button", { name: "Copy guide link" }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `${window.location.origin}/agent/guides/commission-guide`,
    ));
  });
});
