export const EVIDENCE_STAGE_DEFS = Object.freeze([
    { id: 'reference', label: 'Reference', offsetDays: -180, role: '~6 months before the event anchor' },
    { id: 'before', label: 'Before', offsetDays: -30, role: '~30 days before the event anchor' },
    { id: 'event', label: 'Event', offsetDays: 0, role: 'documented or representative event date' },
    { id: 'after', label: 'After', offsetDays: 30, role: '~30 days after the event anchor' },
    { id: 'late', label: 'Late', offsetDays: 180, role: '~6 months after the event anchor' },
    { id: 'latest', label: 'Latest', offsetDays: null, role: 'latest date available to the viewer' },
]);

function parseIsoDate(value) {
    const match = String(value || '').match(/\d{4}-\d{2}-\d{2}/);
    if (!match) return null;
    const parsed = new Date(`${match[0]}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(date) {
    return date.toISOString().slice(0, 10);
}

function clampIsoDate(value, earliestDate, latestDate) {
    const valueMs = parseIsoDate(value)?.getTime();
    const earliestMs = parseIsoDate(earliestDate)?.getTime();
    const latestMs = parseIsoDate(latestDate)?.getTime();
    if (!Number.isFinite(valueMs)) return latestDate;
    if (Number.isFinite(earliestMs) && valueMs < earliestMs) return earliestDate;
    if (Number.isFinite(latestMs) && valueMs > latestMs) return latestDate;
    return value;
}

export function getSpillAnchorDate(spill, latestDate) {
    const eventDate = parseIsoDate(spill?.eventDate);
    if (eventDate) return { date: toIsoDate(eventDate), source: 'documented event date' };
    const representativeDate = parseIsoDate(spill?.date);
    if (representativeDate) return { date: toIsoDate(representativeDate), source: 'representative bookmark date' };
    return { date: latestDate, source: 'latest available date' };
}

export function buildSpillEvidenceTimeline(spill, earliestDate, latestDate) {
    const anchor = getSpillAnchorDate(spill, latestDate);
    const anchorDate = parseIsoDate(anchor.date) || parseIsoDate(latestDate);
    const stages = EVIDENCE_STAGE_DEFS.map(stage => {
        const target = stage.offsetDays === null
            ? latestDate
            : toIsoDate(new Date(anchorDate.getTime() + stage.offsetDays * 86400000));
        const date = clampIsoDate(target, earliestDate, latestDate);
        return {
            ...stage,
            targetDate: target,
            date,
            clamped: target !== date,
        };
    });
    return { anchorDate: anchor.date, anchorSource: anchor.source, stages };
}
