# Adding a New Spectral Index

## Step 1: Define the index in `indices.js`

Add an entry to the `INDICES` object:

```javascript
myindex: {
    name: 'Human-readable name',
    sensor: 'Sentinel-2 L2A',          // or 'Sentinel-1 GRD' or 'S1/S2 Fusion'
    temporal: 'Live',                   // 'Live' | 'Persistent' | 'Deep Fusion' | etc.
    min: 'Low label', max: 'High label',
    gradient: 'linear-gradient(to right, #000, #FFF)',
    formula: '(B11 - B12) / (B11 + B12)',
    info: 'Scientific explanation for the info tooltip.',
    diffLabels: ['Decrease label', 'Increase label'],
    evalscript: genEvalscript(['B11', 'B12'], `
  let sum = sample.B11 + sample.B12;
  if (sum === 0) return [0,0,0,0];
  let val = (sample.B11 - sample.B12) / sum;
  if (typeof VISUAL_FILTER !== 'undefined' && val < VISUAL_FILTER) return [0,0,0,0];
  ${colorBlend('val', PALETTE_MYINDEX)}
`),
    fisLogic: `
  let sum = sample.B11 + sample.B12;
  if (sum === 0) return [0];
  return [(sample.B11 - sample.B12) / sum];
`
}
```

**Rules:**
- All bands used in `logic` must be in the `bands` array passed to `genEvalscript`
- `fisLogic` must return `[float]` (single value, used by Statistics API)
- Add `VISUAL_FILTER` and `DETECTION_SENSITIVITY` handling if appropriate
- If using calibration presets, use `__PLACEHOLDER__` tokens (see `getScriptContent` in map.js)

## Step 2: Define a palette (if new)

Add to `indices.js` near the other palette constants:
```javascript
export const PALETTE_MYINDEX = "[[0.0, R, G, B], [0.5, R, G, B], [1.0, R, G, B]]";
```
Then import it in `map.js` and `app.js`.

## Step 3: Add to HTML button grid (`index.html`)

```html
<button class="index-btn idx-myindex" data-index="myindex">
    <span class="index-short">MYI</span>
    <span class="index-full index-full-bold">My Index Name</span>
</button>
```
Pick the right `<div class="index-suite-container">` section (Detection, Diagnostic, Spectral, or Standard).

## Step 4: Handle cumulative mode in `map.js` (`getScriptContent`)

In the `isCumulative` block, add a case for your index with its logic string and palette:
```javascript
else if (activeIndex === 'myindex') {
    logic = "(sample.B11 - sample.B12) / (sample.B11 + sample.B12)";
    palette = PALETTE_MYINDEX;
    bands = ['B11', 'B12'];
}
```

## Step 5: Handle diff mode in `map.js` (`getScriptContent`)

In the `isDiff` block, add a `calc` expression (negated if higher = worse):
```javascript
else if (activeIndex === 'myindex') calc = '-((sample.B11-sample.B12)/(sample.B11+sample.B12))';
```
And add the `bands` assignment:
```javascript
if (activeIndex === 'myindex') bands = ['B11', 'B12'];
```

## Step 6: Add to CHART_COLORS (optional, for hover highlight)

In `indices.js`:
```javascript
myindex: '#FF6600',
```

## Step 7: If it's a deep fusion index (S1+S2)

- Use `genDeepFusionEvalscript(bands, logic)` instead of `genEvalscript`
- Set `sensor: 'S1/S2 Fusion'`
- Add `activeIdx === 'myindex'` to the time-range expansion condition in `getWMSLayer()` in `map.js`
- Add `activeIndex !== 'myindex'` to the cumulative exclusion in `getScriptContent()`
