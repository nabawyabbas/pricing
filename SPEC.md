# Releaseable Hour Pricer (Internal)

## Goal
Compute cost and price per "releaseable development hour" per tech stack.

Releaseable hour composition:
- DEV releaseable hour = 1.0 DEV + qaRatio * QA + baRatio * BA
- AGENTIC_AI releaseable hour = 1.0 AGENTIC_AI (NO QA/BA add-ons)

## Inputs (MVP)
### Tech Stacks
- PHP, Java, etc.

### Employees
- name
- category: DEV | QA | BA | AGENTIC_AI
- techStackId:
  - required for DEV and AGENTIC_AI
  - optional for QA/BA
- isActive (boolean, default true)
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
- isActive (boolean, default true)
- amount (money)
- period (enum OverheadPeriod: "annual" | "monthly" | "quarterly")

### Overhead Allocation (per employee)
- employeeId (reference to Employee)
- overheadTypeId (reference to OverheadType)
- share (0..1, the proportion of this overhead type allocated to the employee)

## Calculations
Employee annual base cost:
annualBase = grossMonthly*12 + grossMonthly*12*oncostRate + annualBenefits + annualBonus

Allocated overhead to employee (monthly):
For each OverheadAllocation for the employee:
  overheadMonthly =
    overheadType.amount / 12   if period="annual"
    overheadType.amount / 1    if period="monthly"
    overheadType.amount / 4    if period="quarterly"
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

Raw monthly cost (NO overhead allocations):
rawMonthly = grossMonthly*(1+oncostRate) + (annualBenefits/12) + (annualBonus/12)

DEV raw cost per releaseable hour for stack S:
devRawMonthly(S) = sum(rawMonthly of active DEV in stack S)
devHoursCapacity(S) = devReleasableHoursPerMonth * sum(fte of active DEV in stack S)
devRawCostPerRelHour(S) = devRawMonthly(S) / devHoursCapacity(S)

QA raw add-on per releaseable hour:
qaRawMonthly = sum(rawMonthly of active QA)
qaRawPerQaHour = qaRawMonthly / standardHoursPerMonth
qaRawAddOnPerRelHour = qaRatio * qaRawPerQaHour

BA raw add-on per releaseable hour:
baRawMonthly = sum(rawMonthly of active BA)
baRawPerBaHour = baRawMonthly / standardHoursPerMonth
baRawAddOnPerRelHour = baRatio * baRawPerBaHour

DEV COGS per releaseable hour (per stack S):
COGS(S) = devRawCostPerRelHour(S) + qaRawAddOnPerRelHour + baRawAddOnPerRelHour

Note: QA Add-on/hr and BA Add-on/hr columns in dashboard show raw costs only (qaRawAddOnPerRelHour and baRawAddOnPerRelHour).

Overhead per releaseable hour for each overhead type O (DEV stack S):
For each overhead type O:
  - DEV overhead per rel hour (type O, stack S) = calculated from DEV employees in stack S allocations to overhead type O
  - QA overhead per rel hour (type O):
    qaOverheadMonthly(O) = overheadMonthly(O) * sum(share for active QA employees allocated to O)
    qaPerQaHour(O) = qaOverheadMonthly(O) / standardHoursPerMonth
    qaOverheadPerRelHour(O) = qaRatio * qaPerQaHour(O)
  - BA overhead per rel hour (type O):
    baOverheadMonthly(O) = overheadMonthly(O) * sum(share for active BA employees allocated to O)
    baPerBaHour(O) = baOverheadMonthly(O) / standardHoursPerMonth
    baOverheadPerRelHour(O) = baRatio * baPerBaHour(O)
  - Total overhead per rel hour (type O, stack S) = devOverheadPerRelHour(O, S) + qaOverheadPerRelHour(O) + baOverheadPerRelHour(O)

Total overheads per releaseable hour (DEV stack S):
totalOverheadsPerRelHour(S) = sum(total overhead per rel hour for each overhead type O)

Total releaseable cost per hour (DEV stack S):
totalReleaseableCost(S) = COGS(S) + totalOverheadsPerRelHour(S)

Percent of total for any component X:
pct(X) = X / totalReleaseableCost(S)

AGENTIC_AI cost per releaseable hour for stack S:
agenticMonthlyCost(S) = sum(fullyLoadedMonthly of active AGENTIC_AI in stack S)
agenticHoursCapacity(S) = devReleasableHoursPerMonth * sum(fte of active AGENTIC_AI in stack S)
agenticCostPerRelHour(S) = agenticMonthlyCost(S) / agenticHoursCapacity(S)

AGENTIC_AI raw cost per releaseable hour for stack S:
agenticRawMonthly(S) = sum(rawMonthly of active AGENTIC_AI in stack S)
agenticRawCostPerRelHour(S) = agenticRawMonthly(S) / agenticHoursCapacity(S)

AGENTIC_AI total releaseable cost per hour:
agenticTotalReleaseableCost(S) = agenticCostPerRelHour(S)

### Active-only rule
- All calculations include ONLY:
  - Employees where isActive=true
  - OverheadTypes where isActive=true
- Inactive records may be shown in UI (optional) but are excluded from calculations by default.

## Pages (MVP)
- /stacks (CRUD)
- /employees (CRUD)
- /overheads (CRUD for OverheadType, allocation table per employee with overheadTypeId and share)
- /settings (edit settings by group, key-value editor)
- /results:
  - DEV table per stack: Dev Cost, QA Add-on, BA Add-on, COGS, overhead-by-type columns, Total Overheads/hr, Total Releaseable Cost/hr, Final Price/hr, and % of total for each component
  - AGENTIC_AI table per stack: Agentic Cost, overhead-by-type columns, Total Overheads/hr, Total Releaseable Cost/hr, Final Price/hr, and % of total