/** @vitest-environment jsdom */
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { mockToastError, mockToastInfo, mockUser } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastInfo: vi.fn(),
  mockUser: { id: "agent-1", role: "user" },
}));

vi.mock("../../context/UserContext", () => ({
  useUser: () => ({ user: mockUser }),
}));
vi.mock("../../context/ToastContext", () => ({
  useToast: () => ({ error: mockToastError, info: mockToastInfo }),
}));
vi.mock("../../lib/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import api from "../../lib/axios";
import SupportChatWidget from "../SupportChatWidget";

describe("SupportChatWidget", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { conversation: null, messages: [] } });
  });

  test.each(["admin", "super_admin"])("notifies an agent about a new %s reply while chat is open", async (senderRole) => {
    let refreshConversation;
    vi.spyOn(window, "setInterval").mockImplementation((callback, delay) => {
      if (delay === 10000) refreshConversation = callback;
      return 1;
    });
    vi.spyOn(window, "clearInterval").mockImplementation(() => {});
    api.get
      .mockResolvedValueOnce({ data: { conversation: null, messages: [] } })
      .mockResolvedValueOnce({
        data: {
          conversation: { _id: "conversation-1" },
          messages: [{
            _id: "reply-1",
            senderId: "support-1",
            senderRole,
            text: "We have received your request",
          }],
        },
      });

    render(<MemoryRouter><SupportChatWidget inline /></MemoryRouter>);
    expect(await screen.findByRole("region", { name: "Chat with support" })).toBeTruthy();
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    await act(async () => {
      await refreshConversation();
    });

    expect(await screen.findByText("We have received your request")).toBeTruthy();
    expect(mockToastInfo).toHaveBeenCalledWith(
      "New message from support. Open Chat with support to read it.",
      7000,
    );
  });

  test("opens a text-only chat and sends a message to support", async () => {
    api.post.mockResolvedValue({
      data: {
        conversation: { _id: "conversation-1" },
        message: { _id: "message-1", senderId: "agent-1", text: "Please help me" },
      },
    });
    render(<MemoryRouter><SupportChatWidget /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: "Chat with support" }));
    expect(await screen.findByRole("region", { name: "Chat with support" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Text message"), { target: { value: "Please help me" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      "/api/communications/conversation/messages",
      { text: "Please help me" },
    ));
    expect(await screen.findByText("Please help me")).toBeTruthy();
  });

  test("does not duplicate the inline chat with a floating launcher on the support page", async () => {
    render(
      <MemoryRouter initialEntries={["/support-chat"]}>
        <SupportChatWidget />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("region", { name: "Chat with support" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Chat with support" })).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });

  test("renders the inline chat for a super-admin in the user workspace", async () => {
    mockUser.role = "super_admin";
    render(
      <MemoryRouter initialEntries={["/support-chat"]}>
        <SupportChatWidget inline />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("region", { name: "Chat with support" })).toBeTruthy();
    expect(screen.getByLabelText("Text message")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Close support chat" })).toBeNull();
    mockUser.role = "user";
  });
});
