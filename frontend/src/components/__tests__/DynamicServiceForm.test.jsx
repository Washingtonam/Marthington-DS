/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import DynamicServiceForm from "../DynamicServiceForm";

describe("DynamicServiceForm", () => {
  test("renders title and subtitle fields without inputs and submits uploaded files", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const service = {
      serviceCode: "cac-sole-proprietorship",
      metadata: {
        formFields: [
          { key: "sole-proprietorship", label: "Sole Proprietorship", type: "title" },
          { key: "registration", label: "Registration details", type: "subtitle" },
          { key: "identity-document", label: "Identity document", type: "upload", required: true },
        ],
      },
    };
    const { container } = render(<DynamicServiceForm service={service} onSubmit={onSubmit} />);

    expect(screen.getByRole("heading", { name: "Sole Proprietorship" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Registration details" })).toBeTruthy();
    expect(container.querySelectorAll("input")).toHaveLength(1);

    const file = new File(["abc"], "identity.png", { type: "image/png" });
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Service" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0].formData).toEqual({
      "identity-document": "data:image/png;base64,YWJj",
    });
  });
});
