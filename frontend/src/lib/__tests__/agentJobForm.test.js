import { describe, expect, it } from "vitest";
import { getAgentJobFormFields, parseAgentJobForm, parseCatalogServiceForm } from "../agentJobForm";

describe("agent job form parser", () => {
  it("maps recognized name-modification fields and checked yes/no choices", () => {
    const parsed = parseAgentJobForm([
      "Have you ever done modification before via NIMC Self-Service Portal? Yes [x] No [ ]",
      "NIN: TEST-NIN",
      "Last Name/Surname: Example",
      "First Name: Sample",
      "Email: example@example.test",
      "GSM: 0000000000",
    ].join("\n"));

    expect(parsed).toEqual({
      previousSelfServiceModification: "Yes",
      nin: "TEST-NIN",
      surname: "Example",
      firstName: "Sample",
      email: "example@example.test",
      whatsapp: "0000000000",
    });
    expect(getAgentJobFormFields("name-modification")).not.toContain("dateOfBirth");
  });

  it("normalizes an explicit date of birth and keeps unchecked choices blank", () => {
    const parsed = parseAgentJobForm([
      "Have you ever done modification before via NIMC Self-Service Portal? Yes [ ] No [ ]",
      "Date of Birth: 15/03/2000",
    ].join("\n"));

    expect(parsed.previousSelfServiceModification).toBe("");
    expect(parsed.dateOfBirth).toBe("2000-03-15");
    expect(getAgentJobFormFields("date-of-birth-modification")).toContain("dateOfBirth");
  });

  it("does not guess when both yes/no boxes are selected", () => {
    const parsed = parseAgentJobForm(
      "Have you ever done modification before via NIMC Self-Service Portal? Yes [x] No [x]",
    );

    expect(parsed).not.toHaveProperty("previousSelfServiceModification");
  });

  it("maps pasted labels to the selected service fields and its configured options", () => {
    const fields = [
      { key: "nin", label: "NIN number", type: "text" },
      { key: "self-service", label: "Have you ever done modification before via NIMC Self-Service Portal?", type: "select", options: "Yes,No" },
      { key: "dateOfBirth", label: "Date of Birth", type: "date" },
      { key: "isVerified", label: "Verified", type: "checkbox" },
    ];

    expect(parseCatalogServiceForm([
      "NIN number: 12345678901",
      "Have you ever done modification before via NIMC Self-Service Portal? Yes [x] No [ ]",
      "Date of Birth: 15/03/2000",
      "Verified: No",
    ].join("\n"), fields)).toEqual({
      nin: "12345678901",
      "self-service": "Yes",
      dateOfBirth: "2000-03-15",
      isVerified: false,
    });

    expect(parseCatalogServiceForm("Previous modification?: No", [
      { key: "previous-modification", label: "Previous modification?", type: "select", options: ["Yes", "No"] },
    ])).toEqual({ "previous-modification": "No" });
  });
});
