/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../context/UserContext", () => ({
  useUser: () => ({ user: { id: "super-admin", role: "super_admin" } }),
}));

vi.mock("../../../context/ToastContext", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("../../../lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock("../../../components/ui/SlideOver", () => ({
  default: ({ isOpen, title, children }) => isOpen
    ? <section role="dialog" aria-label={title}><h2>{title}</h2>{children}</section>
    : null,
}));

import api from "../../../lib/axios";
import AgentManagement from "../AgentManagement";

const manualAgent = {
  _id: "agent-1",
  name: "Sample Agent",
  whatsapp: "+2348000000000",
  active: true,
  jobs: 2,
  totalAmount: 12000,
};

describe("AgentManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((path) => Promise.resolve({
      data: path.endsWith("/jobs")
        ? { jobs: [] }
        : { manualAgents: [manualAgent], registeredUsers: [] },
    }));
    api.put.mockResolvedValue({ data: { agent: { ...manualAgent, name: "Updated Agent" } } });
  });

  test("opens agent details and saves edited contact details", async () => {
    render(<MemoryRouter initialEntries={["/admin/agents"]}><AgentManagement /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: /Sample Agent/ }));
    fireEvent.click(screen.getByRole("button", { name: "Edit agent" }));

    expect(screen.getByRole("dialog", { name: "Edit manual agent" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Agent name"), { target: { value: "Updated Agent" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/api/admin/agents/agent-1", {
      name: "Updated Agent",
      whatsapp: "+2348000000000",
    }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Edit manual agent" })).toBeNull());
  });

  test("archives and reactivates a manual agent without deleting its history", async () => {
    api.put.mockResolvedValue({ data: { agent: { ...manualAgent, active: false } } });
    render(<MemoryRouter initialEntries={["/admin/agents"]}><AgentManagement /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: /Sample Agent/ }));
    fireEvent.click(screen.getByRole("button", { name: "Archive agent" }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/api/admin/agents/agent-1", { active: false }));
    expect(screen.getByText("Archived")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Log a job for this contact/ }).hasAttribute("disabled")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Reactivate agent" }));
    await waitFor(() => expect(api.put).toHaveBeenLastCalledWith("/api/admin/agents/agent-1", { active: true }));
  });
});
