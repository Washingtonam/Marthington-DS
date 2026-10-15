/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../lib/axios", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

import api from "../../../lib/axios";
import CoreServicePricing from "../CoreServicePricing";

describe("CoreServicePricing", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({
      data: {
        nin: { unitPrice: 250, agentPrice: 150 },
        bvn: { unitPrice: 200 },
        ninServices: { validation: { noRecord: 1000 } },
        cacServices: { soleProprietorship: 28000 },
        platformServices: { verifyNin: { enabled: true } },
      },
    });
    api.put.mockResolvedValue({ data: {} });
  });

  test("shows only Verify NIN pricing and saves its sidebar visibility", async () => {
    render(<CoreServicePricing />);

    expect(await screen.findByText("Verify NIN")).toBeTruthy();
    expect(screen.queryByText("Verify BVN")).toBeNull();
    expect(screen.queryByText("NIN Services")).toBeNull();
    expect(screen.queryByText("CAC Services")).toBeNull();

    fireEvent.click(screen.getByRole("checkbox", { name: "Show Verify NIN in the user sidebar" }));
    fireEvent.click(screen.getByRole("button", { name: "Save service prices" }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/api/admin/pricing", {
        unitPrice: 250,
        agentPrice: 150,
        platformServices: { verifyNin: { enabled: false } },
      });
    });
    expect(await screen.findByRole("status")).toBeTruthy();
  });
});
