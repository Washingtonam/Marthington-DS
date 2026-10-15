/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("../../../context/UserContext", () => ({
  useUser: () => ({ user: { id: "super-admin", role: "super_admin" } }),
}));

vi.mock("../../../context/ToastContext", () => ({
  useToast: () => toastMocks,
}));

vi.mock("../../../lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("../../../components/ui/SlideOver", () => ({
  default: ({ isOpen, title, children }) => isOpen
    ? <section role="dialog" aria-label={title}><h2>{title}</h2>{children}</section>
    : null,
}));

import api from "../../../lib/axios";
import UserDetailView from "../UserDetailView";

const profile = {
  _id: "registered-user-1",
  firstName: "Marketing",
  lastName: "Agent",
  email: "marketing@example.test",
  phone: "+2348000000002",
  role: "user",
  status: "active",
  approvalStatus: "approved",
  walletBalanceKobo: 10000,
  createdAt: "2025-01-01T00:00:00.000Z",
};

describe("UserDetailView", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((path) => Promise.resolve(
      path.endsWith("/history")
        ? { data: { data: [] } }
        : { data: { data: profile } },
    ));
    api.put.mockResolvedValue({ data: { success: true, message: "User profile updated.", data: { ...profile, email: "updated@example.test", phone: "+2348000000003" } } });
  });

  test("edits a registered agent's email, WhatsApp number, and password from the audit profile", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/user/registered-user-1/details"]}>
        <Routes>
          <Route path="/admin/user/:userId/details" element={<UserDetailView />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "User Audit Profile" })).toBeTruthy();
    expect(screen.getByText("WhatsApp:").parentElement.textContent).toContain("+2348000000002");
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "updated@example.test" } });
    fireEvent.change(screen.getByLabelText("WhatsApp number"), { target: { value: "+2348000000003" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-secret" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "new-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/api/admin/users/registered-user-1/profile", {
      firstName: "Marketing",
      lastName: "Agent",
      email: "updated@example.test",
      phone: "+2348000000003",
      password: "new-secret",
    }));
    expect(await screen.findByText("updated@example.test")).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Edit registered user" })).toBeNull();
  });
});
