import { getEl, querySelAll } from './utils.js';

export function showError(el, message) {
    if (el) {
        el.textContent = message;
        el.classList.remove('hidden');
    }
}

export function hideAndClear(el) {
    const targetEl = typeof el === 'string' ? getEl(el) : el;
    if (targetEl) {
        targetEl.classList.add('hidden');
        targetEl.innerHTML = '';
    }
}

export function showResult(el, message) {
    if (el) {
        el.innerHTML = message;
        el.classList.remove('hidden');
    }
}

export function switchTab(targetId) {
    const tabs = querySelAll('.tab');
    const sections = querySelAll('.calculator-section');

    tabs.forEach(t => {
        const isActive = t.dataset.target === targetId;
        t.classList.toggle('border-indigo-500', isActive);
        t.classList.toggle('text-indigo-600', isActive);
        t.classList.toggle('border-transparent', !isActive);
        t.classList.toggle('text-slate-600', !isActive);
    });
    sections.forEach(s => {
        s.classList.toggle('active', s.id === targetId.substring(1));
    });
}

export function setupDynamicFields(selectEl, fields) {
    function toggleFields() {
        const solveFor = selectEl.value;
        Object.keys(fields).forEach(key => {
            const isInputForSolve = key === solveFor;
            getEl(fields[key]).style.display = isInputForSolve ? 'none' : 'block';
        });
    }
    selectEl.addEventListener('change', toggleFields);
    toggleFields();
}

export function setupPlateSeedingUI() {
    const plateTypeSelect = getEl('ps_plate_type');
    const customInputs = getEl('ps_custom_inputs');

    function toggleCustomInputs() {
        if (plateTypeSelect.value === 'custom') {
            customInputs.classList.remove('hidden');
        } else {
            customInputs.classList.add('hidden');
        }
    }

    plateTypeSelect.addEventListener('change', toggleCustomInputs);
    // Initial check on page load
    toggleCustomInputs();
}

export function setupTheme() {
    const toggleButton = getEl('theme-toggle');
    const lightIcon = getEl('theme-icon-light');
    const darkIcon = getEl('theme-icon-dark');

    // Function to apply the theme
    const applyTheme = (isDark) => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            lightIcon.classList.add('hidden');
            darkIcon.classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            lightIcon.classList.remove('hidden');
            darkIcon.classList.add('hidden');
        }
    };

    // Check for saved theme in localStorage or user's system preference
    const isDarkMode = localStorage.theme === 'dark' ||
                       (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);

    applyTheme(isDarkMode);

    toggleButton.addEventListener('click', () => {
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.theme = isDark ? 'light' : 'dark';
        applyTheme(!isDark);
    });
}

export function setupSeedingUI() {
    const modeSel = getEl('seed_mode');
    const simpleForm = getEl('seed_simple_form');
    const plateForm = getEl('seed_plate_form');
    if (!modeSel || !simpleForm || !plateForm) return;

    const update = () => {
        const mode = modeSel.value;
        if (mode === 'simple') {
            simpleForm.classList.remove('hidden');
            plateForm.classList.add('hidden');
        } else {
            simpleForm.classList.add('hidden');
            plateForm.classList.remove('hidden');
        }
    };
    modeSel.addEventListener('change', update);
    update();
}

export function setupSerialProUI() {
    const mode = getEl('sdpro_mode');
    const pSingle = getEl('sdpro_panel_single');
    const pInter = getEl('sdpro_panel_intermediate');
    const pList = getEl('sdpro_panel_series_list');
    const pFactor = getEl('sdpro_panel_series_factor');
    if (!mode) return;
    const update = () => {
        const m = mode.value;
        pSingle.classList.toggle('hidden', m !== 'single');
        pInter.classList.toggle('hidden', m !== 'intermediate');
        pList.classList.toggle('hidden', m !== 'series_list');
        pFactor.classList.toggle('hidden', m !== 'series_factor');
    };
    mode.addEventListener('change', update);
    update();
}
