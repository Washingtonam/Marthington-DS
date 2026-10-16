/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../lib/axios", () => ({
  default: { get: vi.fn() },
}));
vi.mock("../../../context/BrandingContext", () => ({
  useBranding: () => ({ businessName: "Marthington" }),
}));

import api from "../../../lib/axios";
import Guides from "../Guides";

describe("Guides", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("loads public and agent-only guides in the signed-in workspace", async () => {
    api.get.mockResolvedValue({
      data: {
        articles: [
          {
            _id: "public-guide",
            title: "Using the service",
            slug: "using-the-service",
            category: "Platform",
            audience: "public",
            summary: "Public instructions",
          },
          {
            _id: "agent-guide",
            title: "Understanding commissions",
            slug: "understanding-commissions",
            category: "Commissions",
            audience: "agents",
            summary: "Agent-only instructions",
          },
        ],
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<MemoryRouter><Guides agentView /></MemoryRouter>);

    expect(await screen.findByText("Understanding commissions")).toBeTruthy();
    expect(screen.getByText("Using the service")).toBeTruthy();
    expect(screen.getByText("Agent guide")).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith("/api/agent/articles", { params: { limit: 50 } });

    const copyButtons = screen.getAllByRole("button", { name: "Copy guide link" });
    fireEvent.click(copyButtons[1]);
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `${window.location.origin}/agent/guides/understanding-commissions`,
    ));
    expect(await screen.findByRole("button", { name: "Link copied" })).toBeTruthy();
  });
});
