const fields = [
  {
    key: "previousSelfServiceModification",
    labels: ["have you ever done modification before via nimc self-service portal", "previous self service modification"],
    type: "choice",
  },
  { key: "nin", labels: ["nin", "national identification number"] },
  { key: "surname", labels: ["last name/surname", "surname", "last name"] },
  { key: "firstName", labels: ["first name", "given name"] },
  { key: "middleName", labels: ["middle name"] },
  { key: "dateOfBirth", labels: ["date of birth", "dob", "birth date"], type: "date" },
  { key: "email", labels: ["email address", "email"] },
  { key: "whatsapp", labels: ["whatsapp number", "whatsapp", "gsm", "phone number", "phone"] },
];

const normalizeLabel = (value) => value.toLowerCase()
  .replace(/[()*?:]/g, "")
  .replaceAll("[", "")
  .replaceAll("]", "")
  .replace(/\s+/g, " ")
  .trim();

export function parseAgentJobForm(text) {
  const result = {};
  const normalizedText = String(text || "").replace(/\r\n?/g, "\n");
  const lines = normalizedText.split("\n");

  lines.forEach((line, index) => {
    const match = line.match(/^\s*([^:]+?)(?:\s*:\s*|\?\s*)(.*?)\s*$/);
    if (!match) return;

    const label = normalizeLabel(match[1]);
    const definition = fields.find((field) => field.labels.some((candidate) => normalizeLabel(candidate) === label));
    if (!definition) return;

    let value = match[2].trim();
    if (definition.type === "choice") {
      const options = value || lines[index + 1] || "";
      const yes = options.match(/\byes\s*\[\s*([x✓✔]?)\s*\]/i);
      const no = options.match(/\bno\s*\[\s*([x✓✔]?)\s*\]/i);
      if (yes?.[1] && no?.[1]) return;
      if (yes?.[1]) value = "Yes";
      else if (no?.[1]) value = "No";
      else {
        const plainChoice = options.match(/^\s*(yes|no)\s*$/i);
        value = plainChoice ? plainChoice[1] : "";
      }
    }

    if (definition.type === "date" && value) {
      const dateMatch = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (dateMatch) {
        const [, first, second, year] = dateMatch;
        const month = Number(first) > 12 ? second : first;
        const day = Number(first) > 12 ? first : second;
        value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }

    result[definition.key] = value;
  });

  return result;
}

export function getAgentJobFormFields(serviceType) {
  if (serviceType === "name-modification") {
    return ["previousSelfServiceModification", "nin", "surname", "firstName", "middleName", "email", "whatsapp"];
  }
  if (serviceType === "date-of-birth-modification") {
    return ["previousSelfServiceModification", "nin", "surname", "firstName", "middleName", "dateOfBirth", "email", "whatsapp"];
  }
  return ["nin", "surname", "firstName", "middleName", "dateOfBirth", "email", "whatsapp"];
}

export const agentJobFieldLabels = {
  previousSelfServiceModification: "Previous self-service modification",
  nin: "NIN",
  surname: "Last name / surname",
  firstName: "First name",
  middleName: "Middle name",
  dateOfBirth: "Date of birth",
  email: "Email",
  whatsapp: "WhatsApp / GSM",
};
