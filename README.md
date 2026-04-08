# Philadelphia Business Tax Calculator

**Starting in 2026, the $100K small business tax exemption disappears.** 122,000 Philadelphia small business owners will face a new—and probably surprise—tax bill.

This calculator helps you understand exactly how much more you'll owe.

**[Live Calculator](https://liftphilly.org/calculator/)** | **[Test Scenarios](https://liftphilly.org/calculator/test-results/)**

![Calculator Screenshot](https://indyhall.nyc3.digitaloceanspaces.com/lift-calculator/scenario_1_new.png)

## What This Calculates

- **Annual Tax Increase**: The ongoing yearly increase in your tax liability (comparing 2024 vs 2025 tax calculations)
- **Shock Year Increase**: The one-time cash flow hit when the exemption ends, including estimated payments

## Tax Rates by Year

| Year | BIRT (Net Income) | BIRT (Gross Receipts) | NPT |
|------|-------------------|----------------------|-----|
| 2020-2022 | 5.99% | 0.1415% | 3.79% |
| 2023 | 5.81% | 0.1415% | 3.75% |
| 2024 | 5.81% | 0.1415% | 3.75% |
| 2025 | 5.71% | 0.141% | 3.74% |
| 2026 | 5.65% | 0.1395% | 3.735% |
| 2027 | 5.60% | 0.139% | 3.73% |

**The $100K exemption** shielded small businesses from BIRT on gross receipts and reduced taxable net income through 2024. **In 2026, that shield is gone.**

## How the Math Works

### BIRT Calculation

```
Taxable Gross Receipts = max(0, Gross Receipts - Exemption)
Statutory Deduction    = (Net Income / Gross Receipts) × min(Gross Receipts, Exemption)
Taxable Net Income     = max(0, Net Income - Statutory Deduction)

BIRT Tax = (Taxable GR × BIRT GR Rate) + (Taxable NI × BIRT NI Rate)
```

### NPT Calculation

```
NPT (before credit) = Net Income × NPT Rate
BIRT Credit         = (Taxable NI × BIRT NI Rate) × 60%
NPT (after credit)  = max(0, NPT - BIRT Credit)
```

### Total Tax Liability

```
Total Tax = BIRT Tax + NPT (after credit)
```

## Decision Logic

### Which Year is the "Shock Year"?

```
                    ┌─────────────────────────┐
                    │  Gross Receipts ≤ $100K │
                    └───────────┬─────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                   YES                      NO
                    │                       │
                    ▼                       ▼
            ┌───────────────┐       ┌───────────────┐
            │  Shock Year:  │       │  Shock Year:  │
            │  April 2027   │       │  April 2026   │
            └───────────────┘       └───────────────┘
```

**Why?** Businesses under $100K had no BIRT liability before 2025 (fully covered by exemption). They get a "grace year" in 2026 for estimated payments, so their shock comes in 2027.

### Cash Flow Calculation (What You Actually Pay in April)

```
┌────────────────────────────────────────────────────────────────┐
│                     APRIL TAX FILING                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   Tax Due (for prior year)                                     │
│   + Estimated BIRT (100% of prior year BIRT)*                  │
│   + Estimated NPT (50% of prior year NPT)                      │
│   - Adjustment (credit for estimates paid last filing)         │
│   ─────────────────────────────────────────────────            │
│   = Total Cash Burden                                          │
│                                                                │
│   * First year filing or grace year = $0 estimated BIRT        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Annual Tax Increase vs Shock Year Increase

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ANNUAL TAX INCREASE                                            │
│  ═══════════════════                                            │
│  = (2025 Tax Liability) - (2024 Tax Liability)                  │
│                                                                 │
│  This is what your tax BILL increases by each year.             │
│  It's the "new normal" going forward.                           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SHOCK YEAR INCREASE                                            │
│  ═══════════════════                                            │
│  = (Shock Year Cash Burden) - (Prior Year Cash Burden)          │
│                                                                 │
│  This is the CASH FLOW hit in April of the shock year.          │
│  Includes tax due + estimated payments for the first time.      │
│  Often 2-3x larger than the annual increase.                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## S-Corp vs LLC Simulator

A separate interactive tool comparing S-Corp vs LLC tax outcomes under the proposed LIFT Act ([Bill No. 251026](https://liftphilly.org/petition/#sign-section)). Tests whether wealthy business owners would reclassify from S-Corp to LLC to capture the new BIRT exemption.

**[Live Simulator](https://liftphilly.org/simulator/)**

The simulator includes a TypeScript tax engine validated against a reference spreadsheet (79 tests, all passing).

## File Structure

```
├── index.html                    # BIRT increase calculator page
├── tax-calculator.js             # Calculator logic (shared module)
├── favicon.svg                   # LIFT logo
├── test-results/                 # Calculator verification suite
│   ├── index.html                # Visual comparison tool
│   └── scenario_*.png            # Baseline screenshots
└── simulator/                    # S-Corp vs LLC simulator
    ├── index.html                # Simulator page (self-contained)
    ├── lift-philly-entity-model.ts      # TypeScript tax engine
    ├── lift-philly-entity-model.test.ts  # 79 validation tests
    └── onePhilly_scorp_vs_llc_tax_model_v10.xlsx  # Reference spreadsheet
```

## Join the Coalition

122,000 working families, tradespeople, caregivers, gig workers, and creative entrepreneurs are facing this tax increase. LIFT Philly is a coalition supporting tax reform for Philadelphia's small business owners.

**[Join the coalition at liftphilly.org](https://liftphilly.org)**

## License

MIT
