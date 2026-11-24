/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const { mockUseUser } = vi.hoisted(() => ({ mockUseUser: vi.fn() }));
vi.mock("../../../context/UserContext", () => ({ useUser: () => mockUseUser() }));
vi.mock("../AdminUsers", () => ({ default: () => <p>User directory content</p> }));
vi.mock("../AdminNotifications", () => ({ default: () => <p>Notification center content</p> }));
vi.mock("../Communications", () => ({
  default: ({ mode }) => <p>{mode === "inbox" ? "Support inbox content" : `${mode} content`}</p>,
}));
vi.mock("../AgentManagement", () => ({
  default: ({ view }) => <p>{view === "jobs" ? "Logged jobs content" : "Agent directory content"}</p>,
}));
vi.mock("../OutsourcedJobs", () => ({ default: () => <p>Outsourced workflows content</p> }));

import PeopleSupport from "../PeopleSupport";
import AgentsJobs from "../AgentsJobs";
import LegacyCommunicationsRedirect from "../LegacyCommunicationsRedirect";

function LocationOutput() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

describe("admin workspaces", () => {
  afterEach(cleanup);

  test("keeps user management and notifications Super Admin-only while Admins retain support access", () => {
    mockUseUser.mockReturnValue({ user: { role: "admin" } });
    render(
      <MemoryRouter initialEntries={["/admin/people?tab=users"]}>
        <PeopleSupport />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("tab", { name: "User directory" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Notifications" })).toBeNull();
    expect(screen.getByText("Support inbox content")).toBeTruthy();
    expect(screen.queryByText("User directory content")).toBeNull();
  });

  test("exposes the user directory and notification center to Super Admins", () => {
    mockUseUser.mockReturnValue({ user: { role: "super_admin" } });
    render(
      <MemoryRouter initialEntries={["/admin/people?tab=users"]}>
        <PeopleSupport />
      </MemoryRouter>,
    );

    expect(screen.getByText("User directory content")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Notifications" }));
    expect(screen.getByText("Notification center content")).toBeTruthy();
  });

  test("groups agent directories, logged jobs, outsourced jobs, and messaging tools", () => {
    render(
      <MemoryRouter initialEntries={["/admin/agents?tab=jobs"]}>
        <AgentsJobs />
      </MemoryRouter>,
    );

    expect(screen.getByText("Logged jobs content")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Outsourced agents & jobs" }));
    expect(screen.getByText("Outsourced workflows content")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Message dispatch" }));
    expect(screen.getByText("dispatch content")).toBeTruthy();
  });

  test("redirects legacy communication links to the matching workspace and retains query parameters", () => {
    render(
      <MemoryRouter initialEntries={["/admin/communications?tab=dispatch&source=legacy"]}>
        <Routes>
          <Route path="/admin/communications" element={<LegacyCommunicationsRedirect />} />
          <Route path="/admin/agents" element={<LocationOutput />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("location").textContent).toBe("/admin/agents?tab=dispatch&source=legacy");
  });

  test("routes legacy support and notification links into People & Support", () => {
    render(
      <MemoryRouter initialEntries={["/admin/communications?tab=inbox"]}>
        <Routes>
          <Route path="/admin/communications" element={<LegacyCommunicationsRedirect />} />
          <Route path="/admin/people" element={<LocationOutput />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("location").textContent).toBe("/admin/people?tab=support");
  });
});
