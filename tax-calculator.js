// Shared LIFT Tax Calculator Logic
// Used by: calculator/index.html, calculator/test-results/index.html

(function() {
    // Tax rates by year (from Jigar's model)
    const TAX_RATES = {
        2020: { birtNI: 0.0599, birtGR: 0.001415, npt: 0.0379 },
        2021: { birtNI: 0.0599, birtGR: 0.001415, npt: 0.0379 },
        2022: { birtNI: 0.0599, birtGR: 0.001415, npt: 0.0379 },
        2023: { birtNI: 0.0581, birtGR: 0.001415, npt: 0.0375 },
        2024: { birtNI: 0.0581, birtGR: 0.001415, npt: 0.0375 },
        2025: { birtNI: 0.0571, birtGR: 0.00141, npt: 0.0374 },
        2026: { birtNI: 0.0565, birtGR: 0.001395, npt: 0.03735 },
        2027: { birtNI: 0.056, birtGR: 0.00139, npt: 0.0373 }
    };

    // Exemption by year (removed starting 2025)
    const EXEMPTION_BY_YEAR = {
        2020: 100000,
        2021: 100000,
        2022: 100000,
        2023: 100000,
        2024: 100000,
        2025: 0,
        2026: 0,
        2027: 0
    };

    const BIRT_CREDIT_RATE = 0.6;
    const NPT_ESTIMATED_RATE = 0.5;

    // Format currency
    function formatCurrency(amount) {
        return '$' + Math.round(amount).toLocaleString();
    }

    // Format currency with commas but no decimals
    function formatNumber(amount) {
        return Math.round(amount).toLocaleString();
    }

    // Parse currency input
    function parseCurrency(str) {
        return parseFloat(str.replace(/[^0-9.-]/g, '')) || 0;
    }

    // Calculate taxable amounts for a year
    function calculateTaxableAmounts(netIncome, grossReceipts, year, businessExisted) {
        if (!businessExisted) {
            return { taxableGR: 0, taxableNI_NPT: 0, taxableNI_BIRT: 0, statutoryDeduction: 0 };
        }

        const exemption = EXEMPTION_BY_YEAR[year];

        // Taxable Gross Receipts = max(0, grossReceipts - exemption)
        const taxableGR = Math.max(0, grossReceipts - exemption);

        // Taxable Net Income (NPT basis) = full net income (no exemption for NPT)
        const taxableNI_NPT = netIncome;

        // Taxable Net Income (BIRT basis) - uses statutory deduction formula
        let statutoryDeduction = 0;
        if (exemption > 0 && grossReceipts > 0) {
            const ratio = Math.min(netIncome / grossReceipts, 1.0);
            if (grossReceipts < exemption) {
                statutoryDeduction = ratio * grossReceipts;
            } else {
                statutoryDeduction = ratio * exemption;
            }
        }
        const taxableNI_BIRT = Math.max(0, netIncome - statutoryDeduction);

        return { taxableGR, taxableNI_NPT, taxableNI_BIRT, statutoryDeduction };
    }

    // Calculate tax liability for a year
    function calculateTaxLiability(netIncome, grossReceipts, year, businessExisted) {
        const rates = TAX_RATES[year];
        const { taxableGR, taxableNI_NPT, taxableNI_BIRT, statutoryDeduction } = calculateTaxableAmounts(netIncome, grossReceipts, year, businessExisted);

        // BIRT taxes
        const birtGR = taxableGR * rates.birtGR;
        const birtNI = taxableNI_BIRT * rates.birtNI;
        const birtTotal = birtGR + birtNI;

        // NPT tax
        const nptGross = taxableNI_NPT * rates.npt;

        // BIRT credit against NPT (60% of BIRT Net Income portion)
        const birtCredit = birtNI * BIRT_CREDIT_RATE;

        // NPT after credit (cannot go below 0)
        const nptAfterCredit = Math.max(0, nptGross - birtCredit);

        // Total tax liability
        const totalTax = birtTotal + nptAfterCredit;

        return {
            year,
            businessExisted,
            taxableGR,
            taxableNI_BIRT,
            taxableNI_NPT,
            statutoryDeduction,
            birtGR,
            birtNI,
            birtTotal,
            nptGross,
            birtCredit,
            nptAfterCredit,
            totalTax,
            rates,
            exemption: EXEMPTION_BY_YEAR[year],
            grossReceipts,
            netIncome
        };
    }

    // Calculate cash flow for a year (what you actually pay in April of year)
    function calculateCashFlow(taxLiabilities, year, startYear) {
        const startYearInt = parseInt(startYear);
        const priorYear = taxLiabilities[year - 1];

        if (!priorYear || !priorYear.businessExisted) {
            return {
                year,
                taxDue: 0,
                estBIRT: 0,
                estNPT: 0,
                adjustment: 0,
                totalCashBurden: 0,
                isGraceYear: false,
                paidInYear: year
            };
        }

        // Tax due = prior year's total tax liability
        const taxDue = priorYear.totalTax;

        // First year filing check
        const isFirstYearFiling = (year - 1 === startYearInt);

        // Check if prior year was first without exemption (2025)
        const priorYearWasFirstNoExemption = EXEMPTION_BY_YEAR[year - 1] === 0 && EXEMPTION_BY_YEAR[year - 2] > 0;

        // Did they pay BIRT in their first year?
        const firstYearLiability = taxLiabilities[startYearInt];
        const hadBIRTInFirstYear = firstYearLiability && firstYearLiability.birtTotal > 0;
        const firstYearGraceApplies = isFirstYearFiling && hadBIRTInFirstYear;

        // Check if they paid BIRT during exemption period
        const paidBIRTDuringExemption = hadBIRTInFirstYear && EXEMPTION_BY_YEAR[startYearInt] > 0;

        // Grace year for exemption removal (2026) applies if prior year was first without exemption
        // and they never paid BIRT before
        const isExemptionRemovalGrace = priorYearWasFirstNoExemption && !paidBIRTDuringExemption;

        // Final grace year determination
        const isGraceYear = firstYearGraceApplies ? false : isExemptionRemovalGrace;

        // Estimated BIRT payment = PRIOR year BIRT * 100%
        const estBIRT = firstYearGraceApplies ? 0 : (isGraceYear ? 0 : priorYear.birtTotal);

        // Estimated NPT payment = PRIOR year NPT after credit * 50%
        const estNPT = priorYear.nptAfterCredit * NPT_ESTIMATED_RATE;

        // Adjustment = credit back for estimated payments made in prior filing
        const priorPriorYear = taxLiabilities[year - 2];
        let adjustment = 0;
        if (priorPriorYear && priorPriorYear.businessExisted) {
            const wasFirstYearFiling = (year - 2 === startYearInt);
            const priorFirstYearGrace = wasFirstYearFiling && hadBIRTInFirstYear;
            const priorFilingWasFirstNoExemption = EXEMPTION_BY_YEAR[year - 2] === 0 && EXEMPTION_BY_YEAR[year - 3] > 0;
            const priorFilingExemptionGrace = priorFilingWasFirstNoExemption && !paidBIRTDuringExemption && !priorFirstYearGrace;
            const priorEstBIRT = priorFirstYearGrace ? 0 : (priorFilingExemptionGrace ? 0 : priorPriorYear.birtTotal);
            const priorEstNPT = priorPriorYear.nptAfterCredit * NPT_ESTIMATED_RATE;
            adjustment = -(priorEstBIRT + priorEstNPT);
        }

        const totalCashBurden = taxDue + estBIRT + estNPT + adjustment;

        return {
            year,
            taxDue,
            estBIRT,
            estNPT,
            adjustment,
            totalCashBurden,
            isGraceYear,
            paidInYear: year
        };
    }

    // Calculate full scenario - comprehensive calculation for main calculator
    // Returns everything needed for display: tax liabilities, cash flows, shock analysis
    function calculateFullScenario(netIncome, grossReceipts, startYear) {
        const startYearInt = parseInt(startYear);

        // Calculate tax liabilities for all years (2021 needed for 2022 cash flow)
        const taxLiabilities = {};
        for (let year = 2021; year <= 2027; year++) {
            const businessExisted = year >= startYearInt;
            taxLiabilities[year] = calculateTaxLiability(netIncome, grossReceipts, year, businessExisted);
        }

        // Calculate cash flows for all years
        const cashFlows = {};
        for (let year = 2022; year <= 2027; year++) {
            cashFlows[year] = calculateCashFlow(taxLiabilities, year, startYear);
        }

        // Shock year: 2027 if gross <= $100K, else 2026
        const shockYear = grossReceipts <= 100000 ? 2027 : 2026;

        // Baseline and comparison years
        const baseline2024Tax = taxLiabilities[2024];
        const tax2025 = taxLiabilities[2025];
        const annualTaxIncrease = tax2025.totalTax - baseline2024Tax.totalTax;

        // Shock year analysis
        const shockCash = cashFlows[shockYear] || { totalCashBurden: 0, estBIRT: 0 };
        const priorToShockCash = cashFlows[shockYear - 1] || { totalCashBurden: 0, estBIRT: 0 };

        // Two ways exemption removal harms a business:
        // 1. Cash Shock = Total Cash Outlay difference (immediate cash needed)
        // 2. Working Cash Shock = Estimated BIRT difference (money City holds as working capital)
        const cashShock = shockCash.totalCashBurden - priorToShockCash.totalCashBurden;
        const workingCashShock = (shockCash.estBIRT || 0) - (priorToShockCash.estBIRT || 0);

        // Take MAX - show whichever impact is larger (cash shock wins ties)
        const shockAmount = Math.max(cashShock, workingCashShock);
        const shockType = cashShock >= workingCashShock ? 'cash' : 'working';

        return {
            startYear: startYearInt,
            shockYear,
            taxLiabilities,
            cashFlows,
            baseline2024Tax,
            annualTaxIncrease,
            shockAmount,
            shockType,
            cashShock,
            workingCashShock,
            shockCash,
            priorToShockCash,
            grossReceipts,
            netIncome
        };
    }

    // Calculate shock year impact for a scenario (lightweight version)
    // Used by test-results page - returns just shock analysis without full data
    function calculateShockIncrease(netIncome, grossReceipts, startYear) {
        const result = calculateFullScenario(netIncome, grossReceipts, startYear);
        return {
            shockYear: result.shockYear,
            shockAmount: result.shockAmount,
            shockType: result.shockType,
            cashShock: result.cashShock,
            workingCashShock: result.workingCashShock,
            // Keep legacy field for backwards compatibility
            shockIncrease: result.shockAmount,
            shockCashBurden: result.shockCash.totalCashBurden,
            priorCashBurden: result.priorToShockCash.totalCashBurden,
            shockCash: result.shockCash,
            priorCash: result.priorToShockCash
        };
    }

    // Generate flowchart HTML for a scenario - shows both Annual Tax Increase and Shock Year calculations
    function generateFlowchartHTML(grossReceipts, netIncome, yearWith, yearWithout, startYear) {
        const withExemption = calculateTaxLiability(netIncome, grossReceipts, yearWith, true);
        const withoutExemption = calculateTaxLiability(netIncome, grossReceipts, yearWithout, true);

        const ratesWith = TAX_RATES[yearWith];
        const ratesWithout = TAX_RATES[yearWithout];
        const exemption = EXEMPTION_BY_YEAR[yearWith];

        // Format helpers
        const fmtK = (val) => val >= 1000 ? `$${Math.round(val/1000)}K` : `$${formatNumber(val)}`;
        const fmtPct = (rate) => (rate * 100).toFixed(rate < 0.01 ? 3 : 2) + '%';

        // ========== PART 1: ANNUAL TAX INCREASE ==========
        let html = `<h4>${yearWith} Tax Liability (With $${exemption/1000}K Exemption)</h4>`;

        // With exemption section
        html += `<div class="flowchart-step"><span class="label">Taxable GR:</span><span class="formula">max(0, ${fmtK(grossReceipts)} - ${fmtK(exemption)})</span><span class="value">${formatCurrency(withExemption.taxableGR)}</span></div>`;

        if (grossReceipts <= exemption) {
            html += `<div class="flowchart-step"><span class="label">Stat. Deduction:</span><span class="formula">(${fmtK(netIncome)}/${fmtK(grossReceipts)}) × ${fmtK(grossReceipts)}</span><span class="value">${formatCurrency(withExemption.statutoryDeduction)}</span></div>`;
        } else {
            html += `<div class="flowchart-step"><span class="label">Stat. Deduction:</span><span class="formula">(${fmtK(netIncome)}/${fmtK(grossReceipts)}) × ${fmtK(exemption)}</span><span class="value">${formatCurrency(withExemption.statutoryDeduction)}</span></div>`;
        }

        html += `<div class="flowchart-step"><span class="label">Taxable NI (BIRT):</span><span class="formula">max(0, ${fmtK(netIncome)} - ${formatCurrency(withExemption.statutoryDeduction)})</span><span class="value">${formatCurrency(withExemption.taxableNI_BIRT)}</span></div>`;
        html += `<div class="flowchart-step"><span class="label">Taxable NI (NPT):</span><span class="formula">${fmtK(netIncome)} (full)</span><span class="value">${formatCurrency(withExemption.taxableNI_NPT)}</span></div>`;
        html += `<div class="flowchart-divider"></div>`;

        html += `<div class="flowchart-step"><span class="label">BIRT (GR):</span><span class="formula">${formatCurrency(withExemption.taxableGR)} × ${fmtPct(ratesWith.birtGR)}</span><span class="value">${formatCurrency(withExemption.birtGR)}</span></div>`;
        html += `<div class="flowchart-step"><span class="label">BIRT (NI):</span><span class="formula">${formatCurrency(withExemption.taxableNI_BIRT)} × ${fmtPct(ratesWith.birtNI)}</span><span class="value">${formatCurrency(withExemption.birtNI)}</span></div>`;
        html += `<div class="flowchart-step"><span class="label">Total BIRT:</span><span class="formula">${formatCurrency(withExemption.birtGR)} + ${formatCurrency(withExemption.birtNI)}</span><span class="value">${formatCurrency(withExemption.birtTotal)}</span></div>`;
        html += `<div class="flowchart-divider"></div>`;

        html += `<div class="flowchart-step"><span class="label">NPT (before credit):</span><span class="formula">${fmtK(netIncome)} × ${fmtPct(ratesWith.npt)}</span><span class="value">${formatCurrency(withExemption.nptGross)}</span></div>`;
        html += `<div class="flowchart-step"><span class="label">BIRT Credit (60%):</span><span class="formula">${formatCurrency(withExemption.birtNI)} × 60%</span><span class="value">${formatCurrency(withExemption.birtCredit)}</span></div>`;
        html += `<div class="flowchart-step"><span class="label">NPT (after credit):</span><span class="formula">max(0, ${formatCurrency(withExemption.nptGross)} - ${formatCurrency(withExemption.birtCredit)})</span><span class="value">${formatCurrency(withExemption.nptAfterCredit)}</span></div>`;
        html += `<div class="flowchart-divider"></div>`;
        html += `<div class="flowchart-step flowchart-result"><span class="label">Total Tax ${yearWith}:</span><span class="formula">${formatCurrency(withExemption.birtTotal)} + ${formatCurrency(withExemption.nptAfterCredit)}</span><span class="value">${formatCurrency(withExemption.totalTax)}</span></div>`;

        // Without exemption section
        html += `<h4 style="margin-top: 16px;">${yearWithout} Tax Liability (Without Exemption)</h4>`;

        html += `<div class="flowchart-step"><span class="label">Taxable GR:</span><span class="formula">max(0, ${fmtK(grossReceipts)} - $0)</span><span class="value">${formatCurrency(withoutExemption.taxableGR)}</span></div>`;
        html += `<div class="flowchart-step"><span class="label">Stat. Deduction:</span><span class="formula">No exemption</span><span class="value">$0</span></div>`;
        html += `<div class="flowchart-step"><span class="label">Taxable NI (BIRT):</span><span class="formula">max(0, ${fmtK(netIncome)} - $0)</span><span class="value">${formatCurrency(withoutExemption.taxableNI_BIRT)}</span></div>`;
        html += `<div class="flowchart-step"><span class="label">Taxable NI (NPT):</span><span class="formula">${fmtK(netIncome)} (full)</span><span class="value">${formatCurrency(withoutExemption.taxableNI_NPT)}</span></div>`;
        html += `<div class="flowchart-divider"></div>`;

        html += `<div class="flowchart-step"><span class="label">BIRT (GR):</span><span class="formula">${fmtK(grossReceipts)} × ${fmtPct(ratesWithout.birtGR)}</span><span class="value">${formatCurrency(withoutExemption.birtGR)}</span></div>`;
        html += `<div class="flowchart-step"><span class="label">BIRT (NI):</span><span class="formula">${fmtK(netIncome)} × ${fmtPct(ratesWithout.birtNI)}</span><span class="value">${formatCurrency(withoutExemption.birtNI)}</span></div>`;
        html += `<div class="flowchart-step"><span class="label">Total BIRT:</span><span class="formula">${formatCurrency(withoutExemption.birtGR)} + ${formatCurrency(withoutExemption.birtNI)}</span><span class="value">${formatCurrency(withoutExemption.birtTotal)}</span></div>`;
        html += `<div class="flowchart-divider"></div>`;

        html += `<div class="flowchart-step"><span class="label">NPT (before credit):</span><span class="formula">${fmtK(netIncome)} × ${fmtPct(ratesWithout.npt)}</span><span class="value">${formatCurrency(withoutExemption.nptGross)}</span></div>`;
        html += `<div class="flowchart-step"><span class="label">BIRT Credit (60%):</span><span class="formula">${formatCurrency(withoutExemption.birtNI)} × 60%</span><span class="value">${formatCurrency(withoutExemption.birtCredit)}</span></div>`;
        html += `<div class="flowchart-step"><span class="label">NPT (after credit):</span><span class="formula">max(0, ${formatCurrency(withoutExemption.nptGross)} - ${formatCurrency(withoutExemption.birtCredit)})</span><span class="value">${formatCurrency(withoutExemption.nptAfterCredit)}</span></div>`;
        html += `<div class="flowchart-divider"></div>`;
        html += `<div class="flowchart-step flowchart-result"><span class="label">Total Tax ${yearWithout}:</span><span class="formula">${formatCurrency(withoutExemption.birtTotal)} + ${formatCurrency(withoutExemption.nptAfterCredit)}</span><span class="value">${formatCurrency(withoutExemption.totalTax)}</span></div>`;

        // Annual tax increase summary
        const taxIncrease = withoutExemption.totalTax - withExemption.totalTax;
        html += `<div class="flowchart-step" style="background: #fef3c7; padding: 12px; margin: 12px -8px; border-radius: 6px;"><span class="label" style="font-weight: 700; color: #92400e;">↑ Annual Tax Increase:</span><span class="formula">${formatCurrency(withoutExemption.totalTax)} - ${formatCurrency(withExemption.totalTax)}</span><span class="value" style="color: #dc2626; font-size: 1.1rem;">${formatCurrency(taxIncrease)}</span></div>`;

        // ========== PART 2: SHOCK YEAR CALCULATION ==========
        if (startYear !== undefined) {
            const startYearInt = parseInt(startYear);

            // Build tax liabilities for all years
            const taxLiabilities = {};
            for (let year = 2020; year <= 2027; year++) {
                const businessExisted = year >= startYearInt;
                taxLiabilities[year] = calculateTaxLiability(netIncome, grossReceipts, year, businessExisted);
            }

            // Build cash flows
            const cashFlows = {};
            for (let year = 2021; year <= 2027; year++) {
                cashFlows[year] = calculateCashFlow(taxLiabilities, year, startYear);
            }

            // Determine shock year
            const shockYear = grossReceipts <= 100000 ? 2027 : 2026;
            const priorYear = shockYear - 1;

            const shockCash = cashFlows[shockYear];
            const priorCash = cashFlows[priorYear];

            html += `<h4 style="color: #0f172a; border-bottom: 2px solid #dc2626; padding-bottom: 8px; margin: 24px 0 12px 0;">💥 Shock Year Cash Flow Calculation</h4>`;
            html += `<p class="flowchart-note" style="margin-bottom: 12px;">Cash burden = what you actually pay in April. Includes tax due + estimated payments - adjustments.</p>`;

            // Prior year cash flow
            html += `<h4>April ${priorYear} Cash Burden</h4>`;
            html += `<div class="flowchart-step"><span class="label">Tax Due (from ${priorYear - 1}):</span><span class="formula">Tax liability ${priorYear - 1}</span><span class="value">${formatCurrency(priorCash.taxDue)}</span></div>`;
            html += `<div class="flowchart-step"><span class="label">+ Est. BIRT:</span><span class="formula">100% of ${priorYear - 1} BIRT${priorCash.isGraceYear ? ' (grace year = $0)' : ''}</span><span class="value">${formatCurrency(priorCash.estBIRT)}</span></div>`;
            html += `<div class="flowchart-step"><span class="label">+ Est. NPT:</span><span class="formula">50% of ${priorYear - 1} NPT</span><span class="value">${formatCurrency(priorCash.estNPT)}</span></div>`;
            html += `<div class="flowchart-step"><span class="label">- Adjustment:</span><span class="formula">Prior estimates paid</span><span class="value">${formatCurrency(priorCash.adjustment)}</span></div>`;
            html += `<div class="flowchart-divider"></div>`;
            html += `<div class="flowchart-step"><span class="label" style="font-weight: 600;">Total Cash ${priorYear}:</span><span class="formula">${formatCurrency(priorCash.taxDue)} + ${formatCurrency(priorCash.estBIRT)} + ${formatCurrency(priorCash.estNPT)} + ${formatCurrency(priorCash.adjustment)}</span><span class="value" style="font-weight: 700;">${formatCurrency(priorCash.totalCashBurden)}</span></div>`;

            // Shock year cash flow
            html += `<h4 style="margin-top: 16px;">April ${shockYear} Cash Burden (Shock Year)</h4>`;
            html += `<div class="flowchart-step"><span class="label">Tax Due (from ${shockYear - 1}):</span><span class="formula">Tax liability ${shockYear - 1}</span><span class="value">${formatCurrency(shockCash.taxDue)}</span></div>`;
            html += `<div class="flowchart-step"><span class="label">+ Est. BIRT:</span><span class="formula">100% of ${shockYear - 1} BIRT${shockCash.isGraceYear ? ' (grace year = $0)' : ''}</span><span class="value">${formatCurrency(shockCash.estBIRT)}</span></div>`;
            html += `<div class="flowchart-step"><span class="label">+ Est. NPT:</span><span class="formula">50% of ${shockYear - 1} NPT</span><span class="value">${formatCurrency(shockCash.estNPT)}</span></div>`;
            html += `<div class="flowchart-step"><span class="label">- Adjustment:</span><span class="formula">Prior estimates paid</span><span class="value">${formatCurrency(shockCash.adjustment)}</span></div>`;
            html += `<div class="flowchart-divider"></div>`;
            html += `<div class="flowchart-step"><span class="label" style="font-weight: 600;">Total Cash ${shockYear}:</span><span class="formula">${formatCurrency(shockCash.taxDue)} + ${formatCurrency(shockCash.estBIRT)} + ${formatCurrency(shockCash.estNPT)} + ${formatCurrency(shockCash.adjustment)}</span><span class="value" style="font-weight: 700;">${formatCurrency(shockCash.totalCashBurden)}</span></div>`;

            // Shock year increase summary - show both types and indicate winner
            const cashShock = shockCash.totalCashBurden - priorCash.totalCashBurden;
            const workingCashShock = (shockCash.estBIRT || 0) - (priorCash.estBIRT || 0);
            const shockAmount = Math.max(cashShock, workingCashShock);
            const shockType = cashShock >= workingCashShock ? 'cash' : 'working';

            html += `<div class="flowchart-step" style="margin-top: 12px;"><span class="label">Cash Shock:</span><span class="formula">${formatCurrency(shockCash.totalCashBurden)} - ${formatCurrency(priorCash.totalCashBurden)}</span><span class="value">${formatCurrency(cashShock)}${shockType === 'cash' ? ' ✓' : ''}</span></div>`;
            html += `<div class="flowchart-step"><span class="label">Working Cash Shock:</span><span class="formula">${formatCurrency(shockCash.estBIRT || 0)} - ${formatCurrency(priorCash.estBIRT || 0)}</span><span class="value">${formatCurrency(workingCashShock)}${shockType === 'working' ? ' ✓' : ''}</span></div>`;
            html += `<div class="flowchart-step flowchart-result" style="background: #fef2f2; margin-top: 8px;"><span class="label" style="font-weight: 700;">↑ Shock Year Impact (MAX):</span><span class="formula">${shockType === 'cash' ? 'Cash Shock' : 'Working Cash Shock'}</span><span class="value" style="font-size: 1.1rem;">${formatCurrency(shockAmount)}</span></div>`;
        }

        return html;
    }

    // Export for use in other files
    window.TaxCalculator = {
        TAX_RATES,
        EXEMPTION_BY_YEAR,
        BIRT_CREDIT_RATE,
        NPT_ESTIMATED_RATE,
        formatCurrency,
        formatNumber,
        parseCurrency,
        calculateTaxableAmounts,
        calculateTaxLiability,
        calculateCashFlow,
        calculateFullScenario,
        calculateShockIncrease,
        generateFlowchartHTML
    };
})();
