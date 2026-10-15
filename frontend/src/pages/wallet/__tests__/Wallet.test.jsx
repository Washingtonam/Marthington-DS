/** @vitest-environment jsdom */
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

const useUserMock = vi.fn();

vi.mock("../../../context/UserContext", () => ({
  useUser: () => useUserMock(),
}));

vi.mock("../../../context/BrandingContext", () => ({
  useBranding: () => ({ businessName: "Marthington", businessLogoUrl: "" }),
}));

vi.mock("../../../lib/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import Wallet from "../Wallet";

describe("Wallet balance", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("shows the live account wallet balance instead of stale user profile data", () => {
    useUserMock.mockReturnValue({
      user: { walletBalance: 500, commissionBalance: 0 },
      walletBalance: 2500,
      setBalance: vi.fn(),
      refreshBalance: vi.fn(),
    });

    render(<Wallet />);

    expect(screen.getByText("₦2,500.00")).toBeTruthy();
  });
});
