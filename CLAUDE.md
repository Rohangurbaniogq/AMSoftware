@AGENTS.md

# Form Page — Single Period Only

The form page (`app/form/page.tsx`) uses a single period selector for the entire submission. There is NO separate "Reporting Period" card and NO separate "Planned Period" selector under Interventions. The one period dropdown lives inside the Interventions card. The `plannedPeriodStart` and `plannedPeriodEnd` fields are sent as empty strings. Do not add a second period selector or a separate reporting period card.
