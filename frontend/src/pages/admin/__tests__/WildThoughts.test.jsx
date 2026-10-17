/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import WildThoughts from "../WildThoughts";

describe("WildThoughts", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("user", JSON.stringify({ email: "owner@example.com" }));
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.spyOn(window, "confirm").mockReturnValue(true);
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
    expect(JSON.parse(localStorage.getItem("marthington:wild-thoughts:owner%40example.com"))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ venture: "Digital Services", category: "Client lead" }),
      ]),
    );

    unmount();
    render(<WildThoughts />);
    expect(await screen.findByText("Follow up with repair customer")).toBeTruthy();
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
  });
});
