/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mockToastError = vi.hoisted(() => vi.fn());

vi.mock("../../context/UserContext", () => ({
  useUser: () => ({ user: { id: "agent-1", role: "user" } }),
}));
vi.mock("../../context/ToastContext", () => ({ useToast: () => ({ error: mockToastError }) }));
vi.mock("../../lib/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import api from "../../lib/axios";
import SupportChatWidget from "../SupportChatWidget";

describe("SupportChatWidget", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { conversation: null, messages: [] } });
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

  test("opens automatically when a user navigates to Chat with support", async () => {
    render(
      <MemoryRouter initialEntries={["/support-chat"]}>
        <SupportChatWidget />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("region", { name: "Chat with support" })).toBeTruthy();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/api/communications/conversation"));
  });
});
