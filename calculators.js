import {
    parseConcentration,
    parseToBase,
    formatNumber,
    getEl,
    volumeToBase,
    massToBase,
    molarToBase,
    massPerVolToBase,
    parseScientific,
    formatDoseNumber,
    formatConcentration
} from './utils.js';

import { showResult, showError } from './ui.js';

/**********************************************
 * CALCULATOR LOGIC                 *
 **********************************************/

export function calculateDilution() {
    const resultEl = getEl('dil_result');
    const errorEl = getEl('dil_error');
    resultEl.classList.add('hidden');
    errorEl.textContent = '';

    const stockConc = parseConcentration(getEl('dil_stock_val').value, getEl('dil_stock_unit').value);
    const finalConc = parseConcentration(getEl('dil_final_val').value, getEl('dil_final_unit').value);
    const finalVol = parseToBase(getEl('dil_final_vol').value, getEl('dil_vol_unit').value, volumeToBase, 'volume');

    if (stockConc.error) { showError(errorEl, stockConc.error); return; }
    if (finalConc.error) { showError(errorEl, finalConc.error); return; }
    if (finalVol.error) { showError(errorEl, finalVol.error); return; }

    if (stockConc.type !== finalConc.type) {
        showError(errorEl, 'Stock and final concentration must be of the same type (e.g., both molar, both mass/vol, or both activity).');
        return;
    }
    if (stockConc.value < finalConc.value) {
        showError(errorEl, 'Stock concentration cannot be less than the final concentration.');
        return;
    }
    if(stockConc.value === 0) {
        showError(errorEl, 'Stock concentration cannot be zero.');
        return;
    }

    const stockVolNeeded = (finalConc.value * finalVol) / stockConc.value;
    const diluentVol = finalVol - stockVolNeeded;

    showResult(resultEl, `
        <p class="font-semibold">To prepare ${getEl('dil_final_vol').value} ${getEl('dil_vol_unit').value} of solution:</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li>Take <strong>${formatNumber(stockVolNeeded * 1e3)} mL</strong> (or ${formatNumber(stockVolNeeded * 1e6)} µL) of your stock solution.</li>
            <li>Add <strong>${formatNumber(diluentVol * 1e3)} mL</strong> (or ${formatNumber(diluentVol * 1e6)} µL) of diluent.</li>
        </ul>
    `);
}

export function calculateMolarityCalc() {
    const resultEl = getEl('mol_calc_result');
    const errorEl = getEl('mol_calc_error');
    resultEl.classList.add('hidden');
    errorEl.textContent = '';
    const solveFor = getEl('mol_calc_solve_for').value;

    const mw = parseScientific(getEl('mol_calc_mw').value);
    if (mw.error || mw <= 0) {
        showError(errorEl, 'Molecular Weight (MW) must be a positive number.');
        return;
    }

    const mass = parseToBase(getEl('mol_calc_mass_val').value, getEl('mol_calc_mass_unit').value, massToBase, 'mass');
    const vol = parseToBase(getEl('mol_calc_volume_val').value, getEl('mol_calc_volume_unit').value, volumeToBase, 'volume');
    const molarity = parseToBase(getEl('mol_calc_molar_val').value, getEl('mol_calc_molar_unit').value, molarToBase, 'molarity');

    let resultHtml = '';
    try {
        
        // Compose a unit conversion explanation when types differ
        (function(){
            try {
                const srcVal0 = getEl('sdpro_source_val').value;
                const srcUnit0 = getEl('sdpro_source_unit').value;
                const srcC0 = parseConcentration(parseFloat(srcVal0), srcUnit0);
                // peek a target unit
                let tgtUnit0 = null;
                if (getEl('sdpro_target_unit') && !getEl('sdpro_panel_single').classList.contains('hidden')) tgtUnit0 = getEl('sdpro_target_unit').value;
                if (!tgtUnit0 && getEl('sdpro_intermediate_unit') && !getEl('sdpro_panel_intermediate').classList.contains('hidden')) tgtUnit0 = getEl('sdpro_intermediate_unit').value;
                if (!tgtUnit0 && getEl('sdpro_series_unit') && !getEl('sdpro_panel_series_list').classList.contains('hidden')) tgtUnit0 = getEl('sdpro_series_unit').value;
                if (!tgtUnit0) tgtUnit0 = srcUnit0;
                const tgtC0 = parseConcentration(1, tgtUnit0);
                const mw0 = getEl('sdpro_mw').value ? parseFloat(getEl('sdpro_mw').value) : null;
                if (srcC0 && tgtC0 && srcC0.type !== tgtC0.type) {
                    if (!mw0) {
                        unitExplanation = 'Note: converting between mass/volume and molar units requires Molecular Weight.';
                    } else {
                        unitExplanation = srcC0.type === 'mass/vol'
                            ? `M = (g/L) / MW; MW = ${mw0} g/mol used.`
                            : `g/L = M × MW; MW = ${mw0} g/mol used.`;
                    }
                }
            } catch(e) {}
        })();
if (solveFor === 'mass') {
            if (vol.error) throw new Error(vol.error);
            if (molarity.error) throw new Error(molarity.error);
            const massG = molarity * vol * mw;
            resultHtml = `<p>Required Mass: <strong>${formatNumber(massG * 1000)} mg</strong> (or ${formatNumber(massG)} g)</p>`;
        } else if (solveFor === 'volume') {
            if (mass.error) throw new Error(mass.error);
            if (molarity.error) throw new Error(molarity.error);
            const volL = mass / (molarity * mw);
            resultHtml = `<p>Required Volume: <strong>${formatNumber(volL * 1000)} mL</strong> (or ${formatNumber(volL * 1e6)} µL)</p>`;
        } else if (solveFor === 'molarity') {
            if (mass.error) throw new Error(mass.error);
            if (vol.error) throw new Error(vol.error);
            const molarityM = mass / (vol * mw);
            resultHtml = `<p>Resulting Molarity: <strong>${formatNumber(molarityM * 1000)} mM</strong> (or ${formatNumber(molarityM)} M)</p>`;
        }
        showResult(resultEl, resultHtml);
    } catch (e) {
        showError(errorEl, e.message);
    }
}

