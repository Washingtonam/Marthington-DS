/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { success, toastError } = vi.hoisted(() => ({
  success: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("../../../context/ToastContext", () => ({
  useToast: () => ({ success, error: toastError }),
}));

vi.mock("../../../lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

import api from "../../../lib/axios";
import NimcFepManagement from "../NimcFepManagement";

const sampleFep = {
  _id: "fep-1",
  name: "Grace Agent",
  whatsapp: "+2348012345678",
  email: "grace@example.test",
  active: true,
  notes: "",
};

describe("NimcFepManagement", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { feps: [sampleFep] } });
  });

  test("shows the Benin FEP directory and creates personalized WhatsApp and email drafts", async () => {
    render(<NimcFepManagement />);

    expect(await screen.findByText("Grace Agent")).toBeTruthy();
    expect(screen.getByText("Benin City, Edo")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Grace Agent" }));
    fireEvent.change(screen.getByLabelText("Email subject"), { target: { value: "Hello {{name}}" } });
    fireEvent.change(screen.getByLabelText("Message draft"), { target: { value: "Welcome to {{company}} in {{city}}, {{name}}." } });

    const whatsapp = screen.getByRole("link", { name: "WhatsApp" });
    const email = screen.getByRole("link", { name: "Email" });
    expect(whatsapp.getAttribute("href")).toContain("wa.me/2348012345678");
    expect(decodeURIComponent(whatsapp.getAttribute("href"))).toContain("Welcome to VOLSUS Energy Limited in Benin City, Grace Agent.");
    expect(decodeURIComponent(email.getAttribute("href"))).toContain("subject=Hello Grace Agent");
    expect(decodeURIComponent(email.getAttribute("href"))).toContain("Welcome to VOLSUS Energy Limited in Benin City, Grace Agent.");
  });

  test("adds an FEP using the directory API", async () => {
    api.post.mockResolvedValue({ data: { fep: { ...sampleFep, _id: "fep-2", name: "New FEP" } } });
    render(<NimcFepManagement />);

    fireEvent.click(await screen.findByRole("button", { name: "Add FEP" }));
    fireEvent.change(screen.getByLabelText("FEP name"), { target: { value: "New FEP" } });
    fireEvent.change(screen.getByLabelText("WhatsApp number"), { target: { value: "+2348012345678" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "new@example.test" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Add FEP", exact: true })[1]);

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/admin/nimc-feps", {
      name: "New FEP",
      whatsapp: "+2348012345678",
      email: "new@example.test",
      notes: "",
    }));
    expect(await screen.findByText("New FEP")).toBeTruthy();
  });

  test("saves message drafts locally and reports directory load errors", async () => {
    render(<NimcFepManagement />);
    fireEvent.change(await screen.findByLabelText("Message draft"), { target: { value: "Good morning" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(JSON.parse(localStorage.getItem("nimc-fep-communications-draft")).message).toBe("Good morning");
    expect(success).toHaveBeenCalledWith("Message draft saved in this browser.");

    cleanup();
    api.get.mockRejectedValueOnce(new Error("offline"));
    render(<NimcFepManagement />);
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Could not load NIMC FEPs."));
  });
});
