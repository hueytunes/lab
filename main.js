import { getEl, querySelAll } from './utils.js';
import { switchTab, setupDynamicFields, setupPlateSeedingUI, setupSeedingUI, setupSerialProUI, setupTheme } from './ui.js';
import {
    calculateDilution,
    calculateMolarityCalc,
    calculateReconstitution,
    calculateMVC,
    
    calculateSerialDose,
    calculateSeedingUnified
} , calculateSeedingUnified } , calculateSerialDilutionPro } from './calculators.js';

document.addEventListener('DOMContentLoaded', () => {
    const tabs = querySelAll('.tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.target));
    });

    // --- Connect Dynamic Field Selectors ---
    setupDynamicFields(getEl('mvc_solve_for'), {
        mass: 'mvc_input_mass',
        volume: 'mvc_input_volume',
        concentration: 'mvc_input_conc'
    });

    setupDynamicFields(getEl('mol_calc_solve_for'), {
        mass: 'mol_input_mass',
        volume: 'mol_input_volume',
        molarity: 'mol_input_molarity'
    });

    // --- Connect ALL Calculator Buttons ---
    getEl('dilution-calculator').querySelector('button').addEventListener('click', calculateDilution);
    getEl('molarity-calculator').querySelector('button').addEventListener('click', calculateMolarityCalc);
    getEl('reconstitution-calculator').querySelector('button').addEventListener('click', calculateReconstitution);
    getEl('mass-vol-conc-calculator').querySelector('button').addEventListener('click', calculateMVC);
    // This connects your new button
    getEl('calculate_sd_btn').addEventListener('click', calculateSerialDose);
    const seedBtn = getEl('calculate_seeding_btn'); if (seedBtn) seedBtn.addEventListener('click', calculateSeedingUnified);
    const sdproBtn = getEl('calculate_sdpro_btn'); if (sdproBtn) sdproBtn.addEventListener('click', calculateSerialDilutionPro);
    getEl('calculate_ps_btn').addEventListener('click');

    // Setup UI handlers
    setupPlateSeedingUI();
    setupSeedingUI();
    setupSerialProUI();
    setupTheme();

    // Activate the first tab on page load
    if (tabs.length > 0) {
        switchTab(tabs[0].dataset.target);
    }
});