export function calculateReconstitution() {
    const resultEl = getEl('recon_result');
    const errorEl = getEl('recon_error');
    resultEl.classList.add('hidden');
    errorEl.textContent = '';

    const mass = parseToBase(getEl('recon_mass_val').value, getEl('recon_mass_unit').value, massToBase, 'mass');
    const desiredConc = parseConcentration(getEl('recon_conc_val').value, getEl('recon_conc_unit').value);

    if (mass.error) { showError(errorEl, mass.error); return; }
    if (desiredConc.error) { showError(errorEl, desiredConc.error); return; }

    let volL = 0;

    if (desiredConc.type === 'molar') {
        const mw = parseScientific(getEl('recon_mw').value);
        if (mw.error || mw <= 0) {
            showError(errorEl, 'Molecular Weight (MW) is required for molar calculations.');
            return;
        }
        const moles = mass / mw;
        volL = moles / desiredConc.value;
    } else { // mass/vol or activity
        volL = mass / desiredConc.value;
    }

    if (volL <= 0 || !isFinite(volL)) {
        showError(errorEl, 'Calculation resulted in an invalid volume. Please check inputs.');
        return;
    }
    showResult(resultEl, `
        <p class="font-semibold">Add solvent to reconstitute:</p>
        <p><strong>${formatNumber(volL * 1e3)} mL</strong> (or ${formatNumber(volL * 1e6)} µL or ${formatNumber(volL)} L)</p>
    `);
}

export function calculateMVC() {
    const resultEl = getEl('mvc_result');
    const errorEl = getEl('mvc_error');
    resultEl.classList.add('hidden');
    errorEl.textContent = '';
    const solveFor = getEl('mvc_solve_for').value;

    const mass = parseToBase(getEl('mvc_mass').value, getEl('mvc_mass_unit').value, massToBase, 'mass');
    const vol = parseToBase(getEl('mvc_volume').value, getEl('mvc_vol_unit').value, volumeToBase, 'volume');
    const conc = parseToBase(getEl('mvc_conc').value, getEl('mvc_conc_unit').value, massPerVolToBase, 'concentration');

    let resultHtml = '';
    try {
        if (solveFor === 'mass') {
            if (vol.error) throw new Error(vol.error);
            if (conc.error) throw new Error(conc.error);
            const massG = conc * vol;
            resultHtml = `<p>Resulting Mass: <strong>${formatNumber(massG * 1000)} mg</strong> (or ${formatNumber(massG)} g)</p>`;
        } else if (solveFor === 'volume') {
            if (mass.error) throw new Error(mass.error);
            if (conc.error) throw new Error(conc.error);
            const volL = mass / conc;
            resultHtml = `<p>Resulting Volume: <strong>${formatNumber(volL * 1000)} mL</strong> (or ${formatNumber(volL * 1e6)} µL)</p>`;
        } else if (solveFor === 'concentration') {
            if (mass.error) throw new Error(mass.error);
            if (vol.error) throw new Error(vol.error);
            const concGL = mass / vol;
            resultHtml = `<p>Resulting Concentration: <strong>${formatNumber(concGL)} g/L</strong> (or ${formatNumber(concGL)} mg/mL)</p>`;
        }
        showResult(resultEl, resultHtml);
    } catch (e) {
        showError(errorEl, e.message);
    }
}

export function calculateCellSeeding() {
    const resultEl = getEl('cs_result');
    const errorEl = getEl('cs_error');
    resultEl.classList.add('hidden');
    errorEl.textContent = '';

    const stockConc = parseScientific(getEl('cs_stock_conc').value);
    const finalConc = parseScientific(getEl('cs_final_conc').value);
    const finalVol = parseScientific(getEl('cs_final_vol').value);

    if (stockConc.error) { showError(errorEl, stockConc.error); return; }
    if (finalConc.error) { showError(errorEl, finalConc.error); return; }
    if (finalVol.error) { showError(errorEl, finalVol.error); return; }

    if (stockConc <= 0 || finalConc < 0 || finalVol <= 0) {
        showError(errorEl, 'Concentrations and volumes must be positive numbers.');
        return;
    }
    if (stockConc < finalConc) {
        showError(errorEl, 'Stock concentration cannot be less than final concentration.');
        return;
    }

    // C1V1 = C2V2  => V1 = (C2 * V2) / C1
    const stockVolNeeded = (finalConc * finalVol) / stockConc; // in mL
    const mediaVolNeeded = finalVol - stockVolNeeded; // in mL

    showResult(resultEl, `
        <p class="font-semibold">To prepare ${formatNumber(finalVol)} mL of cell suspension:</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li>Take <strong>${formatNumber(stockVolNeeded)} mL</strong> (or ${formatNumber(stockVolNeeded * 1000)} µL) of your cell stock.</li>
            <li>Add <strong>${formatNumber(mediaVolNeeded)} mL</strong> of fresh media.</li>
        </ul>
        <p class="mt-2 text-sm text-slate-600">This will yield a total of ${formatNumber(finalConc * finalVol)} cells.</p>
    `);
}

