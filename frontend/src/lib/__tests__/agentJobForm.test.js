import { describe, expect, it } from "vitest";
import { getAgentJobFormFields, parseAgentJobForm } from "../agentJobForm";

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
});
