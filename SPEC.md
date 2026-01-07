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

### Overheads
- managementOverheadAnnual (money)
- companyOverheadAnnual (money)

### Overhead Allocation (per employee)
- mgmtShare (0..1)
- companyShare (0..1)

### Assumptions
- devReleasableHoursPerMonth (default 100, adjustable)
- standardHoursPerMonth (default 160, adjustable; for QA/BA hourly conversion)
- qaRatio (default 0.5)
- baRatio (default 0.25)
- margin (e.g. 0.2)
- risk (e.g. 0.1)

## Calculations
Employee annual base cost:
annualBase = grossMonthly*12 + grossMonthly*12*oncostRate + annualBenefits + annualBonus

Allocated overhead to employee:
allocatedOverhead = mgmtPoolAnnual*mgmtShare + companyPoolAnnual*companyShare

Fully loaded annual:
fullyLoadedAnnual = annualBase + allocatedOverhead

Fully loaded monthly:
fullyLoadedMonthly = fullyLoadedAnnual / 12

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
- /overheads (edit pools + allocation table per employee)
- /assumptions (edit assumptions)
- /results (per-stack: dev rate, QA rate, BA rate, releaseable cost, final price + explain breakdown)