export function calculateSerialDose() {
    const resultEl = getEl('sd_result');
    const errorEl = getEl('sd_error');
    resultEl.classList.add('hidden', 'hidden');
    errorEl.textContent = '';

    // --- 1. Parse all inputs ---
    const originalValues = {
        massVal: getEl('sd_final_mass_val').value,
        massUnit: getEl('sd_final_mass_unit').value,
        volVal: getEl('sd_final_vol_val').value,
        volUnit: getEl('sd_final_vol_unit').value,
    };

    const stockConcMap = { 'mg/mL': 1, 'µg/mL': 1e-3, 'g/L': 1, 'ng/mL': 1e-6, 'µg/µL': 1 };
    const cStock = parseToBase(getEl('sd_stock_val').value, getEl('sd_stock_unit').value, stockConcMap, 'concentration');
    const finalMass_mg = parseToBase(originalValues.massVal, originalValues.massUnit, massToBase, 'mass') * 1000;
    const finalVol_uL = parseToBase(originalValues.volVal, originalValues.volUnit, { 'mL': 1000, 'µL': 1 }, 'volume');
    const minPipetteVol_uL = parseScientific(getEl('sd_min_pipette_vol').value);
    const interVol_uL = parseScientific(getEl('sd_inter_vol').value);

    // --- 2. Validate inputs ---
    if (cStock.error || cStock <= 0) { showError(errorEl, 'Invalid Stock Concentration.'); return; }
    if (finalMass_mg.error) { showError(errorEl, finalMass_mg.error); return; }
    if (finalVol_uL.error) { showError(errorEl, finalVol_uL.error); return; }
    if (minPipetteVol_uL.error || minPipetteVol_uL <= 0) { showError(errorEl, 'Min. Pipetting Volume must be > 0.'); return; }
    if (interVol_uL.error || interVol_uL <= minPipetteVol_uL) { showError(errorEl, 'Intermediate Volume must be > Min. Pipetting Volume.'); return; }

    const cTarget = finalMass_mg / (finalVol_uL / 1000); // Target concentration in mg/mL

    if (cStock < cTarget) {
        showError(errorEl, 'Stock Concentration cannot be less than the required Final Concentration.');
        return;
    }

    // --- 3. Strategy 1: Direct Dilution ---
    const volFromStock_uL = (cTarget / cStock) * finalVol_uL;
    if (volFromStock_uL >= minPipetteVol_uL) {
        const diluentVol_uL = finalVol_uL - volFromStock_uL;
        let resultHtml = `<p class="font-semibold text-green-800">A direct dilution is the most efficient method.</p>
                          <p class="mt-2">To prepare your dose:</p>
                          <ul class="list-disc list-inside mt-2 space-y-1">
                            <li>Take <strong>${formatDoseNumber(volFromStock_uL)} µL</strong> of your original stock (${formatConcentration(cStock)}).</li>`;
        if (diluentVol_uL > 1e-9) { // Avoid showing if it's effectively zero
            resultHtml += `<li>Add <strong>${formatDoseNumber(diluentVol_uL)} µL</strong> of diluent.</li>`;
        }
        resultHtml += `<li class="text-sm text-slate-600">This gives you a final volume of ${originalValues.volVal} ${originalValues.volUnit} containing exactly <strong>${originalValues.massVal} ${originalValues.massUnit}</strong> of the drug.</li></ul>`;
        showResult(resultEl, resultHtml);
        return;
    }

    // --- 4. Strategy 2: Serial Dilution ---
    let protocolHtml = `<p class="font-semibold">A direct dilution is not practical. The following serial dilution is recommended:</p>`;
    let currentStockConc = cStock;
    let stepCounter = 1;
    const maxDilutionFactor = interVol_uL / minPipetteVol_uL;

    while (stepCounter <= 10) { // Safety break
        // Concentration of the intermediate stock we need to make
        const cIntermediateNeeded = (cTarget * finalVol_uL) / minPipetteVol_uL;

        if (currentStockConc <= cIntermediateNeeded) {
            // We can now make the final dilution from the current stock
            const v1_final_uL = (cTarget * finalVol_uL) / currentStockConc;
            const diluent_final_uL = finalVol_uL - v1_final_uL;

            protocolHtml += `<div class="mt-4"><p class="font-medium">Step ${stepCounter}: Prepare the Final Dose</p><ul class="list-disc list-inside mt-2 space-y-1">
                <li>Take <strong>${formatDoseNumber(v1_final_uL)} µL</strong> of the last intermediate stock (${formatConcentration(currentStockConc)}).</li>`;
            if (diluent_final_uL > 1e-9) {
                protocolHtml += `<li>Add <strong>${formatDoseNumber(diluent_final_uL)} µL</strong> of diluent.</li>`;
            }
            protocolHtml += `<li class="text-sm text-slate-600">This gives you a final volume of ${originalValues.volVal} ${originalValues.volUnit} containing exactly <strong>${originalValues.massVal} ${originalValues.massUnit}</strong> of the drug.</li></ul></div>`;
            showResult(resultEl, protocolHtml);
            return;
        }

        // We need another intermediate dilution step
        let dilutionFactor = Math.min(maxDilutionFactor, Math.ceil(currentStockConc / cIntermediateNeeded));
        // Prefer round dilution factors if they are close enough (e.g. 9.8 -> 10)
        if (Math.abs(dilutionFactor - 10) < 0.5) dilutionFactor = 10;
        if (Math.abs(dilutionFactor - 100) < 5) dilutionFactor = 100;

        const volToTake = interVol_uL / dilutionFactor;
        const diluentForStep = interVol_uL - volToTake;
        const nextStockConc = currentStockConc / dilutionFactor;

        protocolHtml += `<div class="mt-4"><p class="font-medium">Step ${stepCounter}: Prepare Intermediate Stock #${stepCounter} (${formatConcentration(nextStockConc)})</p>
            <ul class="list-disc list-inside mt-2 space-y-1">
                <li>Take <strong>${formatDoseNumber(volToTake)} µL</strong> of your previous stock (${formatConcentration(currentStockConc)}).</li>
                <li>Add <strong>${formatDoseNumber(diluentForStep)} µL</strong> of diluent (to make ${interVol_uL} µL total).</li>
            </ul></div>`;

        currentStockConc = nextStockConc;
        stepCounter++;
    }

    showError(errorEl, 'Cannot find a practical dilution protocol within 10 steps. Your stock may be too concentrated or your constraints too strict.');
}

