/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
vi.mock("../../../lib/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
import api from "../../../lib/axios";
import WildThoughts from "../WildThoughts";

describe("WildThoughts", () => {
  let backendThoughts;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("user", JSON.stringify({ email: "owner@example.com" }));
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    backendThoughts = [];
    api.get.mockImplementation(async () => ({ data: { thoughts: backendThoughts } }));
    api.post.mockImplementation(async (_url, thought) => {
      const savedThought = {
        ...thought,
        _id: thought.id || "thought-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      backendThoughts.unshift(savedThought);
      return { data: { thought: savedThought } };
    });
    api.put.mockImplementation(async (_url, updates) => {
      backendThoughts[0] = { ...backendThoughts[0], ...updates, updatedAt: new Date().toISOString() };
      return { data: { thought: backendThoughts[0] } };
    });
    api.delete.mockImplementation(async () => {
      backendThoughts.shift();
      return { data: { success: true } };
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("saves and reloads an idea with its venture and category", async () => {
    const { unmount } = render(<WildThoughts />);

    fireEvent.change(await screen.findByLabelText("Thought title"), {
      target: { value: "Follow up with repair customer" },
    });
    fireEvent.change(screen.getByLabelText("Business or venture"), {
      target: { value: "Digital Services" },
    });
    fireEvent.change(screen.getByLabelText("Thought type"), {
      target: { value: "Client lead" },
    });
    fireEvent.change(screen.getByLabelText("Thought or details"), {
      target: { value: "Customer found the repair number online." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save thought" }));

    expect(await screen.findByText("Follow up with repair customer")).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith("/api/admin/wild-thoughts", expect.objectContaining({
      venture: "Digital Services",
      category: "Client lead",
    }));

    unmount();
    render(<WildThoughts />);
    expect(await screen.findByText("Follow up with repair customer")).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith("/api/admin/wild-thoughts");
  });

  test("edits a saved thought", async () => {
    render(<WildThoughts />);

    fireEvent.change(await screen.findByLabelText("Thought title"), {
      target: { value: "Original idea" },
    });
    fireEvent.change(screen.getByLabelText("Thought or details"), {
      target: { value: "Original details" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save thought" }));
    fireEvent.click(await screen.findByRole("button", { name: "Edit Original idea" }));
    fireEvent.change(screen.getByLabelText("Thought title"), {
      target: { value: "Updated idea" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update thought" }));

    expect(await screen.findByText("Updated idea")).toBeTruthy();
    expect(screen.queryByText("Original idea")).toBeNull();
    expect(api.put).toHaveBeenCalledWith("/api/admin/wild-thoughts/thought-1", expect.objectContaining({
      title: "Updated idea",
    }));
  });

  test("migrates previous browser-saved thoughts to the account API", async () => {
    const legacyThought = {
      id: "legacy-123",
      title: "Old note",
      venture: "Digital Services",
      category: "Client lead",
      body: "Follow up with the repair customer.",
      followUp: "",
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(
      "marthington:wild-thoughts:owner%40example.com",
      JSON.stringify([legacyThought]),
    );

    render(<WildThoughts />);

    expect(await screen.findByText("Old note")).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith("/api/admin/wild-thoughts", expect.objectContaining({
      id: "legacy-123",
      title: "Old note",
    }));
    expect(localStorage.getItem("marthington:wild-thoughts:owner%40example.com")).toBeNull();
  });
});
