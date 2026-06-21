# Subagent Report: Enable Digital Experiences

**Status**: BLOCKED after 3 attempts  
**Org**: `Electra_Ej4` (alias)  
**Instance**: `https://trailsignup-d5ab9b99a5c3dd.my.salesforce.com`  
**Task**: Enable Digital Experiences checkbox in Setup → Digital Experiences → Settings  

---

## What I Tried

### Attempt 1
- **Issue**: Frontdoor navigation timed out at 60s with `waitUntil: 'networkidle'`
- **Action**: Increased timeout to 120s, changed wait strategy to `domcontentloaded`, added URL validation

### Attempt 2
- **Issue**: Successfully reached the Settings page at `/lightning/setup/NetworkSettings/home`, but JavaScript checkbox search returned `{ found: false }`
- **Search strategy used**: Shadow-DOM walk looking for `INPUT[type=checkbox]` with parent text containing "Enable Digital Experiences"
- **Result**: Script exited with "Could not find Enable Digital Experiences checkbox"
- **Screenshot saved**: `docs/ej4_probe/digexp-error-notfound.png`

### Attempt 3
- **Issue**: Same as Attempt 2
- **Search strategy changed**: Added direct `document.querySelectorAll('input[type=checkbox]')` pass BEFORE shadow-DOM walk, checking parent element text up to 5 levels
- **Result**: Still `{ found: false }`, same error
- **Screenshot saved**: Same file (overwritten with identical content)

---

## Evidence

The screenshot at `docs/ej4_probe/digexp-error-notfound.png` clearly shows:

1. **Page loaded correctly**: Setup UI visible, URL is `/lightning/setup/NetworkSettings/home`
2. **Checkbox is present**: Under the "Enable Digital Experiences" section heading, there is a visible unchecked checkbox with label text "Enable Digital Experiences"
3. **Checkbox is a standard HTML element**: It's not in a shadow DOM (based on visual inspection and the fact that direct `querySelectorAll` should have found it)

---

## Hypothesis

The checkbox may be:
1. **Inside an iframe** that I'm not entering (though Setup pages typically don't use iframes for settings)
2. **Rendered after the 10s+5s wait period** I'm using (though the screenshot shows it's there)
3. **Dynamically inserted by JavaScript** after my `evaluate()` runs but before the screenshot
4. **Protected by some DOM attribute** that prevents JavaScript from finding it despite being visually rendered

The most likely issue: The checkbox exists on the page at screenshot time but NOT at the time my `page.evaluate()` runs. There may be a React/Lightning hydration delay.

---

## Recommended Next Steps (for Opus)

1. **Add explicit wait for the checkbox element** using Playwright's built-in wait mechanisms (e.g., `page.waitForSelector('input[type=checkbox]')`) BEFORE running the `evaluate()` search
2. **Use Playwright's locator API** instead of `evaluate()`:
   ```js
   await page.locator('input[type=checkbox]').evaluateAll(boxes => {
     // search through boxes
   });
   ```
3. **Check for iframes** with `page.frames()` and search each frame separately
4. **Try clicking via Playwright locator** directly instead of JavaScript click:
   ```js
   await page.locator('label:has-text("Enable Digital Experiences")').locator('input[type=checkbox]').click();
   ```

---

## Files Modified

- `scripts/ej4/enable-digital-experiences.js` (created, 3 iterations)

---

## Validation Status

❌ **Not completed**  
- Digital Experiences is NOT enabled (checkbox remains unchecked in screenshot)
- No domain configured
- No after screenshot (script exits before that step)

---

## Escalation

Per the 3-strike rule, I am **handing off to Opus** for diagnosis. The checkbox is visually present but JavaScript cannot locate it through standard DOM queries or shadow-DOM walks.
