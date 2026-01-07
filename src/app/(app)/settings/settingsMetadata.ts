/**
 * Metadata for settings keys: friendly names, descriptions, and input types
 */
export interface SettingMetadata {
  label: string;
  description: string;
  inputType: "number" | "percent" | "money" | "text";
  group: string;
  required: boolean;
}

export const SETTINGS_METADATA: Record<string, SettingMetadata> = {
  dev_releasable_hours_per_month: {
    label: "Dev Releasable Hours per Month",
    description: "Number of billable/releasable hours per month for DEV employees",
    inputType: "number",
    group: "Assumptions",
    required: true,
  },
  standard_hours_per_month: {
    label: "Standard Hours per Month",
    description: "Standard working hours per month (typically 160)",
    inputType: "number",
    group: "Assumptions",
    required: true,
  },
  qa_ratio: {
    label: "QA Ratio",
    description: "Ratio of QA hours to dev releaseable hours (e.g., 0.5 = 50%)",
    inputType: "percent",
    group: "Ratios",
    required: true,
  },
  ba_ratio: {
    label: "BA Ratio",
    description: "Ratio of BA hours to dev releaseable hours (e.g., 0.25 = 25%)",
    inputType: "percent",
    group: "Ratios",
    required: true,
  },
  margin: {
    label: "Margin",
    description: "Profit margin applied to releaseable cost (e.g., 0.2 = 20%)",
    inputType: "percent",
    group: "Pricing",
    required: true,
  },
  risk: {
    label: "Risk Factor",
    description: "Risk adjustment factor applied to pricing (e.g., 0.1 = 10%)",
    inputType: "percent",
    group: "Pricing",
    required: true,
  },
  exchange_ratio: {
    label: "Exchange Ratio (EGP per USD)",
    description: "Currency exchange rate: 1 USD = X EGP (0 = use EGP)",
    inputType: "money",
    group: "Pricing",
    required: false,
  },
};

export const REQUIRED_SETTINGS = [
  "dev_releasable_hours_per_month",
  "standard_hours_per_month",
  "qa_ratio",
  "ba_ratio",
  "margin",
  "risk",
];

export const CORE_DEFAULTS = {
  dev_releasable_hours_per_month: "100",
  standard_hours_per_month: "160",
  qa_ratio: "0.5",
  ba_ratio: "0.25",
};

