/** @vitest-environment jsdom */
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
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

function CurrentLocation() {
  const location = useLocation();
  return <output data-testid="location">{JSON.stringify({ pathname: location.pathname, messageText: location.state?.messageText })}</output>;
}

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
          : path.endsWith("/nimc-feps")
            ? { feps: [] }
            : { manualAgents: [], registeredUsers: [agent] },
    }));
  });

  test("includes saved Benin City FEPs as selectable communication recipients", async () => {
    const fep = {
      _id: "fep-1",
      name: "Grace FEP",
      email: "grace@example.com",
      whatsapp: "+2348012345678",
      active: true,
    };
    api.get.mockImplementation((path) => Promise.resolve({
      data: path.endsWith("/conversations")
        ? { conversations: [] }
        : path.endsWith("/templates")
          ? { templates: [template] }
          : path.endsWith("/nimc-feps")
            ? { feps: [fep] }
            : { manualAgents: [], registeredUsers: [] },
    }));
    api.post.mockResolvedValue({ data: { success: true, sent: 1, failed: 0 } });
    render(<MemoryRouter><Communications /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("tab", { name: "Dispatch & recipients" }));
    fireEvent.change(screen.getByLabelText("Audience"), { target: { value: "fep" } });
    expect(await screen.findByText("Grace FEP")).toBeTruthy();
    expect(screen.getByText("NIMC FEP · Benin City")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Message template"), { target: { value: "template-1" } });
    fireEvent.click(screen.getByLabelText("Select Grace FEP"));
    fireEvent.click(await screen.findByRole("button", { name: "Send email to 1 selected recipient" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      "/api/admin/communications/templates/template-1/send",
      { recipients: [{ id: "fep-1", type: "fep" }] },
    ));
  });

  test("sends a saved email template to the selected agent", async () => {
    api.post.mockResolvedValue({ data: { success: true, sent: 1, failed: 0 } });
    render(<MemoryRouter><Communications /></MemoryRouter>);

    await screen.findByRole("button", { name: /Welcome/ });
    fireEvent.click(screen.getByRole("tab", { name: "Dispatch & recipients" }));
    fireEvent.change(screen.getByLabelText("Message template"), { target: { value: "template-1" } });
    fireEvent.click(screen.getByLabelText(/Ayo Agent/));
    fireEvent.click(await screen.findByRole("button", { name: "Send email to 1 selected recipient" }));
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

  test("lets a superadmin copy a message or start a job from it", async () => {
    mockUseUser.mockReturnValue({ user: { id: "super-admin-1", role: "super_admin" } });
    const messageText = "Please help with my CAC registration";
    api.get.mockImplementation((path) => Promise.resolve({
      data: path.endsWith("/conversations")
        ? {
          conversations: [{
            _id: "conversation-1",
            user: { _id: "registered-agent-1", name: "Ayo Agent", email: "ayo@example.com" },
            lastMessage: messageText,
          }],
        }
        : {
          conversation: {
            _id: "conversation-1",
            user: { _id: "registered-agent-1", name: "Ayo Agent", email: "ayo@example.com" },
          },
          messages: [
            {
              _id: "message-1",
              senderId: "registered-agent-1",
              senderName: "Ayo Agent",
              senderRole: "user",
              text: messageText,
            },
            {
              _id: "message-2",
              senderId: "super-admin-1",
              senderName: "Support",
              senderRole: "super_admin",
              text: "NIN number: 12345678901",
            },
          ],
        },
    }));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(
      <MemoryRouter initialEntries={["/admin/communications?tab=inbox"]}>
        <Routes>
          <Route path="/admin/communications" element={<Communications />} />
          <Route path="/admin/agents/jobs" element={<p>Log jobs page</p>} />
        </Routes>
        <CurrentLocation />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /Ayo Agent/ }));
    const message = await within(await screen.findByRole("region", { name: "Conversation messages" }))
      .findByText(messageText);
    fireEvent.contextMenu(message.parentElement, { clientX: 100, clientY: 100 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Copy message" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(messageText));
    expect(mockSuccess).toHaveBeenCalledWith("Message copied.");

    const adminMessage = await within(screen.getByRole("region", { name: "Conversation messages" }))
      .findByText("NIN number: 12345678901");
    fireEvent.contextMenu(adminMessage.parentElement, { clientX: 100, clientY: 100 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Log a job" }));
    expect(await screen.findByText("Log jobs page")).toBeTruthy();
    expect(JSON.parse(screen.getByTestId("location").textContent)).toEqual({
      pathname: "/admin/agents/jobs",
      messageText: "NIN number: 12345678901",
    });
  });

  test("shows every unread message in the inbox and clears them after opening the chat", async () => {
    mockUseUser.mockReturnValue({ user: { id: "admin-1", role: "admin" } });
    let inboxLoads = 0;
    api.get.mockImplementation((path) => {
      if (path.endsWith("/conversations")) {
        inboxLoads += 1;
        return Promise.resolve({
          data: {
            conversations: [{
              _id: "conversation-1",
              unreadCount: inboxLoads === 1 ? 3 : 0,
              user: { name: "Ayo Agent", email: "ayo@example.com" },
              lastMessage: "I need help",
            }],
          },
        });
      }
      return Promise.resolve({
        data: {
          conversation: { _id: "conversation-1" },
          messages: [{ _id: "message-1", senderId: "agent-1", senderName: "Ayo Agent", text: "I need help" }],
        },
      });
    });

    render(<MemoryRouter><Communications /></MemoryRouter>);

    const inboxTab = await screen.findByRole("tab", { name: "Support inbox 3" });
    expect(screen.getByLabelText("3 unread messages")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("3 unread messages across 1 chat");
    expect(screen.getByRole("status").textContent).toContain("Ayo Agent");
    fireEvent.click(screen.getByRole("button", { name: /Ayo Agent/ }));

    expect(await screen.findByRole("tab", { name: "Support inbox 0" })).toBeTruthy();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(
      "/api/admin/communications/conversations/conversation-1/messages?markRead=true",
    ));
    expect(inboxTab).toBeTruthy();
  });

  test("updates the unread badge for a new message while viewing another communications tab", async () => {
    let pollInbox;
    const setIntervalSpy = vi.spyOn(window, "setInterval").mockImplementation((callback) => {
      pollInbox = callback;
      return 1;
    });
    vi.spyOn(window, "clearInterval").mockImplementation(() => {});
    let conversationsRequestCount = 0;
    api.get.mockImplementation((path) => {
      if (path.endsWith("/conversations")) {
        conversationsRequestCount += 1;
        return Promise.resolve({
          data: {
            conversations: [{
              _id: "conversation-1",
              unreadCount: conversationsRequestCount === 1 ? 0 : 3,
              user: { name: "Ayo Agent", email: "ayo@example.com" },
              lastMessage: conversationsRequestCount === 1 ? "Earlier message" : "New follow-up",
            }],
          },
        });
      }
      return Promise.resolve(path.endsWith("/templates")
        ? { data: { templates: [template] } }
        : path.endsWith("/nimc-feps")
          ? { data: { feps: [] } }
          : { data: { manualAgents: [], registeredUsers: [agent] } });
    });
    render(<MemoryRouter><Communications /></MemoryRouter>);

    expect(await screen.findByRole("tab", { name: "Support inbox 0" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Dispatch & recipients" }));
    await act(async () => {
      await pollInbox();
    });

    const inboxTab = screen.getByRole("tab", { name: "Support inbox 3" });
    expect(inboxTab.querySelector('[title="3 unread messages in 1 conversation"]')).toBeTruthy();
    expect(inboxTab.querySelector(".bg-rose-600")).toBeTruthy();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
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

  test("opens directly to the support inbox from an inbox deep link", async () => {
    api.get.mockImplementation((path) => Promise.resolve({
      data: path.endsWith("/conversations")
        ? { conversations: [{ _id: "conversation-1", unreadCount: 1, user: { name: "Ayo Agent" }, lastMessage: "Please help" }] }
        : path.endsWith("/templates")
          ? { templates: [template] }
          : { manualAgents: [], registeredUsers: [agent] },
    }));
    render(
      <MemoryRouter initialEntries={["/admin/communications?tab=inbox"]}>
        <Communications />
      </MemoryRouter>,
    );

    expect((await screen.findByRole("tab", { name: "Support inbox 1" })).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("status").textContent).toContain("Ayo Agent");
  });
});