const PLATE_PRESETS = {
    '6-well':   { surface_area_cm2: 9.6, media_vol_ml: 2 },
    '12-well':  { surface_area_cm2: 3.8, media_vol_ml: 1 },
    '24-well':  { surface_area_cm2: 1.9, media_vol_ml: 0.5 },
    '48-well':  { surface_area_cm2: 0.95, media_vol_ml: 0.25 },
    '96-well':  { surface_area_cm2: 0.32, media_vol_ml: 0.1 },
    '384-well': { surface_area_cm2: 0.08, media_vol_ml: 0.025 }
};

export function calculatePlateSeeding() {
    const resultEl = getEl('ps_result');
    const errorEl = getEl('ps_error');
    resultEl.classList.add('hidden');
    errorEl.textContent = '';

    // 1. Parse all inputs
    const plateType = getEl('ps_plate_type').value;
    const wellsToSeed = parseScientific(getEl('ps_wells_to_seed').value);
    const seedingDensity = parseScientific(getEl('ps_seeding_density').value);
    const stockConc = parseScientific(getEl('ps_stock_conc').value);

    // 2. Validate inputs
    if (wellsToSeed.error || wellsToSeed <= 0) { showError(errorEl, 'Please enter a valid number of wells.'); return; }
    if (seedingDensity.error || seedingDensity <= 0) { showError(errorEl, 'Please enter a valid seeding density.'); return; }
    if (stockConc.error || stockConc <= 0) { showError(errorEl, 'Please enter a valid stock concentration.'); return; }

    let surfaceArea, mediaVolPerWell;
    if (plateType === 'custom') {
        surfaceArea = parseScientific(getEl('ps_custom_surface_area').value);
        mediaVolPerWell = parseScientific(getEl('ps_custom_media_vol').value) / 1000; // convert µL to mL
        if (surfaceArea.error || surfaceArea <= 0) { showError(errorEl, 'Please enter a valid custom surface area.'); return; }
        if (mediaVolPerWell.error || mediaVolPerWell <= 0) { showError(errorEl, 'Please enter a valid custom media volume.'); return; }
    } else {
        surfaceArea = PLATE_PRESETS[plateType].surface_area_cm2;
        mediaVolPerWell = PLATE_PRESETS[plateType].media_vol_ml;
    }

    // 3. Calculate master mix
    // Add 10% extra volume to account for pipetting errors, a common lab practice
    const numWellsWithOverhead = Math.ceil(wellsToSeed * 1.1);

    const totalCellsNeeded = seedingDensity * surfaceArea * wellsToSeed;
    const totalVolumeNeeded = mediaVolPerWell * wellsToSeed;

    const finalCellConc = totalCellsNeeded / totalVolumeNeeded;

    if (stockConc < finalCellConc) {
        showError(errorEl, `Stock concentration (${formatNumber(stockConc)} cells/mL) is too low for the desired final concentration (${formatNumber(finalCellConc)} cells/mL).`);
        return;
    }

    // Calculate for the overhead volume
    const masterMixTotalVol = mediaVolPerWell * numWellsWithOverhead;
    const masterMixTotalCells = finalCellConc * masterMixTotalVol;

    const stockVolForMasterMix = masterMixTotalCells / stockConc;
    const mediaVolForMasterMix = masterMixTotalVol - stockVolForMasterMix;

    // 4. Display results
    showResult(resultEl, `
        <p class="font-semibold">To seed ${wellsToSeed} well(s) at ${formatNumber(seedingDensity)} cells/cm²:</p>
        <div class="mt-4">
            <p class="font-medium">Step 1: Prepare Master Mix</p>
            <p class="text-sm text-slate-600">(Includes a 10% overhead for ${numWellsWithOverhead - wellsToSeed} extra well(s))</p>
            <ul class="list-disc list-inside mt-2 space-y-1">
                <li>Take <strong>${formatNumber(stockVolForMasterMix * 1000)} µL</strong> (or ${formatNumber(stockVolForMasterMix)} mL) of your cell stock.</li>
                <li>Add <strong>${formatNumber(mediaVolForMasterMix)} mL</strong> of fresh media.</li>
                <li class="text-sm text-slate-600">This creates a total of <strong>${formatNumber(masterMixTotalVol)} mL</strong> of cell suspension.</li>
            </ul>
        </div>
        <div class="mt-4">
            <p class="font-medium">Step 2: Plate the Cells</p>
            <ul class="list-disc list-inside mt-2 space-y-1">
                <li>Gently mix the suspension and add <strong>${formatNumber(mediaVolPerWell * 1000)} µL</strong> to each of the <strong>${wellsToSeed}</strong> wells.</li>
            </ul>
        </div>
        <div class="mt-3 text-xs text-slate-500">
            <p>Total cells required: ${formatNumber(totalCellsNeeded)}</p>
            <p>Final concentration in wells: ${formatNumber(finalCellConc)} cells/mL</p>
        </div>
    `);
}


