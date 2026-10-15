/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

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
  afterEach(cleanup);

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

    expect(screen.getByRole("dialog", { name: "Edit offline agent" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Agent name"), { target: { value: "Updated Agent" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/api/admin/agents/agent-1", {
      name: "Updated Agent",
      whatsapp: "+2348000000000",
    }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Edit offline agent" })).toBeNull());
  });

  test("opens a registered Marthington agent's audit profile from the directory", async () => {
    const registeredAccount = {
      _id: "registered-user-1",
      name: "Marthington agent",
      email: "marketing@example.test",
      whatsapp: "+2348000000002",
      role: "user",
      status: "active",
      approvalStatus: "approved",
      jobs: 1,
      totalAmount: 6000,
    };
    api.get.mockImplementation((path) => Promise.resolve({
      data: path.endsWith("/jobs")
        ? { jobs: [] }
        : { manualAgents: [], registeredUsers: [registeredAccount] },
    }));

    function CurrentLocation() {
      return <output data-testid="current-path">{useLocation().pathname}</output>;
    }

    render(
      <MemoryRouter initialEntries={["/admin/agents"]}>
        <Routes>
          <Route path="/admin/agents" element={<AgentManagement view="agents" />} />
          <Route path="/admin/user/:userId/details" element={<div>User Audit Profile</div>} />
        </Routes>
        <CurrentLocation />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Marthington agent/ }));

    expect(await screen.findByText("User Audit Profile")).toBeTruthy();
    expect(screen.getByTestId("current-path").textContent).toBe("/admin/user/registered-user-1/details");
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

  test("shows distinct job and communications pages", async () => {
    render(<MemoryRouter initialEntries={["/admin/agents/jobs"]}><AgentManagement view="jobs" /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Log jobs" })).toBeTruthy();

    render(<MemoryRouter initialEntries={["/admin/communications"]}><AgentManagement view="messages" /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Communications" })).toBeTruthy();
  });

  test("loads selected catalog service fields, parses a pasted form, and logs the job", async () => {
    const services = [{
      serviceCode: "modification-name",
      category: "NIMC",
      name: "Name Modification",
      status: "active",
      price: 12000,
      metadata: {
        formFields: [
          { key: "nin-number", label: "NIN number", type: "text", required: true },
          { key: "previous-modification", label: "Previous modification?", type: "select", options: ["Yes", "No"], required: true },
        ],
      },
    }];
    api.get.mockImplementation((path) => Promise.resolve({
      data: path.endsWith("/jobs")
        ? { jobs: [] }
        : path.endsWith("/catalog")
          ? { services }
          : { manualAgents: [manualAgent], registeredUsers: [] },
    }));
    api.post.mockResolvedValue({ data: { job: { _id: "job-1" } } });

    render(
      <MemoryRouter initialEntries={["/admin/agents/jobs?customerType=manual&customerId=agent-1"]}>
        <AgentManagement view="jobs" />
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText("Service category"), { target: { value: "NIMC" } });
    fireEvent.change(screen.getByLabelText("Service"), { target: { value: "modification-name" } });
    fireEvent.change(screen.getByLabelText("Paste the customer’s form"), {
      target: { value: "NIN number: 12345678901\nPrevious modification?: No" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Parse pasted form" }));

    expect(screen.getByLabelText("NIN number *").value).toBe("12345678901");
    expect(screen.getByLabelText("Previous modification? *").value).toBe("No");
    fireEvent.click(screen.getByRole("button", { name: "Save job" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/admin/agents/jobs", {
      customerType: "manual",
      agentId: "agent-1",
      serviceCode: "modification-name",
      serviceType: "Name Modification",
      amount: 12000,
      formData: { "nin-number": "12345678901", "previous-modification": "No" },
    }));
  });

  test("creates an offline agent inside the job form and selects it for the job", async () => {
    api.post.mockResolvedValue({
      data: {
        agent: {
          _id: "agent-new",
          name: "New Offline Agent",
          whatsapp: "+2348000000001",
          active: true,
        },
      },
    });

    render(<MemoryRouter initialEntries={["/admin/agents/jobs"]}><AgentManagement view="jobs" /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Log a job" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add offline agent" }));
    fireEvent.change(screen.getByLabelText("Agent name"), { target: { value: "New Offline Agent" } });
    fireEvent.change(screen.getByLabelText("WhatsApp number"), { target: { value: "+2348000000001" } });
    fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: "new-agent@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save and select offline agent" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/admin/agents", {
      name: "New Offline Agent",
      whatsapp: "+2348000000001",
      email: "new-agent@example.com",
    }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Offline agent" }).value).toBe("agent-new"));
    expect(screen.queryByText("Save a new offline agent")).toBeNull();
  });

  test("shows the catalog name and price for legacy jobs stored without an amount", async () => {
    const service = {
      serviceCode: "modification-name",
      category: "NIMC",
      name: "Name Modification",
      status: "active",
      price: 12000,
      metadata: { formFields: [] },
    };
    api.get.mockImplementation((path) => Promise.resolve({
      data: path.endsWith("/jobs")
        ? { jobs: [{
          _id: "job-legacy",
          agentName: "Sample Agent",
          customerType: "manual",
          serviceCode: "modification-name",
          serviceType: "modification-name",
          amount: 0,
          status: "pending",
          createdAt: new Date().toISOString(),
        }] }
        : path.endsWith("/catalog")
          ? { services: [service] }
          : { manualAgents: [manualAgent], registeredUsers: [] },
    }));

    render(<MemoryRouter initialEntries={["/admin/agents/jobs"]}><AgentManagement view="jobs" /></MemoryRouter>);

    expect(await screen.findByText("Name Modification")).toBeTruthy();
    expect(screen.getAllByText(/₦12,000/).length).toBeGreaterThan(0);
  });

  test("lists all registered accounts and filters communication recipients by audience", async () => {
    const contacts = [
      { _id: "funded", name: "Funded Account", whatsapp: "+2348000000001", role: "user", status: "active", approvalStatus: "approved", walletBalanceKobo: 500, lastLogin: new Date().toISOString() },
      { _id: "inactive", name: "Inactive Account", whatsapp: "+2348000000002", role: "user", status: "active", approvalStatus: "approved", walletBalanceKobo: 0, lastLogin: "2020-01-01T00:00:00.000Z" },
      { _id: "pending", name: "Pending Account", whatsapp: "+2348000000003", role: "user", status: "suspended", approvalStatus: "pending", walletBalanceKobo: 0, lastLogin: null },
    ];
    api.get.mockImplementation((path) => Promise.resolve({
      data: path.endsWith("/jobs")
        ? { jobs: [] }
        : { manualAgents: [manualAgent], registeredUsers: contacts },
    }));

    render(<MemoryRouter initialEntries={["/admin/communications"]}><AgentManagement view="messages" /></MemoryRouter>);

    expect(await screen.findByText("Pending Account")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Audience segment"), { target: { value: "wallet" } });
    expect(screen.getByText("Funded Account")).toBeTruthy();
    expect(screen.queryByText("Inactive Account")).toBeNull();
    expect(screen.queryByText("Pending Account")).toBeNull();
  });
});
