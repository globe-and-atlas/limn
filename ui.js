/**
 * Sentinel Explorer - UI Management Module
 * Handles toasts, tab switching, and modal states.
 */

/**
 * Displays a toast notification.
 * @param {string} message 
 * @param {'info'|'success'|'warning'} type 
 */
export function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : type === 'warning' ? '⚠' : 'ℹ'}</span>
        <span class="toast-msg">${message}</span>
    `;
    container.appendChild(toast);

    // Trigger entrance animation
    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    // Auto-dismiss after 5s
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 5000);
}

/**
 * Handles sidebar tab switching.
 * @param {string} tabId 
 */
export function switchTab(tabId) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Focus management: move focus to the active tab button
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (activeBtn) activeBtn.focus();

    // Update panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `tab-${tabId}`);
    });
}

/**
 * GLOBAL KEY LISTENERS
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Close Report Modal
        const reportModal = document.getElementById('report-modal');
        if (reportModal && reportModal.style.display !== 'none') {
            const closeBtn = document.getElementById('btn-close-report');
            if (closeBtn) closeBtn.click();
        }
        
        // Close Chart Panel
        const chartPanel = document.getElementById('bottom-chart-panel');
        if (chartPanel && chartPanel.style.display !== 'none') {
            const closeBtn = chartPanel.querySelector('.close-panel-btn');
            if (closeBtn) closeBtn.click();
        }
    }
});

/**
 * Updates the UI based on the current state.
 * @param {Object} state 
 * @param {Object} INDICES 
 */
export function updateUI(state, INDICES) {
    if (state.activeIndex === 'none') {
        const genBtn = document.getElementById('btn-generate-report');
        if (genBtn) genBtn.disabled = true;
        return;
    } else {
        const genBtn = document.getElementById('btn-generate-report');
        if (genBtn && genBtn.innerText !== "Querying Database...") {
            if (document.querySelector('.leaflet-interactive')) {
                genBtn.disabled = false;
            }
        }
    }

    const cfg = INDICES[state.activeIndex];

    // Legend panel
    const nameEl = document.getElementById('active-index-name');
    const sensorEl = document.getElementById('sensor-tag-display');
    const minEl = document.getElementById('legend-min');
    const maxEl = document.getElementById('legend-max');
    const formulaEl = document.getElementById('formula-display');
    const gradEl = document.getElementById('legend-gradient');

    if (cfg && nameEl) {
        nameEl.innerText = cfg.name;
        if (sensorEl) sensorEl.innerText = cfg.sensor || 'Sentinel-2 L2A';
        if (minEl) minEl.innerText = cfg.min || '';
        if (maxEl) maxEl.innerText = cfg.max || '';
        if (formulaEl) formulaEl.innerText = cfg.formula || '';

        if (gradEl) {
            if (cfg.gradient && cfg.gradient !== 'none') {
                gradEl.style.display = 'block';
                gradEl.style.background = cfg.gradient;
                if (minEl) minEl.style.display = 'block';
                if (maxEl) maxEl.style.display = 'block';
            } else {
                gradEl.style.display = 'none';
                if (minEl) minEl.style.display = 'none';
                if (maxEl) maxEl.style.display = 'none';
            }
        }
    }

    const diffPos = document.getElementById('diff-label-pos');
    const diffNeg = document.getElementById('diff-label-neg');
    if (diffPos && diffNeg) {
        if (cfg && cfg.diffLabels) {
            diffNeg.innerText = cfg.diffLabels[0];
            diffPos.innerText = cfg.diffLabels[1];
        } else {
            diffNeg.innerText = "Decrease (Loss)";
            diffPos.innerText = "Increase (Gain)";
        }
    }

    const diffLegend = document.getElementById('diff-legend');
    if (diffLegend) {
        diffLegend.style.display = (state.mode === 'compare' && state.compareType === 'diff') ? 'block' : 'none';
    }
}
