/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../../../components/admin/AgentCommissionSettings", () => ({
  default: () => null,
}));

vi.mock("../../../components/admin/CoreServicePricing", () => ({
  default: () => null,
}));

vi.mock("../../../components/ui/SlideOver", () => ({
  default: ({ isOpen, title, children }) => isOpen
    ? <section role="dialog" aria-label={title}><h2>{title}</h2>{children}</section>
    : null,
}));

import api from "../../../lib/axios";
import AdminPricing from "../AdminPricing";

const services = [
  { serviceCode: "validation-noRecord", category: "NIMC", name: "No Record", type: "noRecord", price: 1000, status: "active", metadata: { trending: true, formFields: [{ key: "nin", label: "NIN", type: "text", required: true }] } },
  { serviceCode: "modification-name", category: "NIMC", name: "Name Modification", type: "name", price: 12000, status: "active", metadata: { trending: true, formFields: [] } },
  { serviceCode: "modification-dob", category: "NIMC", name: "DOB Modification", type: "dob", price: 65000, status: "active", metadata: { trending: true, formFields: [] } },
  { serviceCode: "validation-vnin", category: "NIMC", name: "V-NIN Validation", type: "vnin", price: 1000, status: "active", metadata: { trending: true, formFields: [] } },
  { serviceCode: "modification-phone", category: "NIMC", name: "Phone Modification", type: "phone", price: 12000, status: "active", metadata: { formFields: [] } },
  ...Array.from({ length: 9 }, (_, index) => ({
    serviceCode: `other-${index}`,
    category: "NIMC",
    name: `Other Service ${index}`,
    type: `other${index}`,
    price: 500,
    status: "active",
    metadata: { formFields: [] },
  })),
];

describe("AdminPricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("user", JSON.stringify({ email: "admin@example.com" }));
    api.get.mockImplementation((path) => {
      if (path === "/api/admin/categories") {
        return Promise.resolve({ data: { categories: [{ slug: "nimc", label: "NIMC", isActive: true }] } });
      }
      if (path === "/api/admin/services") {
        return Promise.resolve({ data: { services } });
      }
      return Promise.resolve({ data: { settings: { commissionType: "FLAT", commissionValue: 2000 } } });
    });
  });

  test("prioritizes featured NIMC services and paginates the full list", async () => {
    render(<AdminPricing />);

    const featuredHeading = await screen.findByRole("heading", { name: "Featured NIMC services" });
    const featuredSection = featuredHeading.closest("section");
    const featuredNames = within(featuredSection).getAllByRole("button").map((button) => button.querySelectorAll("span")[1].textContent);
    expect(featuredNames).toEqual([
      "Name Modification",
      "DOB Modification",
      "No Record",
      "V-NIN Validation",
      "Phone Modification",
    ]);
    expect(await screen.findByText("Page 1 of 2")).toBeTruthy();
    expect(screen.getByText("Other Service 0")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));

    expect(await screen.findByText("Page 2 of 2")).toBeTruthy();
    expect(screen.getByText("Other Service 8")).toBeTruthy();
  });

  test("opens a service editor from a catalog row and edits form fields in a separate dialog", async () => {
    render(<AdminPricing />);

    const serviceCard = (await screen.findAllByRole("button"))
      .find((button) => button.textContent.includes("No Recordvalidation-noRecord"));
    fireEvent.click(serviceCard);

    expect(await screen.findByRole("dialog", { name: "Edit Service" })).toBeTruthy();
    expect(screen.getByText("1 form fields configured")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Edit form fields/ }));

    expect(await screen.findByRole("dialog", { name: "Edit No Record Form" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Edit Service" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Done editing form" }));

    await waitFor(() => expect(screen.getByRole("dialog", { name: "Edit Service" })).toBeTruthy());
    expect(screen.getByText("1 form fields configured")).toBeTruthy();
  });
});
