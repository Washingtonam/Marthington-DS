/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { mockUseUser, mockSuccess, mockError } = vi.hoisted(() => ({
  mockUseUser: vi.fn(),
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));

vi.mock("../../../context/UserContext", () => ({ useUser: () => mockUseUser() }));
vi.mock("../../../context/ToastContext", () => ({
  useToast: () => ({ success: mockSuccess, error: mockError }),
}));
vi.mock("../../../lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from "../../../lib/axios";
import Communications from "../Communications";

const template = {
  _id: "template-1",
  name: "Welcome",
  category: "Onboarding",
  channel: "email",
  subject: "Hello {{name}}",
  message: "Welcome, {{name}}!",
};
const agent = {
  _id: "agent-1",
  name: "Ayo Agent",
  email: "ayo@example.com",
  whatsapp: "+2348000000000",
  status: "active",
  approvalStatus: "approved",
  contactType: "registered",
};

describe("Communications", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUser.mockReturnValue({ user: { id: "admin-1", role: "super_admin" } });
    api.get.mockImplementation((path) => Promise.resolve({
      data: path.endsWith("/conversations")
        ? { conversations: [] }
        : path.endsWith("/templates")
          ? { templates: [template] }
          : { manualAgents: [], registeredUsers: [agent] },
    }));
  });

  test("sends a saved email template to the selected agent", async () => {
    api.post.mockResolvedValue({ data: { success: true, sent: 1, failed: 0 } });
    render(<MemoryRouter><Communications /></MemoryRouter>);

    await screen.findByRole("button", { name: /Welcome/ });
    fireEvent.click(screen.getByRole("tab", { name: "Dispatch & recipients" }));
    fireEvent.change(screen.getByLabelText("Message template"), { target: { value: "template-1" } });
    fireEvent.click(screen.getByLabelText(/Ayo Agent/));
    fireEvent.click(await screen.findByRole("button", { name: "Send email to 1 selected agent" }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      "/api/admin/communications/templates/template-1/send",
      { recipients: [{ id: "agent-1", type: "registered" }] },
    ));
  });

  test("saves an edited message template", async () => {
    const updated = { ...template, message: "Updated, {{name}}!" };
    api.put.mockResolvedValue({ data: { template: updated } });
    render(<MemoryRouter><Communications /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: /Welcome/ }));
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: updated.message } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(
      "/api/admin/communications/templates/template-1",
      expect.objectContaining({ message: updated.message }),
    ));
  });

  test("lets an admin open an agent conversation and reply", async () => {
    mockUseUser.mockReturnValue({ user: { id: "admin-1", role: "admin" } });
    api.get.mockImplementation((path) => Promise.resolve({
      data: path.endsWith("/conversations")
        ? { conversations: [{ _id: "conversation-1", user: { name: "Ayo Agent", email: "ayo@example.com" }, lastMessage: "I need help" }] }
        : { conversation: { _id: "conversation-1" }, messages: [{ _id: "message-1", senderId: "agent-1", senderName: "Ayo Agent", text: "I need help" }] },
    }));
    api.post.mockResolvedValue({
      data: { message: { _id: "message-2", senderId: "admin-1", senderName: "Support", text: "How can I help?" } },
    });

    render(<MemoryRouter><Communications /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: /Ayo Agent/ }));
    expect(await screen.findByText("I need help")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Text reply"), { target: { value: "How can I help?" } });
    fireEvent.click(screen.getByRole("button", { name: /Reply/ }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      "/api/admin/communications/conversations/conversation-1/messages",
      { text: "How can I help?" },
    ));
  });

  test("shows the notification center inside Communications", async () => {
    api.get.mockImplementation((path) => Promise.resolve({
      data: path.endsWith("/conversations")
        ? { conversations: [] }
        : path.endsWith("/templates")
          ? { templates: [template] }
          : path.endsWith("/agents")
            ? { manualAgents: [], registeredUsers: [agent] }
            : { notifications: [] },
    }));

    render(
      <MemoryRouter initialEntries={["/admin/communications?tab=notifications"]}>
        <Communications />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Keep users informed" })).toBeTruthy();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/api/admin/notifications"));
    expect(screen.getByRole("tab", { name: "Notification center" }).getAttribute("aria-selected")).toBe("true");
  });
});