export function calculateSeedingUnified() {
    const modeEl = getEl('seed_mode');
    const mode = modeEl ? modeEl.value : 'simple';

    // Ensure result/error areas are present
    const unifiedResult = getEl('seed_result');
    const unifiedError = getEl('seed_error');
    if (!unifiedResult || !unifiedError) return;

    // Clear previous messages
    unifiedResult.classList.add('hidden');
    unifiedError.textContent = '';

    if (mode === 'simple') {
        // Run the simple C1V1 cell seeding logic but render into unified containers
        // Temporarily monkey-patch showResult/showError to route output
        const _showResult = showResult;
        const _showError = showError;
        try {
            // override
            const showResultProxy = (el, html) => _showResult(unifiedResult, html);
            const showErrorProxy = (el, msg) => _showError(unifiedError, msg);
            // Call original implementation inline (duplicated logic) to avoid changing global showResult
            // Fetch inputs
            const stockConc = parseScientific(getEl('cs_stock_conc').value);
            const finalConc = parseScientific(getEl('cs_final_conc').value);
            const finalVol = parseScientific(getEl('cs_final_vol').value);

            if (stockConc && stockConc.error) { showErrorProxy(null, stockConc.error); return; }
            if (finalConc && finalConc.error) { showErrorProxy(null, finalConc.error); return; }
            if (finalVol && finalVol.error) { showErrorProxy(null, finalVol.error); return; }

            if (stockConc <= 0 || finalConc < 0 || finalVol <= 0) {
                showErrorProxy(null, 'Concentrations and volumes must be positive numbers.');
                return;
            }
            if (finalConc > stockConc) {
                showErrorProxy(null, 'Desired final concentration cannot exceed stock concentration.');
                return;
            }

            // C1V1 = C2V2
            const stockVolNeeded = (finalConc * finalVol) / stockConc; // mL
            const mediaVolNeeded = finalVol - stockVolNeeded; // mL
            const totalCells = finalConc * finalVol;

            showResultProxy(null, `
                <p class="font-semibold">To prepare ${formatNumber(finalVol)} mL of cell suspension:</p>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>Take <strong>${formatNumber(stockVolNeeded)} mL</strong> (${formatNumber(stockVolNeeded * 1000)} µL) of your cell stock.</li>
                    <li>Add <strong>${formatNumber(mediaVolNeeded)} mL</strong> of fresh media.</li>
                </ul>
                <p class="mt-2 text-sm text-slate-600">This yields ${formatNumber(totalCells)} cells total.</p>
            `);
        } catch (e) {
            showError(unifiedError, e.message || String(e));
        }
    } else {
        // Plate master mix calculation; reuse existing fields and logic
        try {
            const plateType = getEl('ps_plate_type').value;
            const wellsToSeed = parseScientific(getEl('ps_wells_to_seed').value);
            const seedingDensity = parseScientific(getEl('ps_seeding_density').value);
            const stockConc = parseScientific(getEl('ps_stock_conc').value);
            const wellVol = parseScientific(getEl('ps_well_volume').value);
            let wellArea = null;

            if (plateType === 'custom') {
                wellArea = parseScientific(getEl('ps_well_area').value);
                if (wellArea && wellArea.error) { showError(unifiedError, wellArea.error); return; }
            }

            // Basic validation
            const err = (x) => x && typeof x === 'object' && 'error' in x;
            if (err(wellsToSeed)) { showError(unifiedError, wellsToSeed.error); return; }
            if (err(seedingDensity)) { showError(unifiedError, seedingDensity.error); return; }
            if (err(stockConc)) { showError(unifiedError, stockConc.error); return; }
            if (err(wellVol)) { showError(unifiedError, wellVol.error); return; }

            if (wellsToSeed <= 0 || seedingDensity <= 0 || stockConc <= 0 || wellVol <= 0) {
                showError(unifiedError, 'All inputs must be positive numbers.'); return;
            }

            // Plate geometry (cm²) defaults
            const defaultAreas = {
                '6-well': 9.6, '12-well': 3.8, '24-well': 1.9,
                '48-well': 1.0, '96-well': 0.32
            };
            const area = plateType === 'custom' ? wellArea : defaultAreas[plateType];
            if (!area || area <= 0) { showError(unifiedError, 'Invalid well area.'); return; }

            // Compute total cells and required stock/media
            const cellsPerWell = seedingDensity * area; // cells
            const totalCellsNeeded = cellsPerWell * wellsToSeed;
            const finalCellConc = totalCellsNeeded / (wellVol * wellsToSeed); // cells/mL in master mix
            if (finalCellConc > stockConc) {
                showError(unifiedError, 'Stock concentration too low for requested density/volume.'); return;
            }
            // C1V1 = C2V2 for master mix
            const masterMixTotalVol = wellVol * wellsToSeed; // mL
            const stockVolNeeded = (finalCellConc * masterMixTotalVol) / stockConc; // mL
            const mediaVolNeeded = masterMixTotalVol - stockVolNeeded;

            showResult(unifiedResult, `
                <div>
                    <p class="font-medium">Step 1: Make Master Mix</p>
                    <ul class="list-disc list-inside mt-2 space-y-1">
                        <li>Add <strong>${formatNumber(stockVolNeeded)} mL</strong> (${formatNumber(stockVolNeeded * 1000)} µL) of cell stock.</li>
                        <li>Add <strong>${formatNumber(mediaVolNeeded)} mL</strong> of media to reach ${formatNumber(masterMixTotalVol)} mL total.</li>
                        <li class="text-sm text-slate-600">This creates ${formatNumber(masterMixTotalVol)} mL of cell suspension.</li>
                    </ul>
                </div>
                <div class="mt-4">
                    <p class="font-medium">Step 2: Plate the Cells</p>
                    <ul class="list-disc list-inside mt-2 space-y-1">
                        <li>Gently mix the suspension and add <strong>${formatNumber(wellVol)} mL</strong> to each of the <strong>${wellsToSeed}</strong> wells.</li>
                    </ul>
                </div>
                <div class="mt-3 text-xs text-slate-500">
                    <p>Total cells required: ${formatNumber(totalCellsNeeded)}</p>
                    <p>Final concentration in wells: ${formatNumber(finalCellConc)} cells/mL</p>
                </div>
            `);
        } catch (e) {
            showError(unifiedError, e.message || String(e));
        }
    }
}

