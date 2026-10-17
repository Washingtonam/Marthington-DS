/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { mockSuccess, mockError } = vi.hoisted(() => ({
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));

vi.mock("../../../context/ToastContext", () => ({
  useToast: () => ({ success: mockSuccess, error: mockError }),
}));
vi.mock("../../../lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

import api from "../../../lib/axios";
import OutsourcedJobs from "../OutsourcedJobs";

describe("OutsourcedJobs", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((path) => Promise.resolve({
      data: path.endsWith("/outsourced-agents")
        ? { agents: [{ _id: "agent-1", name: "Abdul", active: true }] }
        : { jobs: [] },
    }));
  });

  test("creates an outsourced job assigned to Abdul and shows it in the register", async () => {
    const savedJob = {
      _id: "job-1",
      title: "Process NIN modification",
      outsourcedAgentId: "agent-1",
      agentName: "Abdul",
      status: "assigned",
      notes: "",
      createdAt: "2026-10-17T10:00:00.000Z",
    };
    api.post.mockResolvedValue({ data: { job: savedJob } });
    render(<OutsourcedJobs />);

    fireEvent.click((await screen.findAllByRole("button", { name: "Add outsourced job" }))[0]);
    fireEvent.change(screen.getByLabelText("Job name"), { target: { value: savedJob.title } });
    expect(screen.getByLabelText("Outsourced agent").value).toBe("agent-1");
    fireEvent.click(screen.getByRole("button", { name: "Save job" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/admin/outsourced-jobs", {
      title: savedJob.title,
      outsourcedAgentId: "agent-1",
      status: "assigned",
      notes: "",
    }));
    expect(await screen.findByText(savedJob.title)).toBeTruthy();
    expect(screen.getAllByText("Abdul").length).toBeGreaterThan(0);
  });

  test("adds Abdul to the directory and archives agents without removing their records", async () => {
    const abdul = { _id: "agent-2", name: "Abdul", whatsapp: "", email: "", notes: "", active: true };
    api.get.mockResolvedValue({ data: { jobs: [], agents: [] } });
    api.post.mockResolvedValue({ data: { agent: abdul } });
    api.put.mockResolvedValue({ data: { agent: { ...abdul, active: false } } });
    render(<OutsourcedJobs />);

    fireEvent.click(await screen.findByRole("button", { name: "Add agent" }));
    expect(screen.getByLabelText("Agent name").value).toBe("Abdul");
    fireEvent.click(screen.getByRole("button", { name: "Save agent" }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/admin/outsourced-agents", {
      name: "Abdul",
      whatsapp: "",
      email: "",
      notes: "",
    }));
    expect((await screen.findAllByText("Abdul")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/api/admin/outsourced-agents/agent-2", { active: false }));
    expect(await screen.findByText("Archived")).toBeTruthy();
  });
});
