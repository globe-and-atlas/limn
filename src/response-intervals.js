// Summaries of sampled scores, without inferring the cause or filling gaps.
export function thresholdResponseIntervals(dates, scores, threshold = 0.1) {
    const intervals = [];
    let active = null;
    for (let i = 0; i < dates.length; i++) {
        const score = scores[i];
        if (Number.isFinite(score) && score > threshold) {
            if (!active) {
                active = { start: dates[i], end: dates[i], max: score };
                intervals.push(active);
            }
            active.end = dates[i];
            active.max = Math.max(active.max, score);
        } else {
            active = null;
        }
    }
    return intervals;
}
