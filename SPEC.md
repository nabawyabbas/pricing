# Releaseable Hour Pricer (Internal)

## Goal
Compute cost and price per "releaseable development hour" per tech stack.

Releaseable hour composition:
- 1.0 Dev hour
- 0.5 QA hour
- 0.25 BA hour

## Inputs (MVP)
### Tech Stacks
- PHP, Java, etc.

### Employees
- name
- category: DEV | QA | BA
- techStackId (required for DEV, optional for QA/BA)
- grossMonthly (number)
- netMonthly (number, informational)
- oncostRate (percent of gross, optional)
- annualBenefits (number, optional)
- annualBonus (number, optional)
- fte (default 1.0)

### Settings
- key (string, unique identifier)
- value (string, stored as string, converted based on valueType)
- valueType (enum: "string" | "number" | "float" | "integer" | "boolean")
- group (string, e.g., "hours", "ratios", "pricing")
- unit (string, optional, e.g., "hours/month", "%", "$")

Example settings:
- devReleasableHoursPerMonth: value="100", valueType="float", group="hours", unit="hours/month"
- standardHoursPerMonth: value="160", valueType="float", group="hours", unit="hours/month"
- qaRatio: value="0.5", valueType="float", group="ratios", unit=""
- baRatio: value="0.25", valueType="float", group="ratios", unit=""
- margin: value="0.2", valueType="float", group="pricing", unit=""
- risk: value="0.1", valueType="float", group="pricing", unit=""

### Overhead Types
- name (string, e.g., "Management", "Company", "Infrastructure")
- amount (money)
- period (enum: "annual" | "monthly" | "quarterly")

### Overhead Allocation (per employee)
- employeeId (reference to Employee)
- overheadTypeId (reference to OverheadType)
- share (0..1, the proportion of this overhead type allocated to the employee)

## Calculations
Employee annual base cost:
annualBase = grossMonthly*12 + grossMonthly*12*oncostRate + annualBenefits + annualBonus

Allocated overhead to employee (monthly):
For each OverheadAllocation for the employee:
  overheadMonthly = overheadType.amount / (12 if period="annual", 1 if period="monthly", 4 if period="quarterly")
  allocatedOverheadMonthly += overheadMonthly * share

allocatedOverheadMonthly = sum(overheadMonthly * share for each allocated overhead type)

Fully loaded annual:
allocatedOverheadAnnual = allocatedOverheadMonthly * 12
fullyLoadedAnnual = annualBase + allocatedOverheadAnnual

Fully loaded monthly:
fullyLoadedMonthly = fullyLoadedAnnual / 12

Get settings:
devReleasableHoursPerMonth = Settings.get("devReleasableHoursPerMonth").value (as float)
standardHoursPerMonth = Settings.get("standardHoursPerMonth").value (as float)
qaRatio = Settings.get("qaRatio").value (as float)
baRatio = Settings.get("baRatio").value (as float)
margin = Settings.get("margin").value (as float)
risk = Settings.get("risk").value (as float)

DEV cost per releaseable hour for a stack S:
devMonthlyCost(S) = sum(fullyLoadedMonthly of DEV in stack S)
devHoursCapacity(S) = devReleasableHoursPerMonth * sum(fte of DEV in stack S)
devCostPerRelHour(S) = devMonthlyCost(S) / devHoursCapacity(S)

QA cost per dev releaseable hour:
qaMonthlyCost = sum(fullyLoadedMonthly of QA)
qaCostPerQaHour = qaMonthlyCost / standardHoursPerMonth
qaCostPerDevRelHour = qaRatio * qaCostPerQaHour

BA cost per dev releaseable hour:
baMonthlyCost = sum(fullyLoadedMonthly of BA)
baCostPerBaHour = baMonthlyCost / standardHoursPerMonth
baCostPerDevRelHour = baRatio * baCostPerBaHour

Releaseable cost per hour:
releaseableCost(S) = devCostPerRelHour(S) + qaCostPerDevRelHour + baCostPerDevRelHour

Final price:
finalPrice(S) = releaseableCost(S) * (1 + margin) * (1 + risk)

## Pages (MVP)
- /stacks (CRUD)
- /employees (CRUD)
- /overheads (CRUD for OverheadType, allocation table per employee with overheadTypeId and share)
- /settings (edit settings by group, key-value editor)
- /results (per-stack: dev rate, QA rate, BA rate, releaseable cost, final price + explain breakdown)