export function calculateSerialDilutionPro() {
    const resultEl = getEl('sdpro_result');
    const errorEl = getEl('sdpro_error');
    resultEl.classList.add('hidden');
    errorEl.textContent = '';

    // Helpers
    const err = (x) => x && typeof x === 'object' && 'error' in x;
    const pf = (s) => parseFloat(String(s).trim());

    let unitExplanation = '';

    function toConcentration(valStr, unitStr) {
        const parsed = parseConcentration(pf(valStr), unitStr);
        if (parsed && parsed.error) return parsed;
        return parsed;
    }
    function convertConcType(concObj, targetType, mw) {
        if (concObj.type === targetType) return concObj;
        if (!mw || mw <= 0) return { error: 'Molecular weight is required to convert between mass/vol and molar.' };
        if (concObj.type === 'mass/vol' && targetType === 'molar') {
            // molar (M) = (g/L) / (g/mol)
            return { type: 'molar', value: concObj.value / mw };
        }
        if (concObj.type === 'molar' && targetType === 'mass/vol') {
            // g/L = M * g/mol
            return { type: 'mass/vol', value: concObj.value * mw };
        }
        return { error: 'Unsupported conversion.' };
    }
    function ensureType(concObj, otherObj, mw) {
        // Convert concObj to otherObj.type
        if (concObj.type === otherObj.type) return concObj;
        return convertConcType(concObj, otherObj.type, mw);
    }
    function niceRound(x, decimals=4) {
        return Number.parseFloat(x).toFixed(decimals);
    }
    function htmlTable(rows) {
        return `<div class="overflow-x-auto"><table class="min-w-full text-sm">
          <thead><tr class="text-left"><th class="pr-4 py-1">Step</th><th class="pr-4 py-1">Take</th><th class="pr-4 py-1">Add</th><th class="pr-4 py-1">Result</th><th class="pr-4 py-1">Conc</th></tr></thead>
          <tbody>${rows.map(r => `<tr class="border-t border-slate-200/40"><td class="pr-4 py-1">${r.step}</td><td class="pr-4 py-1">${r.take}</td><td class="pr-4 py-1">${r.add}</td><td class="pr-4 py-1">${r.result}</td><td class="pr-4 py-1">${r.conc}</td></tr>`).join('')}</tbody></table></div>`;
    }
    function withinPipetting(vol_uL, min_ul, max_ul) {
        return vol_uL >= min_ul && vol_uL <= max_ul;
    }
    function pipetteFor(vol) {
        if (vol < 0.5) return 'P2 (tip pre-wet, 2–3×)';
        if (vol <= 2) return 'P2';
        if (vol <= 10) return 'P10';
        if (vol <= 20) return 'P20';
        if (vol <= 200) return 'P200';
        if (vol <= 1000) return 'P1000';
        return 'serological pipet';
    }

    try {
        // Read inputs
        const mode = getEl('sdpro_mode').value;
        const overagePct = pf(getEl('sdpro_overage').value) || 0;
        const minUL = pf(getEl('sdpro_min_pip_ul').value) || 2;
        const maxUL = pf(getEl('sdpro_max_pip_ul').value) || 1000;
        const preferred = (getEl('sdpro_preferred_factors').value || '10,5,4,3,2').split(',').map(s=>pf(s.trim())).filter(Boolean);

        const srcVal = getEl('sdpro_source_val').value;
        const srcUnit = getEl('sdpro_source_unit').value;
        const srcConc = toConcentration(srcVal, srcUnit);
        if (err(srcConc)) { showError(errorEl, srcConc.error); return; }

        const mwParsed = getEl('sdpro_mw').value ? pf(getEl('sdpro_mw').value) : null;
        if ((mode === 'single' || mode === 'intermediate' || mode === 'series_list' || mode === 'series_factor')) {
            // We'll examine whether type conversions require MW below
        }

        // Planning engines
        function planSingle(targetVal, targetUnit, finalVol_mL) {
            const tgtConc0 = toConcentration(targetVal, targetUnit);
            if (err(tgtConc0)) return tgtConc0;
            // Ensure both conc in same type for comparisons
            const tgtConc = ensureType(tgtConc0, srcConc, mwParsed);
            if (err(tgtConc)) return tgtConc;
            const srcSame = ensureType(srcConc, tgtConc, mwParsed);
            if (err(srcSame)) return srcSame;
            if (tgtConc.value > srcSame.value) return { error: 'Target concentration exceeds source concentration.' };

            // C1 V1 = C2 V2 -> V1 = C2*V2/C1
            const V2_mL = pf(finalVol_mL);
            if (!(V2_mL>0)) return { error: 'Final volume must be > 0.' };
            const V1_mL = (tgtConc.value * V2_mL) / srcSame.value;
            const add_mL = V2_mL - V1_mL;
            // Overage
            const over_mL = V2_mL * (1 + overagePct/100);
            const over_V1_mL = (tgtConc.value * over_mL) / srcSame.value;
            const over_add_mL = over_mL - over_V1_mL;

            const rows = [{
                step: 1,
                take: `${niceRound(over_V1_mL*1000,2)} µL stock`,
                add: `${niceRound(over_add_mL*1000,2)} µL diluent`,
                result: `${niceRound(over_mL,3)} mL total`,
                conc: `${niceRound(tgtConc.value, 6)} ${tgtConc.type==='molar'?'M':'g/L'}`
            }];
            return { rows, explanation: `Using C1V1=C2V2 with overage ${overagePct}% to account for losses.` };
        }

        function pickFactorPath(overallFactor) {
            // Greedy factorization into preferred factors (e.g., 10× then 4×)
            let remaining = overallFactor;
            const path = [];
            for (const f of preferred) {
                while (remaining % f === 0 || Math.abs(Math.log10(remaining) - Math.log10(f)) < 1e-9) {
                    path.push(f);
                    remaining = remaining / f;
                    if (Math.abs(remaining-1) < 1e-9) break;
                }
            }
            if (Math.abs(remaining-1) > 1e-9) {
                // fallback: distribute remaining via closest preferred
                const f = preferred.find(x => remaining < x && x/remaining < 20) || preferred[preferred.length-1];
                path.push(f);
                remaining = remaining / f;
            }
            return path;
        }

        function planIntermediate(interVal, interUnit, interVol_mL, finalVal, finalUnit, finalVol_mL) {
            const interConc0 = toConcentration(interVal, interUnit);
            if (err(interConc0)) return interConc0;
            const tgt2Conc0 = toConcentration(finalVal, finalUnit);
            if (err(tgt2Conc0)) return tgt2Conc0;
            // Convert source to inter type
            const interConc = ensureType(interConc0, srcConc, mwParsed);
            if (err(interConc)) return interConc;
            const srcSame = ensureType(srcConc, interConc, mwParsed);
            if (err(srcSame)) return srcSame;
            if (interConc.value > srcSame.value) return { error: 'Intermediate concentration exceeds source.' };

            // Step A: Source -> Intermediate
            const V2a = pf(interVol_mL);
            if (!(V2a>0)) return { error: 'Intermediate volume must be > 0.' };
            const V1a = (interConc.value * V2a) / srcSame.value;
            const addA = V2a - V1a;
            const overA = V2a * (1 + overagePct/100);
            const overV1a = (interConc.value * overA) / srcSame.value;
            const overAddA = overA - overV1a;

            // Step B: Intermediate -> Final
            // For final, convert to same type as intermediate
            const tgt2Conc = ensureType(tgt2Conc0, interConc, mwParsed);
            if (err(tgt2Conc)) return tgt2Conc;
            if (tgt2Conc.value > interConc.value) return { error: 'Final concentration exceeds intermediate.' };
            const V2b = pf(finalVol_mL);
            if (!(V2b>0)) return { error: 'Final volume must be > 0.' };
            const V1b = (tgt2Conc.value * V2b) / interConc.value;
            const addB = V2b - V1b;
            const overB = V2b * (1 + overagePct/100);
            const overV1b = (tgt2Conc.value * overB) / interConc.value;
            const overAddB = overB - overV1b;

            const rows = [
                { step: 'A', take: `${niceRound(overV1a*1000,2)} µL stock`, add: `${niceRound(overAddA*1000,2)} µL diluent`, result: `${niceRound(overA,3)} mL`, conc: `${niceRound(interConc.value,6)} ${interConc.type==='molar'?'M':'g/L'}`},
                { step: 'B', take: `${niceRound(overV1b*1000,2)} µL intermediate (${pipetteFor(overV1b*1000)})`, add: `${niceRound(overAddB*1000,2)} µL diluent`, result: `${niceRound(overB,3)} mL`, conc: `${niceRound(tgt2Conc.value,6)} ${tgt2Conc.type==='molar'?'M':'g/L'}`},
            ];
            return { rows, explanation: `Two-step plan using explicit intermediate concentration.` };
        }

        function planSeriesList(valuesCSV, unit, vol_mL) {
            const vals = valuesCSV.split(',').map(s=>pf(s)).filter(v=>v>0);
            if (!vals.length) return { error: 'Provide at least one target concentration.' };
            const Vtube = pf(vol_mL); if (!(Vtube>0)) return { error: 'Volume per tube must be > 0.' };
            const tgt0 = toConcentration(vals[0], unit);
            if (err(tgt0)) return tgt0;
            const tgtType = ensureType(tgt0, srcConc, mwParsed); if (err(tgtType)) return tgtType;
            const srcSame = ensureType(srcConc, tgtType, mwParsed); if (err(srcSame)) return srcSame;

            const rows = [];
            let explanation = [];
            vals.forEach((v, idx) => {
                const t0 = toConcentration(v, unit);
                const t = ensureType(t0, srcConc, mwParsed);
                if (err(t)) return;
                if (t.value > srcSame.value) { explanation.push(`Target ${v} ${unit} > source; skipped.`); return; }
                const V1 = (t.value * Vtube) / srcSame.value;
                const add = Vtube - V1;
                rows.push({ step: idx+1, take: `${niceRound(V1*1000,2)} µL stock`, add: `${niceRound(add*1000,2)} µL diluent`, result: `${niceRound(Vtube,3)} mL`, conc: `${niceRound(t.value,6)} ${t.type==='molar'?'M':'g/L'}`});
            });
            return { rows, explanation: `Independent tubes computed by C1V1=C2V2 with ${overagePct}% overage.` };
        }

        function planSeriesFactor(factor, steps, vol_mL) {
            const F = pf(factor); const N = Math.round(pf(steps));
            const V = pf(vol_mL);
            if (!(F>1) || !(N>=1) || !(V>0)) return { error: 'Provide factor > 1, steps ≥ 1, volume > 0.' };
            // We will create N tubes: Tube1 = source diluted by F, Tube2 = Tube1 diluted by F, etc.
            const srcType = srcConc;
            const rows = [];
            let c_prev = srcType.value;
            for (let i=1; i<=N; i++) {
                const c_target = c_prev / F;
                const V1 = (c_target * V) / c_prev; // V1 of previous (or source for i=1)
                const add = V - V1;
                rows.push({ step: i, take: `${niceRound(V1*1000,2)} µL ${i===1?'source':'prev tube'}`, add: `${niceRound(add*1000,2)} µL diluent`, result: `${niceRound(V,3)} mL`, conc: `${niceRound(c_target,6)} ${srcType.type==='molar'?'M':'g/L'}`});
                c_prev = c_target;
            }
            return { rows, explanation: `Cascaded ${F}× serial dilution over ${N} steps.` };
        }

        // Dispatch
        let plan;
        if (mode === 'single') {
            plan = planSingle(getEl('sdpro_target_val').value, getEl('sdpro_target_unit').value, getEl('sdpro_final_vol_ml').value);
        } else if (mode === 'intermediate') {
            plan = planIntermediate(getEl('sdpro_intermediate_val').value, getEl('sdpro_intermediate_unit').value, getEl('sdpro_intermediate_vol_ml').value, getEl('sdpro_target2_val').value, getEl('sdpro_target2_unit').value, getEl('sdpro_target2_vol_ml').value);
        } else if (mode === 'series_list') {
            plan = planSeriesList(getEl('sdpro_series_vals').value, getEl('sdpro_series_unit').value, getEl('sdpro_series_vol_ml').value);
        } else if (mode === 'series_factor') {
            plan = planSeriesFactor(getEl('sdpro_factor').value, getEl('sdpro_steps').value, getEl('sdpro_series2_vol_ml').value);
        } else {
            plan = { error: 'Unknown mode.' };
        }

        if (plan && plan.error) { showError(errorEl, plan.error); return; }
        if (!plan || !plan.rows || !plan.rows.length) { showError(errorEl, 'No steps generated.'); return; }

        // Pipetting checks and adjustments note
        const warnings = [];
        plan.rows.forEach(r => {
            const takeMatch = /([0-9.]+) µL/.exec(r.take);
            if (takeMatch) {
                const takeUL = parseFloat(takeMatch[1]);
                if (!withinPipetting(takeUL, minUL, maxUL)) {
                    warnings.push(`Step ${r.step}: take ${takeUL} µL outside pipetting range (${minUL}-${maxUL} µL). Consider adding an intermediate pre-dilution or changing factor.`);
                }
            }
        });

        let html = '';
        if (warnings.length) {
            html += `<div class="mb-2 text-amber-700 dark:text-amber-300"><strong>Warnings:</strong><ul class="list-disc list-inside">${warnings.map(w=>`<li>${w}</li>`).join('')}</ul></div>`;
        }
        html += htmlTable(plan.rows);
        if (unitExplanation) { html += `<p class="mt-2 text-xs text-slate-500 dark:text-slate-400">${unitExplanation}</p>`; }
        if (plan.explanation) {
            html += `<p class="mt-3 text-sm text-slate-600 dark:text-slate-400">${plan.explanation}</p>`;
        }
        showResult(resultEl, html);
    } catch (e) {
        showError(errorEl, e.message || String(e));
    }
}
