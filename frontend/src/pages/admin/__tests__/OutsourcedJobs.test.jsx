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
    api.get.mockResolvedValue({ data: { jobs: [] } });
  });

  test("creates an outsourced job assigned to Abdul and shows it in the register", async () => {
    const savedJob = {
      _id: "job-1",
      title: "Process NIN modification",
      agentName: "Abdul",
      status: "assigned",
      notes: "",
      createdAt: "2026-10-17T10:00:00.000Z",
    };
    api.post.mockResolvedValue({ data: { job: savedJob } });
    render(<OutsourcedJobs />);

    fireEvent.click((await screen.findAllByRole("button", { name: "Add outsourced job" }))[0]);
    fireEvent.change(screen.getByLabelText("Job name"), { target: { value: savedJob.title } });
    expect(screen.getByLabelText("Outsourced agent").value).toBe("Abdul");
    fireEvent.click(screen.getByRole("button", { name: "Save job" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/admin/outsourced-jobs", {
      title: savedJob.title,
      agentName: "Abdul",
      status: "assigned",
      notes: "",
    }));
    expect(await screen.findByText(savedJob.title)).toBeTruthy();
    expect(screen.getByText("Abdul")).toBeTruthy();
  });
});
