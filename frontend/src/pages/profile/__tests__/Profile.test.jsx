/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const userMocks = vi.hoisted(() => ({ setUser: vi.fn() }));

vi.mock("../../../context/UserContext", () => ({
  useUser: () => ({
    user: {
      id: "registered-agent",
      firstName: "Test",
      lastName: "Agent",
      email: "agent@example.test",
      phone: "+2348000000000",
      role: "user",
      walletBalance: 100,
    },
    setUser: userMocks.setUser,
  }),
}));

vi.mock("../../../lib/axios", () => ({
  default: { put: vi.fn(), post: vi.fn() },
}));

vi.mock("../../../components/AppearanceSettings", () => ({ default: () => null }));

import api from "../../../lib/axios";
import Profile from "../Profile";

describe("Profile account details", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("alert", vi.fn());
    api.put.mockResolvedValue({
      data: {
        data: {
          id: "registered-agent",
          firstName: "Updated",
          lastName: "Agent",
          email: "updated@example.test",
          phone: "+2348000000001",
          role: "user",
        },
      },
    });
  });

  test("saves account changes to the authenticated profile endpoint and updates session state", async () => {
    render(<MemoryRouter><Profile /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Updated" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "updated@example.test" } });
    fireEvent.change(screen.getByLabelText("WhatsApp number"), { target: { value: "+234 800 000 0001" } });
    fireEvent.click(screen.getByRole("button", { name: "Save account details" }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/api/users/profile", {
      firstName: "Updated",
      lastName: "Agent",
      email: "updated@example.test",
      phone: "+234 800 000 0001",
    }));
    expect(userMocks.setUser).toHaveBeenCalledWith(expect.objectContaining({
      firstName: "Updated",
      email: "updated@example.test",
    }));
  });
});
