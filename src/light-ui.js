// Guided presentation over the existing map, date, and bookmark controllers.
export function initLightUi({ state, sites, onSite, onLens }) {
    const sidebar = document.querySelector('.sidebar');
    const header = document.createElement('header');
    header.className = 'light-masthead';
    header.innerHTML = `<a class="light-brand" href="/">LIMN <span>by Globe & Atlas</span></a>
      <nav aria-label="Main navigation"><button id="guide-explore" aria-pressed="true">Explore</button><button id="guide-compare" aria-pressed="false">Compare</button></nav>
      <button id="guide-advanced" aria-expanded="false">Advanced tools</button>`;
    document.body.prepend(header);
    const panel = document.createElement('div');
    panel.id = 'guided-controls';
    panel.innerHTML = `<p class="guide-eyebrow">SURFACE INVESTIGATION</p>
      <section class="guide-step"><span class="guide-number">1</span><h2>Place</h2>
        <label for="guide-site">Choose an investigation site</label><select id="guide-site"><option value="" disabled>Custom map location</option></select>
        <div id="guide-search"></div><p id="guide-coordinates"></p>
        <details><summary>Site context</summary><p id="guide-context"></p></details></section>
      <section class="guide-step"><span class="guide-number">2</span><h2>Imagery</h2>
        <div id="guide-single"><label for="date-single">Scene search date</label></div>
        <div id="guide-pair"><label id="guide-earlier" for="date-t1">Earlier search date</label><label id="guide-later" for="date-t2">Later search date</label></div>
        <p class="guide-caption">Search dates can resolve to a nearby acquisition.</p>
        <p id="guide-acquired" class="guide-acquired" aria-live="polite"></p><details><summary>Scene details & acquisition IDs</summary><p id="guide-acquisitions" aria-live="polite"></p></details></section>
      <section class="guide-step"><span class="guide-number">3</span><h2>View</h2><p class="guide-caption">Choose what to examine</p>
        <div class="guide-lenses" role="group" aria-label="Surface observation lenses">
          <button data-lens="tc"><strong>Natural color</strong><span>True-to-life context · RGB</span></button>
          <button data-lens="ndwi"><strong>Water & wetness</strong><span>Surface-water contrast · MNDWI</span></button>
          <button data-lens="savi"><strong>Vegetation</strong><span>Arid vegetation response · SAVI</span></button>
          <button data-lens="ndsi"><strong>Surface contrast</strong><span>Dual-SWIR / NBR2 form</span></button>
        </div>
        <button class="guide-primary" id="guide-compare-action">Compare with another date <span aria-hidden="true">→</span></button>
        <details class="guide-research"><summary>Research lenses</summary><p>Experimental responses do not identify produced water.</p><label for="guide-research-lens">Experimental lens</label><select id="guide-research-lens"><option value="">Choose a research lens</option><option value="lbi">Standing-water response · LBI</option><option value="pwi">Three-ratio contrast · PWCI</option><option value="hpwi">Optical contrast · OBEC</option><option value="pwoi">Wet/dry surface response · ASAI</option></select></details>
      </section><p class="guide-footnote">Sentinel-2 surface context. Field evidence is needed for chemical identification.</p>`;
    sidebar.prepend(panel);
    const siteSelect = panel.querySelector('#guide-site');
    sites.forEach(site => { const option = document.createElement('option'); option.value = site.id; option.textContent = site.label; siteSelect.append(option); });
    panel.querySelector('#guide-search').append(document.querySelector('.location-control .search-box'));
    panel.querySelector('#loc-search-input').placeholder = 'Or search a place / lat, lng';
    panel.querySelector('#guide-single').append(document.getElementById('date-single'));
    panel.querySelector('#guide-earlier').after(document.getElementById('date-t1'));
    panel.querySelector('#guide-later').after(document.getElementById('date-t2'));
    const context = document.createElement('details');
    context.className = 'light-map-context';
    context.innerHTML = '<summary>What am I seeing?</summary><p>Colors show surface responses. Imagery alone cannot identify produced water. Check acquisition dates, site records, and complementary views.</p>';
    document.getElementById('main').append(context);
    const setMode = compare => {
        document.body.classList.remove('light-advanced');
        document.getElementById('guide-advanced').setAttribute('aria-expanded', 'false');
        document.getElementById(compare ? 'mode-compare' : 'mode-single').click();
        if (compare) document.getElementById('btn-swipe').click();
        sync();
        sidebar.scrollTop = 0;
        state.map.invalidateSize();
    };
    document.getElementById('guide-explore').onclick = () => setMode(false);
    document.getElementById('guide-compare').onclick = () => setMode(true);
    document.getElementById('guide-compare-action').onclick = () => setMode(true);
    document.getElementById('guide-advanced').onclick = event => {
        const expanded = document.body.classList.toggle('light-advanced');
        event.currentTarget.setAttribute('aria-expanded', String(expanded));
        if (expanded) document.querySelector('.ui-mode-btn[data-layout="suite-grid"]').click();
    };
    siteSelect.onchange = () => { state.activeLoc = 'bookmark'; onSite(siteSelect.value); sync(); };
    panel.querySelectorAll('[data-lens]').forEach(button => { button.onclick = () => { onLens(button.dataset.lens); sync(); }; });
    panel.querySelector('#guide-research-lens').onchange = event => { if (event.target.value) { onLens(event.target.value); sync(); } };
    function sync() {
        const site = state.activeLoc === 'custom' ? null : sites.find(candidate => candidate.id === state.activeSpillId);
        siteSelect.value = site?.id || '';
        panel.querySelector('#guide-coordinates').textContent = `${state.map.getCenter().lat.toFixed(4)}°, ${state.map.getCenter().lng.toFixed(4)}°`;
        panel.querySelector('#guide-context').textContent = site ? `${site.note || ''} Source: ${site.source || 'Unspecified'}.` : 'Exploratory location; incident attribution has not been established.';
        const acquisitionText = document.getElementById('cog-scene-status').textContent;
        panel.querySelector('#guide-acquisitions').textContent = acquisitionText;
        const dates = [...new Set(acquisitionText.match(/\d{4}-\d{2}-\d{2}/g) || [])];
        panel.querySelector('#guide-acquired').textContent = dates.length ? `Acquired ${dates.join(' / ')} · Sentinel-2` : 'Acquisition details appear when tiles load.';
        const compare = state.mode === 'compare';
        panel.querySelector('#guide-single').hidden = compare;
        panel.querySelector('#guide-pair').hidden = !compare;
        document.getElementById('guide-explore').setAttribute('aria-pressed', String(!compare));
        document.getElementById('guide-compare').setAttribute('aria-pressed', String(compare));
        panel.querySelectorAll('[data-lens]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lens === state.activeIndex)));
        panel.querySelector('.guide-research summary').textContent = ['lbi','pwi','hpwi','pwoi'].includes(state.activeIndex) ? `Research lens · ${state.activeIndex === 'hpwi' ? 'OBEC' : state.activeIndex === 'pwoi' ? 'ASAI' : state.activeIndex === 'pwi' ? 'PWCI' : 'LBI'}` : 'Research lenses';
        panel.querySelector('#guide-research-lens').value = ['lbi','pwi','hpwi','pwoi'].includes(state.activeIndex) ? state.activeIndex : '';
        panel.querySelector('#guide-compare-action').hidden = compare;
    }
    const observer = new MutationObserver(sync);
    ['workflow-site','workflow-lens','cog-scene-status','workflow-temporal-status'].forEach(id => observer.observe(document.getElementById(id), { childList: true, subtree: true, characterData: true }));
    state.map.on('moveend', sync);
    sync();
}
