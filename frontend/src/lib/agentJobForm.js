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
    const match = line.match(/^\s*([^:]+?)(?:\?\s*:\s*|\s*:\s*|\?\s+)(.*?)\s*$/);
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

const normalizeFormName = (value) => String(value || "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const formFieldOptions = (field) => (
  Array.isArray(field?.options)
    ? field.options
    : String(field?.options || "").split(",").map((option) => option.trim()).filter(Boolean)
);

export function generateCatalogServiceForm(formFields = []) {
  return formFields
    .filter((field) => field?.key && !["title", "subtitle", "upload"].includes(field.type))
    .map((field) => {
      const label = field.label || agentJobFieldLabels[field.key] || field.key;
      if (field.type === "select" && formFieldOptions(field).some((option) => /^(yes|no)$/i.test(String(option)))) {
        return `${label}: Yes [ ] No [ ]`;
      }
      return `${label}:`;
    })
    .join("\n");
}

export function parseCatalogServiceForm(text, formFields = []) {
  const result = {};
  const parsedStandardFields = parseAgentJobForm(text);
  const aliases = {
    previousSelfServiceModification: "previousSelfServiceModification",
    nin: "nin",
    surname: "surname",
    lastName: "surname",
    firstName: "firstName",
    middleName: "middleName",
    dateOfBirth: "dateOfBirth",
    email: "email",
    emailAddress: "email",
    whatsapp: "whatsapp",
    phone: "whatsapp",
    phoneNumber: "whatsapp",
  };
  const parsedLines = new Map();
  String(text || "").replace(/\r\n?/g, "\n").split("\n").forEach((line) => {
    const match = line.match(/^\s*([^:]+?)(?:\?\s*:\s*|\s*:\s*|\?\s+)(.*?)\s*$/);
    if (match) parsedLines.set(normalizeFormName(match[1]), match[2].trim());
  });

  formFields.forEach((field) => {
    if (!field?.key || ["title", "subtitle", "upload"].includes(field.type)) return;
    const names = [field.label, field.key].filter(Boolean).map(normalizeFormName);
    const direct = names.find((name) => parsedLines.has(name));
    if (direct) {
      let value = parsedLines.get(direct);
      const options = formFieldOptions(field);
      const checkedYes = value.match(/\byes\s*\[\s*([x✓✔]?)\s*\]/i);
      const checkedNo = value.match(/\bno\s*\[\s*([x✓✔]?)\s*\]/i);
      if (checkedYes?.[1] && checkedNo?.[1]) return;
      const choice = checkedYes?.[1] ? "yes" : checkedNo?.[1] ? "no" : value.match(/^\s*(yes|no)\s*$/i)?.[1];
      if (field.type === "checkbox" && choice) {
        value = choice.toLowerCase() === "yes";
      } else if (field.type === "select" && choice) {
        value = options.find((option) => String(option).toLowerCase() === choice.toLowerCase()) || value;
      }
      if (field.type === "date" && typeof value === "string") {
        const dateMatch = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (dateMatch) {
          const [, first, second, year] = dateMatch;
          const month = Number(first) > 12 ? second : first;
          const day = Number(first) > 12 ? first : second;
          value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
      }
      result[field.key] = value;
      return;
    }

    const standardKey = aliases[field.key];
    if (standardKey && Object.prototype.hasOwnProperty.call(parsedStandardFields, standardKey)) {
      const value = parsedStandardFields[standardKey];
      if (field.type === "checkbox" && /^(yes|no)$/i.test(value)) {
        result[field.key] = value.toLowerCase() === "yes";
      } else if (field.type === "select") {
        const options = formFieldOptions(field);
        result[field.key] = options.find((option) => String(option).toLowerCase() === value.toLowerCase()) || value;
      } else {
        result[field.key] = value;
      }
    }
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
