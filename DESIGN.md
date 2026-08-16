---
name: VideoScaler
description: A Miura-fold sheet for a Windows compression utility — every weight lever visible, every lever marked by which side of the fold it sits on.
colors:
  sheet: "#f7f7f7"
  sheet-raised: "#fdfdfc"
  sheet-sunk: "#eceae4"
  ink: "#0a0a0a"
  ink-2: "#4a4844"
  ink-3: "#6e6b64"
  mountain: "#b9b6ae"
  mountain-fill: "#e6e4de"
  valley: "#cfe0f2"
  valley-line: "#7ba4cd"
  valley-ink: "#2c5479"
  mark-mountain: "#7d7970"
  mark-valley: "#4272a3"
  foil: "#d4af37"
  foil-ink: "#241c05"
  alert: "#a33a22"
  alert-fill: "#f6e6e1"
  alert-ink: "#6b2416"
  density-loose-ink: "#24512c"
  density-loose-fill: "#d6e8d4"
  density-tight-ink: "#6b2f18"
  density-tight-fill: "#f3ddd0"
  # Rampa del foil. El botón de comprometer es un degradado de tres paradas que
  # imita una lámina metálica; una sola parada plana no lee como foil. Estas son
  # las únicas variantes de --foil permitidas, y sólo en ese botón.
  foil-hi: "#e8c85e"
  foil-lo: "#b38f2a"
  foil-hover-hi: "#f2d670"
  foil-hover-mid: "#e2bd47"
  foil-hover-lo: "#c09a2e"
  foil-active-hi: "#c8a63a"
  foil-active-mid: "#b89428"
  foil-active-lo: "#96781f"
  # La mesa: la única superficie oscura, y sólo bajo la imagen del reproductor.
  # No es un tema oscuro — es otro material, con otro oficio.
  stage: "#23211e"
  # Rellenos de hover que no pueden coincidir con el de selección.
  seg-hover: "#f1efe9"
  switch-hover: "#ddd9d0"
  alert-line: "#e0bdb1"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.02em"
    fontStretch: "118%"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    letterSpacing: "-0.012em"
    fontStretch: "108%"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.14em"
    fontStretch: "108%"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  caption:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.35
  micro:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "9px"
    fontWeight: 500
    letterSpacing: "0.1em"
  # Un escalón por encima de micro: unidades de campo, pies de deslizador,
  # captions de par y la nota de versión. Etiqueta, nunca valor ni frase.
  micro-label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    letterSpacing: "0.05em"
  measurement:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    fontStretch: "88%"
    fontFeature: "tnum"
  # Valores de la barra de masa: por encima de la medición normal porque es el
  # número que el usuario vigila mientras mueve palancas.
  measurement-mass:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "15px"
    fontWeight: 400
    fontStretch: "88%"
    fontFeature: "tnum"
  # Cifra del resultado, y el "quedará en" por debajo de 1000px.
  measurement-figure:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "17px"
    fontWeight: 400
    fontStretch: "88%"
    fontFeature: "tnum"
  measurement-strong:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "19px"
    fontWeight: 600
    fontStretch: "88%"
    fontFeature: "tnum"
  measurement-small:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    fontStretch: "82%"
    fontFeature: "tnum"
rounded:
  none: "0"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "18px"
  s5: "28px"
  s6: "44px"
  s7: "68px"
  crease: "1px"
components:
  action-commit:
    backgroundColor: "{colors.foil}"
    textColor: "{colors.foil-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "11px 26px"
  action-commit-hover:
    backgroundColor: "#e2bd47"
    textColor: "{colors.foil-ink}"
  action-commit-active:
    backgroundColor: "#b89428"
    textColor: "{colors.foil-ink}"
  action-commit-disabled:
    backgroundColor: "{colors.mountain-fill}"
    textColor: "{colors.ink-2}"
  action-quiet:
    backgroundColor: "{colors.sheet-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "11px 26px"
  action-quiet-hover:
    backgroundColor: "{colors.sheet-sunk}"
    textColor: "{colors.ink}"
  action-quiet-active:
    backgroundColor: "{colors.mountain-fill}"
    textColor: "{colors.ink}"
  segmented-option:
    backgroundColor: "{colors.sheet-raised}"
    textColor: "{colors.ink-2}"
    padding: "7px 9px"
    rounded: "{rounded.none}"
  segmented-option-hover:
    backgroundColor: "#f1efe9"
    textColor: "{colors.ink}"
  segmented-option-selected:
    backgroundColor: "{colors.sheet-sunk}"
    textColor: "{colors.ink}"
  switch-track:
    backgroundColor: "{colors.mountain-fill}"
    width: "46px"
    height: "24px"
    padding: "3px"
    rounded: "{rounded.none}"
  switch-track-checked:
    backgroundColor: "{colors.valley}"
  switch-knob:
    backgroundColor: "{colors.sheet-raised}"
    width: "18px"
    height: "18px"
    rounded: "{rounded.none}"
  crease-row:
    backgroundColor: "{colors.sheet-raised}"
    textColor: "{colors.ink}"
    padding: "12px 18px"
    height: "52px"
    rounded: "{rounded.none}"
  crease-mark-mountain:
    backgroundColor: "{colors.mark-mountain}"
    width: "22px"
    height: "13px"
  crease-mark-valley:
    backgroundColor: "transparent"
    width: "22px"
    height: "13px"
  identity-card:
    backgroundColor: "{colors.sheet-raised}"
    textColor: "{colors.ink}"
    padding: "18px 28px"
    rounded: "{rounded.none}"
  number-field:
    backgroundColor: "{colors.sheet-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.measurement-small}"
    padding: "7px 10px"
    rounded: "{rounded.none}"
  field-unit:
    backgroundColor: "{colors.sheet-sunk}"
    textColor: "{colors.ink-2}"
    padding: "0 10px"
  notice-alert:
    backgroundColor: "{colors.alert-fill}"
    textColor: "{colors.alert-ink}"
    padding: "12px 18px"
    rounded: "{rounded.none}"
  notice-quiet:
    backgroundColor: "{colors.valley}"
    textColor: "{colors.valley-ink}"
    padding: "12px 18px"
    rounded: "{rounded.none}"
  density-chip-holgado:
    backgroundColor: "{colors.density-loose-fill}"
    textColor: "{colors.density-loose-ink}"
    padding: "2px 9px"
  density-chip-justo:
    backgroundColor: "{colors.valley}"
    textColor: "{colors.valley-ink}"
    padding: "2px 9px"
  density-chip-apretado:
    backgroundColor: "{colors.density-tight-fill}"
    textColor: "{colors.density-tight-ink}"
    padding: "2px 9px"
  progress-track:
    backgroundColor: "{colors.mountain-fill}"
    height: "5px"
    rounded: "{rounded.none}"
  progress-fill:
    backgroundColor: "{colors.foil}"
    height: "5px"
---

# Design System: VideoScaler

## Overview

**Creative North Star: "The Miura Sheet"**

A compressed file is a folded sheet — the same content in less space. VideoScaler's window is that sheet, laid flat on a faint 64px fold lattice, and every control is a crease drawn across it. The world was chosen by the user (Miura fold, seed `072f3e85`, index 5) over the dice assignment, and it earns its keep by being load-bearing rather than decorative: the Miura pattern has exactly two classes of fold, mountain and valley, and this product has exactly two classes of lever — the ones that remove weight and the ones that preserve quality. The pattern is the state system. It is not wallpaper.

The register is Operate, not persuade. Nothing here sells; the file's identity card and the live weight estimate *are* the content. Density is high on purpose — the product principle is that every weight lever is visible, so the deployed sheet carries sixteen crease rows without apology. Legibility under that density comes from three things: an absolutely flat corner language (zero radius, everywhere), a strict split between text set in Archivo and measurements set in Martian Mono, and a single note of gold foil that appears once and only on the act of committing.

The sheet is paper-coloured, not white, and the ink is not black-on-white theatre either — it is near-black on warm off-white, with two greyed steps below it for hint text and micro-labels. Depth is real: the raised surfaces cast a genuine two-layer offset shadow, and the identity card's corner is *drawn* as a folded dog-ear rather than faked with a gradient. The one anti-reference the build refuses is the default layout of its own category: a big drop zone, one slider, one giant button. VideoScaler rejects that composition explicitly.

The sheet now has three faces. **Reducir** is the sheet of levers described above; **Reproducir** is the table — a dark viewing surface where the same file is played, slowed, magnified to 1:1 and stepped one frame at a time with J and K, and where any frame can be captured to disk. It exists because the product's third principle ("the quality tradeoff must be judgeable before committing") cannot be honoured by a progress bar: to know what a codec did to an image, someone has to stop it and look. **Editar** is the bench: the table again on top, and under it the timeline in paper — a sheet ruled in seconds where the file is cut into blocks, the blocks are moved, and other files are laid beside them. All three modules are two rows of the same window and are never on screen together, which is what keeps the single-foil and single-dark-surface rules intact.

The bench is where the world stops being a metaphor about one file and starts being about several. A cut is a fold: the same material, creased and refolded into a different order. That is why the timeline is paper and not the black rack every editor ships — the dark surface in this system means *look at the image*, and a timeline is not something you look at, it is something you fold.

**Key Characteristics:**
- Zero corner radius on every surface, control and chip — no exceptions in the codebase.
- Parallelogram silhouettes cut with `clip-path`, applied to containers, rules, tabs, chips and buttons — never to text or numeric columns.
- Two-fold semantics: filled mountain mark = removes weight; outlined valley mark = preserves quality; unmarked = not a lever.
- Gold foil (`#d4af37`) appears once per screen, on the commit action only.
- Archivo (variable, width axis in active use) for everything readable; Martian Mono for everything measurable.
- Layered paper depth via two-stop offset shadows and 1px fold hairlines — no glassmorphism, no glow, one 6px backdrop blur on the header only.
- Exactly one dark surface (`#23211e`, the player's table) and exactly one gold (the commit action) — both rationed, never decorative.

## Colors

A warm paper palette: three sheet tones, three ink steps, two fold families (a grey mountain and a blue valley), one alert family, and one gold reserved to a single act.

### Primary

- **Foil Gold** (`#d4af37`): The commit colour. It appears on `.act-commit` as a three-stop 103° gradient (`#e8c85e` → `#d4af37` → `#b38f2a`), on the progress bar fill (`#d4af37` → `#e8c85e`), and as the 3px drag-target border. Nothing else may take it. The gold inside the logo is not this gold and is not governed by this rule — see The mark.
- **Foil Ink** (`#241c05`): The only text colour permitted on foil. Measures 8.0:1 against the gradient midpoint.

### Secondary — the fold families

These are two families, not two colours, and each has a hairline weight and a semantic weight. The hairline weight draws structure. The semantic weight carries meaning and is deliberately darker so it clears the 3:1 non-text contrast floor.

- **Mountain Grey, hairline** (`#b9b6ae`): Every fold line in the interface — the header's bottom rule, the mass bar's top rule, the 1px gaps between crease rows (drawn as the `.creases` container background showing through), input borders, inset hairlines on clipped shapes, and the scrollbar thumb. It measures 1.99:1 on raised sheet: **structural only, never informational.**
- **Mountain Fill** (`#e6e4de`): The pressed/inactive fill — segmented `:active`, the switch track at rest, the progress track, the disabled commit button's background.
- **Mountain Mark** (`#7d7970`): The semantic mountain. Two uses, both informational: the filled parallelogram `.crease-mark-mountain`, and the video share of the split bar in El reparto. 4.26:1 on raised sheet. It is the tone that carries meaning, so it may go anywhere meaning is carried — and nowhere structure is.
- **Valley Blue** (`#cfe0f2`): The valley fill — the checked switch track, the quiet notice background, the `mass-drop` percentage chip, the `justo` density chip, and the focus underline on fields.
- **Valley Line** (`#7ba4cd`): The valley hairline — the quiet notice's inset rule. It also drew the fold lines of the empty-state packet illustration, which the logo replaced in 0.2.6.
- **Valley Mark** (`#4272a3`): The semantic valley. Used on the `.crease-mark-valley` outline, on the checked switch's inset rule, on `.field:focus-within` borders, and as the 1px outline of the split bar's audio share. 4.91:1 on raised sheet.
- **Valley Ink** (`#2c5479`): Text on any valley fill. 5.88:1 on `#cfe0f2`.

### Tertiary — signal

- **Alert Rust** (`#a33a22`): The alert icon stroke only.
- **Alert Fill** (`#f6e6e1`) with **Alert Ink** (`#6b2416`): The `.notice` block. 9.17:1.
- **Density Loose** (`#24512c` on `#d6e8d4`, 7.14:1) / **Density Tight** (`#6b2f18` on `#f3ddd0`, 7.85:1): the two outer steps of the density chip. The middle step reuses valley.

### Neutral

- **Sheet** (`#f7f7f7`): The window base, and the Electron `BrowserWindow.backgroundColor`, so there is no white flash before first paint.
- **Sheet Raised** (`#fdfdfc`): Every panel that sits above the sheet — identity card, crease rows, mass bar, run panel, result panel, quiet button, input backgrounds.
- **Sheet Sunk** (`#eceae4`): The pressed/selected tone — selected segmented option, quiet button hover, field unit suffix, the dog-ear triangle.
- **Ink** (`#0a0a0a`): Primary text, the focus ring, the selected-tab underline, the range thumb.
- **Ink 2** (`#4a4844`): Secondary text — section headings, body copy in the empty state, numeric readouts in the mass bar, unselected segmented labels. 8.5:1 on sheet.
- **Ink 3** (`#6e6b64`): Micro-labels, hints, units, disabled text. 4.96:1 on sheet — it clears 4.5:1 even at its 9px minimum size.

### The table — the one dark surface

- **Stage** (`#23211e`): the background of the player's viewing area (`.stage`), and the only dark surface in the system. It is a *material*, not a theme: the sheet is where you decide, the table is where you look. A light surround raises a frame's apparent black level and hides exactly the compression blocking the player exists to reveal, which is why every serious image viewer is dark. It stops at the edge of the viewing area; the header and the transport bar on either side of it are still paper.
- **Stage Line** (`rgba(255,255,255,0.028)`): the same 64px fold lattice as the sheet, drawn in light instead of shadow — the same paper seen from the other side.
- **Veil** (`--veil`: `rgba(20,18,12,0.44)`): the window dimmed while a file is being written. It is deliberately **not** `--stage` and does not break the One Dark Surface Rule: it is the warm-dark tint of the shadow tokens taken to the size of the frame — a shadow, not a material — and it is transient, existing only for the length of a job. A card resting on it takes `--lift-stage`, for the same reason a card on the table does: `--lift` at 6% alpha is invisible against anything this dark.
- **Lift Stage** (`0 2px 6px rgba(0,0,0,0.5), 0 16px 44px rgba(0,0,0,0.45)`): the frame's shadow on the table, and the shadow of any paper card resting on it. `--lift` is warm and 6% alpha, which is invisible against `#23211e`; this is its dark-surface counterpart, not a replacement.
- Text is never set directly on the table. Anything readable — an error, the unplayable-format explanation — sits on a raised sheet card (`.stage-say`) over it.

### Named Rules

**The One Dark Surface Rule.** `--stage` is licensed for the video viewing area and nothing else. It is not a dark mode, not a "hero" background, and not available to any panel that holds text. If a second dark region appears, the table stops reading as a different material and becomes a theme.

**The Single Foil Rule.** Gold appears once per screen, on the one action that commits work. The build enforces this by handoff, not by discipline: while a job runs, the commit button is `disabled` (and drops to `--mountain-fill`) *and* covered by the veil, and the foil moves to the progress fill — which is then the only gold on screen, inside the only card that accepts input. When you add a surface, ask which element *commits*; everything else is ink, paper or fold.

**The Two-Fold Rule.** Mountain marks controls that remove weight. Valley marks controls that preserve quality. Rows that change neither carry no mark at all — they render an empty `aria-hidden` span to hold the grid column. Assigning this wrong is a real defect, not a nuance: it was caught in review. The current, correct assignment is enumerated in Components below.

**The Neutral Selection Rule.** Selection state is neutral (`--sheet-sunk` + a 2px ink underline). Valley blue is *not* allowed to mean "selected". If blue signalled both "preserves quality" and "chosen", the two-fold system would stop meaning anything.

**The Hairline-Is-Not-Meaning Rule.** `--mountain` at 1.99:1 draws structure. `--mark-mountain` at 4.26:1 carries meaning. Never swap them: a fold line that carries semantics must be a mark, and a mark used as a rule is over-loud.

## Typography

**Display Font:** Archivo (variable, weights 400–700, width axis 62%–125%), fallback `system-ui, sans-serif`
**Body Font:** Archivo — the same family, no second text face
**Measurement Font:** Martian Mono (variable, weights 400–700, width 75%–112.5%), fallback `ui-monospace, monospace`

**Character:** Archivo is used as a *width* instrument, not just a weight one. Headings and uppercase micro-labels push the width axis out (108%–118%) so short, all-caps runs hold the line like set type rather than looking cramped; body text sits at the default width. Martian Mono is technical, boxy and slightly condensed here (82%–88%) so long numeric strings fit narrow columns without wrapping.

Both faces are **self-hosted woff2** in `src/renderer/src/assets/fonts/`, split into latin and latin-ext subsets with explicit `unicode-range`, and declared `font-display: block`. This is a hard constraint, not a preference: the renderer's CSP (`src/renderer/index.html`) is `default-src 'self'`, which blocks every external CDN. A future contributor who reaches for Google Fonts will get a silent fallback to `system-ui`.

### Hierarchy

- **Display** (600, 34px/1.08, width 118%, `-0.02em`, `text-wrap: balance`): the empty-state headline only — "Haz que quepa, sin arruinarlo" and its probing counterpart.
- **Headline** (600, 19px, width 108%, `-0.012em`, `overflow-wrap: anywhere`): the loaded file's name in the identity card. Wraps mid-token because filenames do.
- **Title** (600, 12px, width 108%, `0.14em`, uppercase, `--ink-2`): section headings — "Lo esencial", "Todo lo demás". The deploy toggle and the action buttons use the same construction at `0.13em`; the wordmark uses 13px / width 112% / `0.16em`.
- **Body** (400, 14px, from `body`): default for everything unstyled. Notice text is 13px/1.5; the empty-state paragraph is capped at **44ch** and set in `--ink-2`.
- **Label** (500, 13px): the crease row's control name.
- **Caption** (400, 11px/1.35, `--ink-3`): the crease row's one-line hint under the label.
- **Micro** (500, 9px, `0.1em`, uppercase, `--ink-3`): spec keys in the identity card, mass-bar keys, the fold legend (at `0.06em`). This is the smallest type in the system and it is *only* ever a label — never a value, never a sentence.
- **Measurement** (Martian Mono, width 88%, `tabular-nums`): identity card values at 13px, crease value column at 12px, number inputs at 12px, mass-bar values at 15px, the strong "quedará en" figure at 19px/600 (17px under 1000px), the result figure at 17px.
- **Measurement small** (Martian Mono, width 82%, `tabular-nums`): run stats, the percentage drop chip, technical error detail, inline `<code>`.
- **Measurement sub** (Martian Mono, width 82%, 10px, `tabular-nums`, `--ink-3`): the kilobyte line under a megabyte figure (`.mass-sub`). Smaller than *Measurement small* and the only mono in `--ink-3`, because it must read as the same number at higher precision rather than as a second fact. It is a value, not a label, so it stays mono and never becomes *Micro*.

### Named Rules

**The Measurement-Only Mono Rule.** Martian Mono is permitted on numeric values, units, and technical strings (file paths, ffmpeg output) — and nowhere else. Labels, hints, headings, button text and prose are Archivo. Mono creeping onto labels was a defect caught in review; if you are about to set a *word that names a thing* in mono, you are making that mistake again. Note the corollary the build already honours: the density chip's text is a word (`holgado` / `justo` / `apretado`), so it is set in Archivo 600 uppercase, while the `−45%` chip beside it is a number and is set in mono.

**The Tabular Column Rule.** Every mono run carries `font-variant-numeric: tabular-nums`, and `.crease-value` additionally has `min-width: 74px` with `text-align: right`. Numbers that update live must not shift the layout under them.

**The Self-Hosted Rule.** New faces must ship as subsetted woff2 under `src/renderer/src/assets/fonts/` with a matching `@font-face` in `tokens.css`. No `<link>` to a font CDN will ever load.

## Layout

**Frame.** The window is 1180×780 by default with a hard minimum of 900×620 (`src/main/index.ts`). `body` sets `overflow: hidden`; the whole app is a three-row grid (`auto / minmax(0,1fr) / auto`) at `height: 100%` — a fixed header, one middle band, and a fixed bar at the foot. Only the middle scrolls, and only in the module that scrolls. There is no mobile: the only responsive range is the resize range, with a single breakpoint at `max-width: 1000px`.

**Rows two and three belong to the module.** `App.tsx` owns the header; each module renders *both* remaining rows itself — Reducir gives `.scroll` + `.mass`, Reproducir gives `.stage` + `.transport`, Editar gives `.editor` (which splits internally into table and bench) + its own `.mass` bar. Both modules stay mounted at all times and the inactive one is hidden, so options, scroll position and playhead all survive a switch. Their wrappers are therefore `display: contents` (`.module`), which erases the wrapper from layout and lets its two children speak to the window grid directly; a normal wrapper would collapse both rows into one and break the fixed-frame promise. The hidden module is `display: none`, which takes its focus stops and its keyboard shortcuts out with it.

**The fold lattice.** The app background is two `repeating-linear-gradient`s over `--sheet`: one at 60° (`rgba(120,116,106,0.09)`, 1px line every 64px) and one at 0° (`rgba(120,116,106,0.07)`, same rhythm). It is the paper, not a grid to align to.

**Content column.** `.stack` is `max-width: 880px`, centred, padded `44px 28px 68px`, with `28px` between sections. Under 1000px it becomes `28px 18px 44px`.

**Spacing rhythm.** A seven-step scale on roughly a 1.5× curve: **4 / 8 / 12 / 18 / 28 / 44 / 68px** (`--s1`…`--s7`), plus `--crease: 1px` for every fold-line width and for the gaps that reveal one. In practice the interface lives on s2–s5; s6 and s7 are the stack's outer breathing room, and s1 is unused (see Known inconsistencies).

**The crease row grid.** Four columns: `26px | minmax(0,1fr) | minmax(0,1.25fr) | auto` with a 12px gap, `12px 18px` padding, and a `52px` minimum height. Column 1 is the fold mark, column 2 is label + hint, column 3 is the control, column 4 is the computed value. Rows with no computed value get `.crease-novalue`, which drops the fourth column entirely — the value column exists only when it says something the control cannot say for itself (output dimensions, MB, kbps, trimmed duration).

**Under 1000px.** The crease row collapses to two columns (`22px | 1fr`); the control and the value both reflow into column 2, and the value flips to left-aligned. The mass bar tightens to `12px 18px` with an 18px gap and drops its strong figure from 19px to 17px.

**Other grids.** The identity card's spec list is `repeat(auto-fit, minmax(112px, 1fr))` with an `18px 12px` gap. Paired inputs (trim from/to) are a plain `1fr 1fr` at 8px.

**Scrollbar.** Chromium's default scrollbar reads as "browser inside a desktop app", so it is redrawn as one more fold: 11px wide, transparent track, thumb in `--mountain` with a 3px `--sheet` border and a 34px minimum, darkening to `--ink-3` on hover and `--ink-2` on active.

### Named Rules

**The Fixed Frame Rule.** Header and foot bar never scroll. In Reducir the foot bar is the mass bar — the product's promise ("ahora → quedará en") — so it stays on screen at every scroll position and in every state, including the empty state, where it degrades to a single line of 10px text. In Reproducir the row is the transport instead, and the mass bar is deliberately absent: no compression is being planned there, and quoting a "quedará en" figure beside a video that is only being watched would invent a job nobody asked for. The rule is *there is always a fixed bar that says where you are*, not *there is always a mass bar*.

## Elevation & Depth

Depth here is paper physics, not Material elevation. There is one shared shadow token, one bespoke upward shadow, one filter-based shadow for clipped shapes, and a family of 1px inset hairlines that stand in for borders wherever `clip-path` would cut a real one off.

### Shadow Vocabulary

- **Lift** (`--lift`: `0 2px 4px rgba(20,18,12,0.06), 0 8px 22px rgba(20,18,12,0.08)`): the only lifted-panel shadow. Three uses: the identity card, the crease stack, the result panel. The working card is the exception and takes `--lift-stage`, because it rests on the veil. Two stops — a tight contact shadow and a wide ambient one — with a warm-dark tint rather than neutral black.
- **Mass bar shadow** (`0 -3px 14px rgba(20,18,12,0.05)`): cast upward, because the bar sits below the content it shadows.
- **Foil drop-shadow** (`filter: drop-shadow(0 1px 2px rgba(20,18,12,0.14)) drop-shadow(0 4px 10px rgba(20,18,12,0.12))`): the commit button. It must be a `filter`, not a `box-shadow` — `clip-path` clips `box-shadow` away, and `filter` is applied after the clip so it traces the parallelogram. On `:active` the filter is removed entirely, which reads as the button pressing into the sheet.
- **Inset hairline** (`box-shadow: inset 0 0 0 var(--crease) <fold colour>`): the substitute border for clipped and grouped shapes — the quiet button, the switch track, the segmented group, the notices. Inset shadows paint *inside* the clip and survive it.
- **The dog-ear** (`.identity::after`): a 17×17 square in the top-right corner filled with `linear-gradient(225deg, var(--sheet-sunk) 50%, transparent 50%)` and bordered left and bottom with a 1px `--mountain` fold line. The card's corner is drawn as folded, not implied by a shadow.

### Named Rules

**The Drop-Shadow-After-Clip Rule.** Any clipped (parallelogram) element that needs to sit above the sheet uses `filter: drop-shadow(...)`. Any clipped element that needs an edge uses an *inset* box-shadow. An outer `box-shadow` on a clipped element renders nothing; if you write one, it is dead code.

## Shapes

**Zero radius, everywhere.** Nothing in this system has a rounded corner. `.num` even sets `border-radius: 0` explicitly to override the UA default on `input[type=number]`. There is no radius scale because there is no radius.

**The parallelogram.** The recurring silhouette is a sheared rectangle produced with `clip-path: polygon(...)` — never `transform: skew()`. The distinction is load-bearing: `clip-path` cuts the container without deforming a single letter inside it, and `skew` would tilt the type. Two idioms are in use:

- **Notch idiom** (buttons, switch track): a local `--notch` custom property drives `polygon(var(--notch) 0, 100% 0, calc(100% - var(--notch)) 100%, 0 100%)`. `.act` sets `--notch: 13px`; `.switch` sets `--notch: 9px`; the chips (`.mass-drop`, `.density`) hard-code `8px`.
- **Percentage idiom** (small marks and knobs): `polygon(30% 0, 100% 0, 70% 100%, 0 100%)` on the mountain mark, `28%/72%` on the switch knob, `32%/68%` on the range thumb.

**The one legal skew.** `.crease-mark-valley` uses `transform: skewX(-17deg)` on a 22×13 empty box with a 1.5px `--mark-valley` border thickened to 4px on top. It contains no content, so nothing is deformed. This is the single exception and it does not license skewing anything that holds text.

**Shape before colour.** Mountain is *filled*, valley is *outlined*. That difference is the primary channel; the grey/blue difference is the secondary one. Under colour-vision deficiency, two pale parallelograms of different hue are the same object — the fill/outline split is what keeps them distinguishable.

**Line as fold.** Group separation is done by 1px gaps that reveal a `--mountain` container background (`.creases` and `.seg` both use `gap: var(--crease)` over a mountain-coloured parent) rather than by per-child borders. The result reads as a stack of panels creased apart.

### Named Rules

**The Shear-Never-Text Rule (binding).** The parallelogram geometry applies to containers, rules, tabs, chips and buttons. It never applies to a text line or a numeric column. Implement it with `clip-path`; if you find yourself reaching for `transform: skew()` on anything that renders characters, stop.

**The Zero Radius Rule.** No `border-radius` anywhere, including new components, including third-party ones. If a control arrives rounded, square it.

## The mark

The application has an official logo, authored by the user and versioned at `Logo/Logo oficial 2.png` (1387×1387 RGBA): a rounded square in deep blue, its border and its four outward arrows drawn in brushed gold, over a pixel grid at the centre, all on a near-black textured field. It is a rendered object with bevels, gloss and a glow — the visual language of an operating-system icon, not of the sheet.

**Every place the application shows its face.** All of it derives from that one file, via `npm run icon` (`build/make-icon.mjs`):

| Output | Where it lands |
|---|---|
| `build/icon.png` (512×512) | the `.exe`, the desktop and start-menu shortcuts, the taskbar, the installer and uninstaller icons — electron-builder derives every `.ico` size from it |
| `build/installerSidebar.bmp` (164×314) | the assistant's side panel, the mark on `--ink`; the one size and format NSIS accepts |
| `src/renderer/src/assets/logo.png` (256×256) | inside the window: 22px in the wordmark (`.wordmark-mark`), 128px as the empty-state figure (`.packet-figure`) |

One asset serves both in-window sizes, at 256px, so a 200% display still has real pixels under the 128px figure.

**Why it is allowed inside a system that forbids everything it is.** The logo is round-cornered, dark and glossy; the sheet is square, light and matte. The reconciliation is not that the logo was tamed — it is placed whole, with its own background, no border, no shadow, no clip — but that it is *quoted rather than assimilated*. It appears exactly twice, always as the application's own face, never as a surface, a control, or a decoration. The empty state shows it because that screen is the first thing seen after the icon that was double-clicked, and the two images have to be the same image.

It replaced the foil packet — a hand-drawn SVG of a folded parcel over an unfolded sheet — in both places. That drawing is in the history (`Packet.tsx` and `IconPacket`, removed in 0.2.6) and its removal has one incidental benefit: gold now appears **only** on the commit button, which makes the Single Foil Rule literally true for the first time.

**The background is not cut.** Removing the near-black field to get transparent corners was tried and rejected: the artwork's gloss spills past its own silhouette, so a flood-fill cut leaves a ragged edge worse than the honest square. `decodePng` handles alpha correctly, so a future logo delivered with transparency needs no code change.

### Named Rules

**The Quoted-Mark Rule.** The logo is placed, never restyled and never borrowed from. Its gold is not a token, its blue is not in the palette, its radius licenses no other radius, and its dark field is not a second `--stage`. Two placements exist — the wordmark and the empty-state figure — and a third needs a reason as good as those two. Equally: never regenerate `build/icon.png` from anything but the file in `Logo/`; `npm run dist` and `npm run release` run the generator before packaging precisely so the shipped icon cannot drift from it.

## Components

### Buttons — `.act`

Two variants, one shape. Both are inline-flex with an 8px gap to their icon, `11px 26px` padding, 12px/600 uppercase Archivo at width 108% and `0.13em`, clipped to a 13px-notch parallelogram, transitioning `background` and `color` over 160ms.

- **Commit** (`.act-commit`) — the foil one. Default: 103° gold gradient, `--foil-ink` text, two-stop drop-shadow filter. **Hover:** brighter gradient (`#f2d670 / #e2bd47 / #c09a2e`). **Active:** darker gradient (`#c8a63a / #b89428 / #96781f`) with the filter removed. **Disabled:** `--mountain-fill` background with `--ink-2` text (7.2:1) and `cursor: not-allowed` — deliberately *not* faded, because the disabled path is reached when FFmpeg is missing and the label still has to be readable. **Focus:** `inset 0 0 0 2px var(--ink)`.
- **Quiet** (`.act-quiet`) — raised sheet, `--ink` text, 1px inset mountain hairline. **Hover:** `--sheet-sunk`. **Active:** `--mountain-fill`. **Focus:** same inset ink ring. A `:disabled` rule exists (`--ink-3`, not-allowed) but **no quiet button in `App.tsx` is ever rendered disabled** — treat that rule as provisioned, not proven.

Usage in the built app: commit appears exactly once per screen — "Elegir archivo" in the empty state, "Comprimir"/"Comprimiendo" in the mass bar, "Capturar" in the transport, "Exportar" in the bench's foot bar, "Ver el resultado" on the finished working card (the card is the whole screen while it is up, and the commit button behind it is under the veil). One per screen holds because the three modules are never on screen together. Quiet appears on "Otro archivo" (header), "Detener" and "Cerrar" (working card), "Ver en la carpeta" (result panel) and every tool in the bench's toolbar (`.act-mini`).

**`kbd` inside an action.** `.act kbd` prints a shortcut on a full-size action the same way `.tkey kbd` does on a transport key — mono, 9px, width 82% — but it inherits the button's own ink at `opacity: 0.8` instead of taking `--ink-3`: on foil, the grey misses 4.5:1, and a second colour on the screen's only gold would muddy it. Below 0.8 the 9px text falls under 4.5:1 as well.

### Segmented — `.seg` (the primary control)

The workhorse: ten of the seventeen crease rows use it. A wrapping flex row of buttons separated by 1px gaps over a `--mountain` background, with a matching 1px inset hairline around the group.

**The Wrap Rule.** A flex item never shrinks below its own text, so a group whose labels outgrow the control column pushes its last button clean out of the card — which is exactly what the seven-option encoder-effort group did at every window width. The group therefore wraps (`flex-wrap: wrap`) and every button grows into its line (`flex: 1 1 auto`). A grid with `auto-fit` also stops the overflow, and it was tried and rejected: it leaves the tail of the last row as empty `--mountain` cells, and an empty cell inside a control reads as a broken control. Wrapping is the fallback, not the plan — a group that needs more than about six short labels is a scale, and scales are sliders.

- **Default:** raised sheet, `--ink-2`, 11px/500 at `0.03em`, `7px 8px` padding, `white-space: nowrap` with `overflow: hidden; text-overflow: ellipsis` as a last-resort guard, 140ms transition. Labels never break mid-word: «75 %» split across two lines reads as two things.
- **Hover** (`:not([aria-checked='true'])`): `#f1efe9` and `--ink`. The hover fill deliberately differs from the selected fill — if they matched, hovering would look like choosing.
- **Active** (`:not([aria-checked='true'])`): `--mountain-fill`.
- **Selected** (`[aria-checked='true']`): `--sheet-sunk`, `--ink`, weight 600, plus `inset 0 -2px 0 var(--ink)` as an underline. Neutral by rule — see The Neutral Selection Rule.
- **Focus:** `inset 0 0 0 2px var(--ink), inset 0 -2px 0 var(--ink)` — the ring *composes with* the selection underline instead of replacing it.
- **Disabled:** styled (`--ink-3`, not-allowed) but unreachable — `Segmented` exposes no `disabled` prop.

**Accessibility:** `role="radiogroup"` with an `aria-label`; each option is `role="radio"` with `aria-checked`. Roving tabindex — the selected option is `tabIndex={0}`, all others `-1`, so the deployed sheet costs eleven tab stops instead of forty. Arrow Right/Down and Left/Up wrap the selection and move focus with it (via `requestAnimationFrame`), matching native radiogroup behaviour: focus follows selection.

### Switch — `.switch`

A 46×24 clipped track (9px notch) with 3px padding and an 18×18 clipped knob.

- **Off:** `--mountain-fill` track, 1px inset `--mountain` hairline, knob on raised sheet with its own 1px hairline.
- **Hover:** track darkens to `#ddd9d0`.
- **On** (`[aria-checked='true']`): track fills with `--valley`, hairline becomes `--mark-valley`, knob translates `22px` over 200ms.
- **Active:** knob squashes to `scaleY(0.9)` (composed with the translate when on).
- **Focus:** `inset 0 0 0 2px var(--ink)`.
- **Disabled:** `opacity: 0.5` + not-allowed — styled but unreachable; `Switch` exposes no `disabled` prop.

**Accessibility:** `role="switch"` with `aria-checked` and an `aria-label`. Three instances: two-pass (valley), strip metadata (mountain), faststart (none).

### Fields — `.field` / `.num` / `.field-unit`

A flex composite: a mono number input plus a static unit suffix. The wrapper carries a 1px `--mountain` border on raised sheet; the input inside has `border: none`; the unit suffix sits on `--sheet-sunk` with a 1px left fold line, 11px/500 Archivo at `0.05em`, and is `aria-hidden` (the input's `aria-label` already names the unit).

- **Focus:** `.field:focus-within` swaps the border to `--mark-valley` and adds `inset 0 -2px 0 var(--valley)` — a valley underline, echoing the fold that preserves quality.
- **Error / disabled:** none exist. Invalid input is prevented at the source instead (`Math.max` clamps in the change handlers), so the field has no error state to render.

Used for: target size (MB), video bitrate (kbps), trim from/to (s).

### Range slider — `Slider` / `.slider`

WebKit pseudo-elements only (`::-webkit-slider-runnable-track`, `::-webkit-slider-thumb`) — legitimate, since the only runtime is Chromium inside Electron. A 3px `--mountain` track with a 15×15 ink thumb clipped to a parallelogram (`32%/68%`), `margin-top: -6px` to centre it. Disabled thumbs go `--mountain` (again unreachable in current composition). Below it, `.slider-ends` labels both extremes in 10px uppercase `--ink-3`; `ends` is optional and is omitted when the row already states the travel. `aria-valuetext` is required and spells the scale out in a sentence, because a bare CRF number or step index means nothing spoken aloud.

**When a lever is a slider rather than a segmented group.** The question the control answers decides it: *how much* is a slider, *which one* is a segmented group. Named steps do not make a scale categorical — encoder effort has seven names but they are one ordered axis, so it is a slider whose current step name lives in the value column. Codec, container and audio mode are genuinely different things, so they stay segmented.

Nine instances: calidad; esfuerzo del encoder; and, inside El reparto, bitrate de video, resolución, cuadros por segundo, bitrate de audio, and the two trim rails.

### Crease row — `.crease` (signature component)

The unit of the whole interface, and the carrier of the fold semantics.

- **Structure:** mark · (label + hint) · control · value. `kind="none"` renders `<span aria-hidden="true" />` in the mark slot to hold the column.
- **Mark, mountain:** 22×13 solid `--mark-mountain` parallelogram (`30%/70%`), `role="img"`, `aria-label="Quita peso"`.
- **Mark, valley:** 22×13 transparent box, 1.5px `--mark-valley` border with a 4px top edge, `skewX(-17deg)`, `role="img"`, `aria-label="Preserva calidad"`.
- **States:** none. Crease rows are containers, not controls — no hover, no focus, no active. Interaction lives entirely in the control they hold.
- **`hidden`:** a row can be declared absent for the current mode and renders `null`. It exists because four levers move into El reparto while the target weight is the input, and burying a fifty-line row inside a conditional at the call site hides which lever it is. One lever, one control, always: a row that moved must be hidden where it came from, never duplicated.

**Assignment rules for `kind` (get this right; it was a review defect):**

| `kind` | Meaning | Test | Current rows |
|---|---|---|---|
| `mountain` | Moving this control *reduces output weight* | "Can I push this to make the file smaller?" | Peso objetivo, Bitrate de video, Resolución, Códec, Recorte, Esfuerzo del encoder, Cuadros por segundo, Audio, Códec de audio, Bitrate de audio, Canales, Frecuencia de muestreo, Quitar metadata |
| `valley` | Moving this control *protects perceived quality* (usually at a cost in time or size) | "Does this spend something to keep the picture intact?" | Calidad, Dos pasadas |
| `none` | Changes neither weight nor quality | "Is this a container/plumbing choice?" | Cómo decidir el peso, Contenedor, Aceleración por hardware, Optimizar para reproducción web |

Two subtleties the code already encodes and new rows must respect: *Códec* is mountain because a better codec buys smaller output, not because it is a quality knob; *Aceleración por hardware* is `none` even though its hint admits it is "algo más pesado", because it is a speed/plumbing choice rather than a weight lever the user pulls for weight.

Four of the mountain rows — Resolución, Cuadros por segundo, Bitrate de audio and Recorte — are not always in the sections listed above: in `targetSize` mode they move into El reparto and are `hidden` where they normally sit.

### El reparto — `.ration` / `.split`

Only in `targetSize` mode, and only because that mode has something to confess: the weight is an input, so something has to give, and what gives is the video bitrate — silently, until this panel. It answers two questions in order: *what changed to reach this weight*, and *is that enough*.

- **Structure:** a raised sheet (`--lift-sm`, no shear — it holds a measure) carrying a sentence, a two-key line, and the split bar; then the four crease rows that moved here, in their normal `.creases` container so the panel reads as one continuous sheet.
- **The sentence, `.ration-say`:** states the derived bitrate and then answers, in words, the question this mode always provokes: *«bajar la resolución, los cuadros o el audio no cambia el peso — cambia cuánto le rinde ese bitrate»*. That sentence exists because the confusion is guaranteed, not hypothetical: a user who drags a slider and sees the weight sit still concludes the slider is broken. When the target is unreachable the sentence says so instead, naming the 100 kbps floor.
- **The headroom gauge, `.gauge`:** the only reading that moves when the weight cannot. An 8px track with a fill scaled to `headroom / 1.5` and a 1px `--ink-2` tick at the codec's reference (66.67%): left of it the picture is starved, right of it it is comfortable. The verdict word sits above it, tinted (`.ration .verdict-*`, nested to outrank `.ration-say strong` and `.split-keys strong`); the fill carries the same three hues as reinforcement, never as the sole carrier — length and word both say it too. **No numbers on it, ever.** `BPP_REFERENCE` is now measured rather than assumed, but the reference it anchors is still a model of typical material — the residual against real encodes runs to tens of percent, so a percentage on the gauge would be invented precision; a bar that moves says the only thing actually known — more or less than before, and which side of the reference. The exact facts go in `.gauge-note` beneath, where they are exact: kbps, dimensions, frame rate.
- **The split bar, `.split`:** the only two destinations of the budget, to scale, with their keys above it (left/right, mapping to the segments). 16px tall, 1px `--sheet-sunk` gap, `flex-grow` set from bytes.

**The bar's two shares are marks, not hairlines.** It carries information, so it may not use the fold hairlines — `--mountain` measures 1.99:1 on raised sheet and is structural only. It uses the semantic marks, which clear 3:1 and also happen to say the right thing: the target squeezes the video share (mountain), and the audio share is what you protect (valley). Solid `--mark-mountain` for video; `--valley` fill with a 1px `--mark-valley` inset for audio — **filled against outlined, exactly as the row marks do it.** Both marks solid measured 1.16 against each other: same lightness, different hue, therefore the same object to anyone who cannot separate the tints. Form first, colour second, here as everywhere.

- **Trim, `.rails`:** two rails, because a start and an end are two decisions and a native range input has one thumb. Their captions (`.rail-cap`, 10px mono) carry the live times, so the rails need no `ends`.

**Weight and bitrate are one number with two faces.** The Bitrate de video row is not a second setting that could disagree with the MB field: it writes back through `targetSizeForVideoKbps`, the exact algebraic inverse of `budgetForTargetSize`, so dragging the bar moves the target and typing the target moves the bar. Both directions live in `shared/budget.ts`, next to each other — put one of them in the renderer and they drift. The MB field steps in tenths for the same reason: on a short clip a whole megabyte is hundreds of kbps, and the bar would snap. Its ceiling is the source file's own average rate, because asking for more than that only makes an output heavier than the input.

### Fold legend — `.legend`

Two 9px uppercase items pairing the two marks with their meanings ("quita peso" / "preserva calidad"), pushed right in the section head. Rendered once per crease section, so it appears twice when the sheet is deployed. The marks here are bare `<i>` elements with no `role`/`aria-label`, because the adjacent text already says it.

### Identity card — `.identity`

Raised sheet, `18px 28px` padding, `--lift`, the drawn dog-ear in the top-right, a 19px filename that wraps anywhere, and an auto-fit spec grid of six key/value pairs (micro-label above mono value). No states — it is a readout.

### Mass bar — `.mass` (signature component)

The persistent footer, and the product's proof. Raised sheet, 1px top fold line, upward shadow, `12px 28px` padding, 28px gaps. Reads: **Ahora** `<size>` → **Quedará en** `<size, 19px/600 mono>` `<±% chip>` `<estimado|calculado>` … **Video a** `<kbps>` `<density chip>` … commit button.

Both readout groups are `aria-live="polite" aria-atomic="true"`, so a screen reader hears the new estimate as one utterance when any lever moves. When no file is loaded the whole bar collapses to one 10px line: "Ningún archivo cargado. Suelta un video en la ventana para empezar."

**The weight figure — `.mass-fig` (`Mass` in `Scaler.tsx`)**. Every weight in the bar and in the result panel is a two-line stack: the rounded figure (`.mass-v`) over the exact kilobyte count (`.mass-sub`) in 10px `--ink-3`. A column, not a row: `formatBytes` rounds to one decimal, so "4.9 MB" hides up to a hundred kilobytes and two consecutive lever moves can leave the headline unchanged — the KB line is the one that always answers. Putting them side by side would make them compete for the same reading; stacked, the MB stays the number you decide with.

Three rules the stack depends on. It is `white-space: nowrap` — the thousands separator is a narrow no-break space (`U+202F`, not a period, which would read as a decimal beside "4.9 MB"), but the space before `KB` is an ordinary break opportunity and a figure split across two lines stops being a figure. It is `flex: none`, so a tight bar squeezes the gaps and not the number. And `.mass-sub` is `aria-hidden`: the group is a single live region, and announcing the same weight twice per update is worse than announcing it once. `formatKilobytes` returns `null` below 1 MiB, where `formatBytes` is already saying KB or B and the second line would only repeat it.

### Result panel — `.result` / `.result-acts`

Raised sheet, `--lift`, `18px 28px`. Reads `<input size>` → `<output size>` `<−% chip>` in mono, then two quiet actions grouped at the right by `.result-acts` (`margin-left: auto`, 12px apart) — **Ver el resultado** first, **Ver en la carpeta** second. Both sizes are `.mass-fig` stacks, so the panel says the delivered weight in KB as well; the panel keeps its own 17px scale through `.result-figure .mass-v` rather than inheriting the bar's 15/19px pair. The order is the argument: what follows compressing is not filing the file away, it is checking that it was not ruined, and the figure on the left says how much it weighs, not how it looks.

**The panel is the record, not a second poster.** The working card is the moment — read once, then dismissed — and this is what is left when it is gone. Without it, closing the card without deciding would leave the compressed file with no way to reach it from the window at all.

**Ver el resultado** loads the output as *the* loaded file and switches to Reproducir. It deliberately does not open a second file alongside the first: the window holds one file and two modules, and holding two would leave the user unsure which one the commit button is about to compress. The cost is that the result panel disappears when you go and look — accepted, because the identity card at the top immediately states the new weight, which is the same comparison with less to remember.

### Chips — `.mass-drop`, `.density`

`2px 9px`, clipped with an 8px notch, no radius.

- **`.mass-drop`** — the percentage delta. Mono at width 82%. Valley fill + valley ink when the file shrinks; `#f3ddd0` / `#6b2f18` (`.mass-drop-up`) when the estimate goes *up*.
- **`.density`** — the bits-per-pixel readout, and the one chip driven by a computed scale. `estimate.ts` computes bits-per-pixel against the same `referenceBpp` the weight estimate uses — `BPP_REFERENCE = 0.08`, adjusted for codec, preset, hardware encoder and the source's own complexity — and buckets it: **ratio ≥ 1 → `holgado`** (`#24512c` on `#d6e8d4`), **≥ 0.5 → `justo`** (valley ink on valley), **otherwise `apretado`** (`#6b2f18` on `#f3ddd0`). The class name is interpolated as `density-${estimate.density}`, so **any new `Density` value requires a matching `.density-*` rule or the chip renders unstyled.** Set in Archivo 600 uppercase, not mono — it is a word, not a measurement.

### Notices — `.notice` / `.notice-quiet`

A flex row: icon (flex-none, 2px top nudge) + text at 13px/1.5, `12px 18px` padding, 1px inset hairline.

- **Alert** (default): `--alert-fill` background, `#6b2416` text, `--alert` icon, `#e0bdb1` hairline. Used for missing FFmpeg, load/encode errors, unreachable target, and update failure.
- **Quiet** (`.notice-quiet`): valley fill, valley ink, valley-line hairline. Used for "compression stopped, original intact". It no longer carries update-ready or update-downloading: those live on the header button, which is visible with no file loaded — the notices were not.

### Update button — `.bar-update`

One quiet button beside the wordmark, carrying all five update states in its own label: *Buscar actualizaciones* → *Buscando…* → *Descargando N %* → *Reiniciar e instalar X* → *Ya estás al día* (five seconds, then back). Errors turn it into *Reintentar la búsqueda*; the alert notice in the body still supplies the technical detail.

- **Placed by ownership, not by symmetry.** It sits at the left, next to the title, because it acts on the *application*; `Otro archivo` sits at the right because it acts on the *file*. The version note stays at the far right as a label, not a control.
- **It is the only place update state is told.** The body notices were removed rather than kept in sync — the empty state renders no body at all, so a user who had opened the app without a file could never learn a new version existed.
- **The working animation:** `@keyframes sweep` runs a 2px `--mark-valley` fold across the foot of the button, clipped by the button's own parallelogram. Nothing spins in this world; the piece that is working says so itself, the same way the mark breathes while a file is probed. Under `prefers-reduced-motion` the fold stops but stays at full width — silencing it would leave the button mute, which is worse than still.
- **Disabled is now reachable.** `.act-quiet:disabled` was provisioned but never rendered; while checking or downloading, this button is genuinely disabled.
- Error notices reveal technical detail behind a `.link` toggle ("Ver detalle técnico"), rendered into `.detail` — mono at width 82% on `rgba(255,255,255,0.6)` with `overflow-wrap: anywhere`.

### Progress — `.progress-track` / `.progress-fill`

A 5px `--mountain-fill` track with an overflow-hidden foil gradient fill. The fill is always `width: 100%` and is driven by `transform: scaleX()` with `transform-origin: left center`, transitioning `320ms linear` — animating `width` would force layout on every frame of a job that runs for minutes. `role="progressbar"` with `aria-label`, `aria-valuenow` (rounded), `aria-valuetext`, `aria-valuemin=0`, `aria-valuemax=100`.

### Working veil — `.working` / `.working-sheet` (signature component)

The job in progress: a fixed `--veil` scrim over the whole window (`z-index: 40`, `backdrop-filter: blur(2px)`) with one raised paper card centred on it (`min(440px, 100%)`, 28px padding, `--lift-stage`).

**One component, two callers** (`Working.tsx`). Both modules that write files use it — Reducir to compress, Editar to export the montage — with the same gestures and different words, passed in as `labels` and the two notes. It owns the focus trap, `Escape` and the four faces; the caller owns the job. Two similar cards would have drifted into two different cards. When the input weight is meaningless (a montage draws from several files) the result face drops the arrow and simply says what the new file weighs.

**It is a block, not a bulletin.** This used to be a `.run` row inside the sheet, between the levers, and from there it asked for two incompatible things at once: watch this number, and do not touch anything around it. Moving a lever mid-job changes nothing about the file being written and makes the user believe it did; loading a different file is worse, since the identity card would then describe a video other than the one going to disk. The veil says all of that in the only vocabulary that cannot be misread — nothing else is reachable.

**It has two faces, and it does not leave between them.** The card used to vanish the instant FFmpeg finished, and the outcome — with the only two things anyone wants to do with it — appeared at the foot of the scrolling body, behind the whole sheet of levers. Whoever had been watching a percentage in the middle of the screen was left watching an empty middle. So the card stays and changes contents: **Listo** (Headline), the *output* file name in the mono line — it is a new file, and it is the one to look for in the folder — the `<input> → <output> <−% chip>` figure at the result panel's 17px scale (`.working-result`), then **Ver el resultado** as the commit action, **Ver en la carpeta** quiet beside it, and **Cerrar** pushed to the far edge by `.working-close`, because closing is not a third thing to do with the file, it is stopping doing them. A stopped job and a failed one get the same treatment — **Se detuvo la compresión** / **No se pudo comprimir**, one 13px line of `.working-say` saying what happened to the original, and **Cerrar** — instead of dropping the user back into the levers with a notice somewhere below the fold.

Reads while running: **Comprimiendo** (Headline), the file name (mono 11px, ellipsis, full path in `title` — the veil covers the identity card, and a progress bar with no name could belong to anything), the percentage at the 34px display step in mono with a `--ink-3` `%` sign, the written-so-far weight as a micro-label/mono pair, the progress bar, then speed and remaining time in *Measurement small*, then **Detener** with one 11px line beside it: stopping does not touch the original. Before FFmpeg reports a speed the stats line says `arrancando` rather than leaving a gap that reads as a hang.

- **The 34px figure is the empty state's display step, spent on a number instead of a sentence.** These are the only two moments the window shows one thing at a time, so they share a scale. Mono, because it is a measurement.
- **It lives outside `.scroll`.** Inside, the thing the user is waiting on scrolled away with the levers.
- **Pointer, keyboard and drag are each closed separately.** The scrim takes the pointer. The keyboard is trapped by focusing the card's first action and cycling `Tab` among the card's own buttons on a capturing window listener — without it, three tabs reach the controls the veil is hiding and operate them blind. The trap is rebuilt when the card changes face, so the first key of each face (**Detener**, then **Ver el resultado**) takes the focus. `Escape` closes the card once the job is over and does nothing while it runs: stopping is a decision, and not one to be taken with the dismiss key. Focus returns to whatever held it (normally the commit button) when the card comes down — unless that element is no longer on screen, which is what happens when **Ver el resultado** hides the whole module. Drag events are stopped on the scrim, because they would otherwise bubble to the window's own drop handler and swap the file mid-job. Scrolling needs no handler: the scrim is not scrollable and `body` is `overflow: hidden`, so there is no chain to scroll.
- **Motion:** a 180ms `veil` fade under the card's 240ms `unfold` — the same drop-and-uncover keyframe the deployed crease rows use. Both resolve instantly under `prefers-reduced-motion`; what matters about this card is not how it arrives.

### Empty state — `.packet`

A centred 520px column: the 128px mark, a 34px display headline, a 44ch paragraph, and one commit button. The figure is `aria-hidden` and stays a `div` wrapping the image rather than the image alone, because both animated variants hang off that wrapper: `.dropping` (drag over the window) makes it `pulse`; `.is-probing` makes it `breathe`. In the probing branch the copy changes to "Leyendo el archivo" and its paragraph is `aria-live="polite"`.

The class is still `.packet` — it named the folded-parcel drawing that held this slot until 0.2.6, and renaming it would touch nine selectors to say the same thing. The figure it holds is now the logo; see The mark.

### Drag target — `.app.is-dragging::after`

A fixed, pointer-events-none overlay with a 3px `--foil` border and a `rgba(212,175,55,0.06)` wash. Drag depth is counted in a ref so nested `dragleave` events do not flicker it off.

### Module tabs — `.tabs` / `.tab`

Three flaps of the same sheet, in the header beside the wordmark: **Reproducir**, **Editar**, **Reducir**, in that order. They appear only once a file is loaded — with nothing loaded there is nothing to watch, cut or reduce.

**The table opens first, and every newly loaded file lands there** (`loadFile` sets the module, so the picker, the drop and **Ver el resultado** all agree). A file just dropped is not yet a decision: choosing how much weight to take off it means knowing what it is and how it looks, and opening on the levers asked for a target sight-unseen and only then offered a look. The tab order is that route written down — look, cut, compress — and it is the order the modules were already used in by hand.

`10px/600` uppercase Archivo at width 108% and `0.13em`, `8px 18px`, clipped to a 9px-notch parallelogram, `--ink-3` at rest. **Hover:** `--mountain-fill` + `--ink`. **Selected:** `--sheet-sunk`, `--ink`, `inset 0 -2px 0 var(--ink)` — the Neutral Selection Rule, same as `.seg`. **Focus:** composes the ring with the underline, same cascade reason as the segmented control, and the rule lives in the focus block at the foot of the file.

`role="tablist"` / `role="tab"` with `aria-selected`, `aria-controls` pointing at its own panel, roving tabindex, and Arrow Left/Right/Up/Down wrapping the selection with focus following it. Each module wrapper is the matching `role="tabpanel"` with `aria-labelledby`.

### The table — `.stage` (signature component)

The player's viewing area: a full-bleed dark band between header and transport, `display: grid; place-items: center`, `overflow: hidden`, carrying the 64px fold lattice in light (`--stage-line`) instead of shadow.

- **The frame** (`.stage-frame`) is sized in explicit pixels — width and height computed from the source dimensions and the measured stage, not `object-fit` — so the element box *is* the picture, which is what makes pan clamping and the 1:1 zoom exact. Zoom and pan are one `transform: translate() scale()` with `will-change: transform`, so neither forces layout. It is a *wrapper*, not the `<video>` itself: the video fills it at 100%/100% and anything laid over the picture (the focused region) is positioned inside it in percentages, so zoom and pan carry that overlay along without a line of arithmetic of its own. Its idle background is `--ink`, not a new black.
- **Zoom** is continuous, driven by the wheel (anchored on the cursor, via a non-passive native listener so Ctrl+wheel cannot zoom the whole interface instead), by the `−`/`+` keys at 1.25× per step, by a **slider** in the transport, and by two quiet mini actions: **Ajustar** (whole frame visible) and **1:1** (one video pixel per screen pixel — the only view where a compression block is its true size). The readout is the *effective* scale (`fit × zoom`), so a 4K file fitted into the window honestly reads 45%, not 100%.
- **The zoom range is the file's, not a constant.** The ceiling is 300% effective. The floor is `min(fit, 100%)` — you cannot pull back past the whole frame, because there is nothing under it to see, and you cannot go under 100% either. The two are one expression because a video *smaller* than the window is fitted *upward*: there the floor has to be 1:1, or the **1:1** button would be asking for a scale the slider forbids. Both ends are computed in effective percent and the slider is driven in that unit, so its travel is exactly the legal range and the number under the thumb is the number in the readout.
- **Pan** appears only when the image overflows the table: `cursor: grab`/`grabbing`, pointer-captured drag, offsets clamped so the picture can never be thrown off screen. A drag of more than 3px suppresses the click, so panning never toggles playback.
- **`.stage-say`** is a raised paper card centred over the table (absolutely positioned — as a grid child it would push the frame out of the way instead of covering it), max 520px, `--lift-stage`. It carries the unplayable-container explanation and its **Preparar vista previa** action, and while that runs, a `sweep` fold crosses the foot of the card (`.stage-work`) — the same "the piece that is working says so" idiom as the update button, and stopped-but-visible under reduced motion for the same reason.
- **`.stage-alert`** pins an error notice across the top of the table without covering the frame.

### Focus — `.focus-layer`

A **switch**, not a tool to arm. On, everything the table is showing comes out redrawn with an unsharp mask: `original + amount × (original − blurred)`. Off, it does not. There is nothing to draw, nothing to select, nothing to dismiss.

Its job is the softness the *zoom* introduces. At 300% the window is stretching one video pixel over nine, and what the eye reads is mush that belongs to the resampler, not to the encoder. The switch gives that edge back so the block underneath can be judged on its own terms.

It invents nothing. It raises the contrast already present at an edge, which is what the eye reads as sharpness — so it can sit beside a judgement about compression without falsifying it, *provided* the user remembers what it does. A strong amount also puts an edge on the side of a macroblock, and a block with a crisp edge looks like detail.

- **It covers the whole visible field.** It used to be a rectangle dragged over the frame. That was asking the user to crop a region inside the region the zoom had already cropped — twice for the same thing — and it left the rest of what they were looking at untreated. The layer's box is the `visible` rectangle: derived from the same pan and zoom that transform the frame, so it is not an estimate of what is on screen, it *is* what is on screen.
- **The comparison is the switch.** There is no **Comparar** button and no **Quitar** button. An enhancement with nothing to compare against always looks like an improvement — the answer is that turning it off *is* the comparison, on the same key, in the same place, with no extra vocabulary. Two buttons that each did half of what the toggle already does were two chances to wonder which one you wanted.
- **Turning it on pauses the video.** The mask needs a still frame — recomputing it 25 times a second to inspect something moving too fast to judge is work spent on nothing. A switch that is lit and visibly does nothing is exactly what makes a feature read as broken, so it does not exist: switching on stops the picture, and the enhancement is there.
- **The controls live in the transport, not on the picture.** `Fuerza` and `Radio` (`.tool-range`, 92px, in `.tool-set` label pairs) appear beside the toggle only while it is on. They used to sit in a paper card over the table, which covered exactly what was being examined — and, worse, did not work: the stage takes **pointer capture** on `pointerdown` to pan, and a captured pointer retargets the subsequent `click` to the capturing element, so dragging a slider panned the video and pressing a button did nothing at all. **Controls placed over a surface that captures the pointer are controls that do not work.** Nothing but the picture goes on the table.
- **It is redrawn on every new frame while paused**, so stepping with `J`/`K` walks the enhanced view forward one frame at a time — the single most useful thing it does, because the frame after a cut is the worst one in the video.
- **Sampled at the scale it is being *seen*, not the scale it is stored at.** The canvas is sized `source × fit × zoom × devicePixelRatio`, capped at 4× and at 3M pixels. The region is drawn into it with the engine's best filter and the mask runs on those already-stretched pixels, with the radius stretched by the same factor. This is the whole point: an unsharp mask applied *before* the browser's upscale is dissolved by it, and a radius left in source pixels would bite a finer and finer detail as you zoom in, never touching the edge the zoom actually smeared. The radius control stays in file pixels, because that is the unit the user is judging in. **The size cap is a `min`, not the floor of a `clamp`:** written as `clamp(…, 1, 4)` a floor of 1 silently restores the very case the cap existed to prevent — a 4K file fitted at 30% would grind all eight million pixels to display two hundred thousand.
- **Blurred with `ceil(radius × 3)` pixels of margin** that are then cropped off: blurring exactly the region would bleed its edges into the transparent nothing outside the canvas and ring it with a dark halo.
- **Position and content are written in the same pass**, imperatively onto the element (`canvas.style.left/top/width/height` in percentages of the frame) rather than through a React `style` prop. They are two faces of one datum — *which region of the frame is this* — and splitting them across a render leaves a frame in which the canvas has already moved but still shows the previous pixels: the enhancement visibly sliding over the picture. The element carries no `style` prop for the same reason: React would reset it on the next render. Its CSS base is `0 × 0`, because an unstyled canvas defaults to 300 × 150 and that would be the first frame's flash.
- **Frozen during a pan drag.** While `dragRef` is live the mask is not recomputed: the canvas stays pinned to the same frame pixels, so it travels with the image instead of sliding, and only stops covering the strip that is being revealed. The render is claimed back on `pointerup`. Recomputing three million pixels sixty times a second to bring an enhancement one frame earlier would buy a stuttering pan.
- **Re-rendered inside a `requestAnimationFrame`**, so a wheel spun fast cannot chain twenty full mask passes nobody will see. Only the last survives.
- **`pointer-events: none`**, and no border. It sits over the `<video>`, so without it the layer would eat the click that pauses and the drag that pans. A hairline would be a frame inside the frame: it is not marking a chosen region, it is covering what you are looking at.
- **No `image-rendering: pixelated`.** The canvas normally carries display resolution, so there is nothing left to resample; when the caps bite, it must interpolate exactly like the video underneath, or flicking the switch would be comparing two different resamplings rather than the enhancement.

### Transport — `.transport` (signature component)

The player's fixed foot bar, built like the mass bar (raised sheet, 1px top fold line, upward shadow) but stacked in two lines with a 12px gap.

**Line one — where you are:** the file name, play/pause, the two frame steps, the scrub bar (`flex: 1`), the timecode, the frame counter. The name (`.tname`, 11px `--ink-2`, capped at 240px with an ellipsis and the full path in `title`) leads the line because *what* you are watching comes before the controls for watching it — and it stopped being optional the moment "Ver el resultado" started bringing in a file the user never opened: without it, an original and its lighter version are two identical videos on an unlabelled table. The `vista previa` marker sits beside it, since it qualifies the same thing. **Line two — how you are looking:** speed, zoom, volume, the `Enfocar` toggle with its two sliders (which appear only when it is on — the line wraps, and two controls that are off should not hold a slot open), and the capture action pushed to the corner by `margin-left: auto` (not by a `.bar-spacer` — under `flex-wrap`, a spacer strands the button at the *left* of the wrapped line).

- **`.tkey`** — the transport key: 6px notch, 30px minimum height, `6px 10px`, raised sheet with a 1px inset mountain hairline, hover `--sheet-sunk`, active `--mountain-fill`. Smaller than `.act` on purpose: a row of seven of them must not compete with the one button that commits work.
- **`kbd` inside a key** — the shortcut is printed on the key that performs it (`J`, `K`), in Martian Mono at 9px/width 82%/`--ink-3`. A key name is a technical string, so mono is correct here; this is the one non-numeric mono use in the system and it is deliberate. Buttons also carry `aria-keyshortcuts` and a `title`.
- **Tap versus hold on `J`/`K`.** A tap is one frame. Held past 280ms, the same key becomes a 15% crawl in that direction and stays there until released. They are two distances of one question — "what happens exactly here?" and "what happens around here?" — and making the second one out of fifty taps turns looking into manual labour. The single frame is spent immediately on press, never after the hold threshold resolves, or one frame would always arrive late. Forward is the video element's own `playbackRate`, which decodes continuously and does not stutter; backward does not exist in any browser, so it is frames requested in reverse on an interval at the same cadence the forward crawl shows them. Key auto-repeat is ignored (`e.repeat`), and `blur` releases the hold — a lost `keyup` would otherwise leave the crawl running against a window nobody is looking at.
- **The arrows aim; the jump is charged on release.** `←`/`→` add 5s to a running total (1s with `Shift`) and *do not seek*: the picture keeps running as if nobody touched it while the number grows in the clock's slot, and the single accumulated jump — 28s, or whatever it reached — happens on `keyup`. Seeking on every press makes the decoder rebuild the picture from the previous keyframe each time, so holding the key turns a scan into a run of freezes. A lone tap is still 5s; it is simply charged eighty milliseconds later, which nobody can feel. **The hold cadence is ours, not the system's:** at the OS auto-repeat rate of ~30/s, five seconds a repeat would be two and a half minutes of video per second of held key, and the rate differs on every machine. One step immediately, then one every 160ms after a 320ms arm — a second of holding is twenty-five seconds, a distance you can aim. The total is clamped against the real remaining time on every tick, so the number on screen is a number the video can honour. `blur` and leaving the module *charge* the pending jump rather than discarding it: the distance was already asked for, and a counter stuck on screen with no way to spend it is worse than either.
- **`↑`/`↓` are volume**, 5% a tap and 2% a repeat — this one does obey auto-repeat, because it is a ramp you hear while it moves, not a distance to aim before travelling it. Raising the volume unmutes: turning up something silent is asking to hear it. **`Shift` with them is zoom, one point at a time** — the same rule as the pair beside them: the bare key is the wide step, `Shift` is the fine one. The step is one *percentage point of effective scale*, the unit the ends and the slider are already written in, so the number under the slider thumb and the number the keyboard produces cannot drift apart; asking in zoom steps would make a point worth something different in every file. **`P` joins `Space` for play/pause** — the key convention gives it, and the initial of what it does gives it too; `Space` is the one a focused button steals, `P` is not. A focused `INPUT` keeps *all four* arrows (it used to keep only the horizontal pair, which was fine until the vertical pair meant something).
- **`.scrub`** — a 5px track whose played portion is a hard-stop gradient driven by a `--played` custom property, in `--ink-2`: **the foil does not travel here.** Playback progress commits nothing, so it gets ink; the encoder's progress bar keeps the gold. `step={1/fps}` makes the arrow keys on a focused scrub bar move exactly one frame.
- **`.tcode` / `.tframe`** — mono, `tabular-nums`, with `min-width` floors (148px / 92px) so a running clock never shifts the controls beside it. The current time is 15px/600 in `--ink`; the total is `--ink-3`. `Cuadro` is a 9px micro-label over a mono value, the same key/value construction as the mass bar.
- **The pending jump takes the total's slot** (`.tcode-skip`, `--ink`, 600 — full ink because it is happening now, not background information that never changes). While the arrows are accumulating, `12:03 / 45:20` reads `12:03 +28 s`. It is the same slot on purpose: a counter appearing *beside* the clock would widen `.tcode`, squeeze the `flex: 1` scrub bar and make the number jump across the screen at the exact moment the user is watching it.
- **`.zoom`** — a 132px slider and a 52px mono readout, right-aligned so the digits do not dance. It replaced a minus key / percentage / plus key group: zoom is a continuous scale with two hard ends, and stepped keys made the user count clicks to reach a place the hand finds in one pass. The stepping keys survive as the `−`/`+` shortcuts, where they cost no width.
- **Capture** is `.act-commit` — the foil. It is the only thing this module writes to disk, and the Single Foil Rule holds across the app because the two modules are never on screen together.
- **Capture saves what is on the table.** The visible rectangle is derived from the same pan and zoom that transform the frame, so it is not an estimate of what is on screen — it *is* what is on screen. Zoomed in, the file is that crop; fitted, it is the whole frame. The visible enhancement is composited in, because turning it off at write time would hand back a different image than the one that made the user press the button (the toggle turns it off on the table, and then it does not go in either).
- **At least 1920 on the long side**, in whatever proportion the crop has. At file resolution a crop taken at 300% is four hundred pixels wide — the detail the user went in to examine, delivered as a postage stamp. It is a **floor, not a fixed size**: a whole frame of a 4K file is written at its own 3840, because shrinking real pixels to satisfy a number throws away what was already there. When the enhancement is on there is genuinely more to copy than the crop holds, since that layer is already computed at screen resolution.
- **`C` captures.** The initial of what it does, printed on the button as a `kbd` like `J` and `K` are on theirs, with `aria-keyshortcuts="c"` and the shortcut repeated in the `title` beside the exact output size. Looking closely and keeping what you are looking at are one gesture; making the user leave the keyboard to find the button splits it in two — and this is the module's only key that writes to disk, which is exactly why it was the one still missing. Auto-repeat is ignored: a held key is not thirty captures. It is refused while there is no playable source, the same condition that disables the button.
- **The button says which of the two it will do.** `Capturar fotograma` when the whole frame is visible, `Capturar lo visible` when it is not, with the exact output size in the `title`. Promising "frame" and writing a crop would be lying on the one button in the module that touches the disk. The name follows: `-cuadro-N-recorte.png`, because a crop and the full frame of the same frame number are not the same file and whoever goes looking later needs to tell them apart.

### The bench — `.editor` / `.edit-stage` / `.edit-deck` (signature component)

The editing module, and the first place in this product where the window holds a *project* instead of a file. Two surfaces stacked: the table again on top (`.edit-stage`, same `--stage`, same 64px lattice, same `--lift-stage` under the picture), and the bench under it in paper. The grid is `minmax(90px, 1fr) auto` — **the picture yields and the bench does not.** Shrink the window and the first thing to go is image, never the controls you are cutting with.

**The model is three nouns** (`src/shared/edit.ts`): a **source** is a file brought in, probed once and quoted many times; a **track** is a row that knows only whether it carries picture or sound; a **block** is a quotation — this source, from this second to that one, starting here. Nothing is written to disk until export, which is why undo is a stack of whole projects rather than an inverse operation per gesture, and why the originals are never at risk.

**The rule that holds everything up: the video track carries picture and the audio tracks carry sound.** A file with both enters as *two blocks joined by a `linkId`*, which move, cut and delete as one. Separating audio from video is not a mode or a checkbox — it is breaking that link (**Separar audio**, `U`), and from then on they are two ordinary blocks. Without the rule, export would have to ask of every picture block whether it also sounds, and the user would have to remember the answer.

**Tracks:** `V1`, `A1`, `A2`. One video track, because stacking picture on picture is compositing, and compositing without position and opacity controls would be promising something that is not there. Two audio tracks, because the voice that came with the video and the music laid under it are two different things, and separating them is the first thing anybody does.

- **`.deck` is 196px, fixed** — three 56px lanes and a 26px ruler. It does not grow with the material: a timeline that got taller as blocks were added would be stealing from the picture in proportion to how much work you had done.
- **`.deck-gutter`** is a 44px sunk column of track labels, with a `.deck-cap` spacer exactly as tall as the ruler so the labels line up with their lanes. It does not scroll; the lanes beside it do.
- **The ruler is the position control.** Press it, drag along it. Tick spacing is the first step in `[0.1 … 1800]` that leaves 68px between marks at the current zoom, so the labels never collide. It carries `role="slider"` with the timecode as `aria-valuetext` and arrow keys of its own.
- **Picture and sound are told apart by form, not colour.** A video block wears a filmstrip band along its top edge (`--mountain-fill` dashes); an audio block wears a single hairline through its middle. The two semantic colours in this system already mean *removes weight* and *preserves quality*, and spending them here to mean "this is audio" would leave them meaning two things at once. A linked pair shows a 5px `--mark-mountain` square in the corner — the only way to tell at a glance whether picture and sound still travel together. A silenced block drops to 55% opacity: it is still there, it is just not speaking.
- **Selection is the Neutral Selection Rule again:** `inset 0 0 0 2px var(--ink)`, no colour, same as `.seg` and `.tab`.
- **Edges are magnets.** Dragging snaps to zero, the playhead and every other block's edges, within 9px converted to seconds by the zoom. Both edges of the dragged block are tested and the smaller correction wins — snapping the head when the user is aligning the tail feels like the block is resisting. A single frame of gap between two blocks is a black flicker nobody sees while editing and everybody sees on export.
- **A drag is always computed against the project it started from**, never against the previous frame's result. Applying deltas on top of deltas accumulates rounding and magnet error, and a block dragged slowly ends up somewhere a block dragged quickly does not.
- **Zoom is pixels per second, 4 to 400**, on a slider in the toolbar and on `−`/`+`. A ten-second clip and a two-hour one are edited with identical gestures; only the scale changes. Nothing in the timeline is expressed as a percentage.
- **`.playhead`** is a 1px ink line with a 9px triangular head, crossing the ruler and all three lanes as one piece, `pointer-events: none` so it never intercepts a click meant for a block. It keeps itself in view during playback by scrolling the minimum required — it does not centre itself, which would turn the timeline into a conveyor belt.
- **Preview is an approximation and says so.** One `<video>` element, muted (the picture track carries no sound in this model, so an unmuted element would double every linked clip), plus one hidden `<audio>` per audio block. **The master clock is the wall clock, not the video element**: in a black gap or over a music-only stretch there is no element to read the time from, and the montage would freeze exactly where the user is waiting to see time pass. Every element is a follower, corrected when it drifts more than a third of a second while running and to the exact frame when paused. Gains above 100% export correctly but cannot be previewed — a media element cannot go louder than its file — and the control says so in its `title`. Truth is what FFmpeg assembles at export; claiming the preview is identical would be lying in the one place the user can check.
- **The foot bar is a `.mass` bar in a different trade:** duration, block count and the output canvas on the left; **Tamaño**, **Calidad** and **Caja** as three segmented controls; **Exportar** in foil on the corner. Codec follows the container (WebM → VP9/Opus, otherwise H.264/AAC) rather than adding a fourth control that can be set to an illegal combination. Export is disabled with a reason in the `title` when the timeline has no picture in it.
- **A file dropped on the window while the bench is up is added, not swapped.** The same gesture means "work on this instead" on the other two faces and "add this to what I am building" here; nobody drags a second video into an editor to throw out the first. **And if the window's file changes underneath a montage that has been worked on, the montage stays** — reseeding would be the most expensive mistake this module could make. It says so in a quiet notice, with the one action that makes sense beside it.
- **Keys:** `Space`/`P` play, `S` cut at the playhead, `D` duplicate, `U` separate audio, `M` silence, `Supr` remove (with `Shift`, close the gap), `,`/`.` one frame, arrows 5s (`Shift` 1s), `Home`/`End`, `Ctrl+Z` / `Ctrl+Shift+Z` undo and redo. Cutting with nothing selected cuts everything the playhead crosses, which is what is wanted nine times out of ten; with a selection it cuts only that.

**Export** (`src/main/ffmpeg/render.ts`) is one FFmpeg command, not a pile of intermediate files glued together — that would re-encode every block twice and charge the user the loss twice. Each block is an *input* with its own `-ss`/`-t` (seeking by container index instead of decoding and discarding), `filter_complex` lines them up with `concat` and mixes the sound with `amix` (`normalize=0`, so adding a second track does not halve the first), and gaps become real black from a `color` source so nothing after them slides out of sync. Blocks of different sizes are scaled with `force_original_aspect_ratio=decrease` and padded, never stretched.

### Icons — `Icons.tsx`

Twenty-two hand-drawn icons, no library, no unicode glyphs. Shared base: **16×16, `viewBox="0 0 16 16"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth={1.25}`, round cap and join.** Every icon inherits its colour from context, so an icon inside a foil button is foil-ink and an icon inside an alert is `--alert`.

The grammar is straight edges and pattern-consistent angles: `IconSheet` is four cells of the pattern (the deploy toggle), `IconArrow` is direction, `IconChevron` rotates 180° when the sheet deploys, plus `IconAlert`, `IconFolder`, `IconStop`, `IconCheck`, and `IconUpdate` — a straight shaft, a chevron head and a ground line, deliberately *not* the circular arrow every library uses for "reload", because a single curve would give itself away among nothing but creases.

The player adds eight, and holds the same line where the category's conventions are curved or solid: `IconPlay` and `IconPause` are **outlined**, not filled, because a solid triangle would be the only opaque mass in the interface that is not foil; `IconStepBack` / `IconStepNext` are that triangle against a stop bar; `IconCamera` is a box with a straight-cut viewfinder hump and a **diamond** aperture, since a round one is impossible here; `IconPlus` / `IconMinus` are bare strokes rather than a magnifier, because the magnifier is a circle with a handle and there is no circle to draw; `IconSound` and `IconMute` share one straight-edged cone with chevron waves or a cross.

New icons must be drawn to the same base, at the same 1.25 stroke, with no curves and no fills — a rounded library glyph gives itself away instantly in a world made of creases.

### Motion

One easing token: `--ease: cubic-bezier(0.16, 1, 0.3, 1)` — a fast-out, long-settle curve used for every transition and for the two decorative loops.

| What | Duration | Easing |
|---|---|---|
| Segmented background/colour | 140ms | `--ease` |
| Button + switch track background | 160ms | `--ease` |
| Switch knob translate | 200ms | `--ease` |
| Deploy chevron rotate | 260ms | `--ease` |
| Progress fill scaleX | 320ms | `linear` |
| Crease row unfold | 420ms | `--ease` |
| Headroom gauge fill + tint | 160ms | `--ease` |
| Update fold sweep (checking) | 1.15s loop | `--ease` |
| Packet pulse (drag) | 1.2s loop | `--ease` |
| Packet breathe (probing) | 1.8s loop | `ease-in-out` |

**The unfold.** The authored moment: opening "Desplegar la hoja" runs `@keyframes unfold` on every `.crease` inside `.deployed` — `opacity 0 → 1`, `translateY(-7px) → 0`, and a `clip-path` polygon opening from the top edge downward, with `animation-fill-mode: backwards`. Rows are staggered **32ms apart** by `:nth-child`, from 0ms through 224ms for rows 1–8, and every row from the ninth on is clamped to 256ms so a long sheet does not turn into a slow wipe.

**Reduced motion** (`prefers-reduced-motion: reduce`): all transitions are forced to `1ms`; the two *decorative* infinite loops are set to `animation: none` — the update sweep is not decorative, so it is stopped but left visible at full width (shortening an infinite loop only speeds it up, it does not stop it); the unfold is collapsed to `1ms` duration with `0ms` delay, so the rows still arrive — instantly.

### Focus

- **Global default:** `:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px }`, declared near the top of `app.css`. This serves links and anything unclipped.
- **Clipped shapes** (`.act`, `.seg button`, `.switch`): `outline: none` plus `box-shadow: inset 0 0 0 2px var(--ink)`, because `clip-path` cuts an outline away entirely while an inset shadow paints inside the clip and survives.

**The Focus-Last Rule (do not tidy this).** The `:focus-visible` block for clipped shapes sits **at the very bottom of `app.css`, after every component rule, on purpose.** `.seg button[aria-checked='true']` sets `box-shadow` at the same specificity; on a tie, source order decides. Placed earlier in the file, the selection rule overwrote the focus ring on precisely the focused control — and because the roving tabindex only ever focuses the *selected* option, that left all eleven radiogroups with no visible focus at all. For the same reason the focus rule for a selected tab **composes** with the selection underline (`inset 0 0 0 2px var(--ink), inset 0 -2px 0 var(--ink)`) instead of replacing it. Moving this block up the file, or "deduplicating" the underline out of it, reintroduces the bug.

### Accessibility patterns already established

- Radiogroup with roving tabindex and arrow-key wrap, focus following selection (`Segmented`).
- `role="dialog" aria-modal="true"` with `aria-labelledby` on the working veil, focus moved to its first action whenever the card changes face, `Tab` cycled inside the card by a capturing listener while it is up, `Escape` closing it only once the job is over, and focus restored to the previously active element when it comes down (if that element is still visible).
- `role="switch"` + `aria-checked` + `aria-label` (`Switch`).
- `role="progressbar"` with label and value bounds.
- `aria-live="polite" aria-atomic="true"` on both mass-bar readout groups, and on the probing paragraph.
- `role="alert"` on the FFmpeg-missing, load-error, encode-error and unreachable-target notices.
- Fold marks as `role="img"` with a Spanish `aria-label`; non-lever rows use `aria-hidden` spacers.
- Every number input and range carries an explicit `aria-label`; the quality range adds an `aria-valuetext` sentence; unit suffixes are `aria-hidden` so the unit is not read twice.
- **≥3:1 on the fold marks** is a hard floor and the reason `--mark-mountain` / `--mark-valley` exist as separate tokens from `--mountain` / `--valley-line`. Both currently measure 4.26:1 and 4.91:1 on raised sheet. A new mark colour must be checked against `#fdfdfc`, not against `#f7f7f7`.
- Shape carries the semantic difference as well as colour (fill vs outline), so the fold system survives colour-vision deficiency.

## Do's and Don'ts

### Do:
- **Do** assign every new crease row a `kind` using the test table above, and default to `none` when unsure rather than guessing a fold.
- **Do** implement any sheared silhouette with `clip-path: polygon(...)`, using the `--notch` custom-property idiom on anything button-sized.
- **Do** put the focus ring for a clipped element in an `inset` box-shadow at the bottom of `app.css`, composed with whatever selection shadow that element already has.
- **Do** use `filter: drop-shadow(...)` — not `box-shadow` — to lift a clipped element off the sheet.
- **Do** set numbers, units, sizes, bitrates, durations and file paths in Martian Mono with `tabular-nums`, and everything else in Archivo.
- **Do** give live readouts an `aria-live="polite" aria-atomic="true"` wrapper, as the mass bar does.
- **Do** ship any new typeface as a subsetted self-hosted woff2 under `src/renderer/src/assets/fonts/`; the CSP (`default-src 'self'`) blocks every CDN.
- **Do** separate stacked panels with a 1px gap over a `--mountain` parent instead of per-child borders.
- **Do** check any new informational mark against `#fdfdfc` for ≥3:1, and give it a shape difference as well as a colour difference.
- **Do** let a new module own rows two and three of the window grid through a `display: contents` wrapper, and keep it mounted-but-hidden so its state survives a tab switch.
- **Do** put text on a raised sheet card when it has to be read over the table. `--stage` is a surface for images, not for copy.
- **Do** print a keyboard shortcut on the control that performs it (`kbd` inside `.tkey` or `.act`) and back it with `aria-keyshortcuts`. A shortcut nobody can discover is a shortcut nobody uses.
- **Do** close pointer, keyboard *and* drag when a state is meant to block the window. A scrim only stops the mouse; the tab order and the window's drop handler walk straight past it.

### Don't:
- **Don't** put gold foil on anything but the single commit action. Two foil elements competing on one screen breaks the only signal the palette has.
- **Don't** use `--valley` to mean "selected", "active" or "primary". It means "preserves quality", and nothing else.
- **Don't** use `transform: skew()` on anything containing text or numbers. The only skew in the build is on an empty 22×13 decorative box.
- **Don't** set a label, heading, hint, button or sentence in Martian Mono — including single words like the density chip's `holgado`.
- **Don't** add a `border-radius` anywhere. The system has no radius scale because it has no radius.
- **Don't** move the `:focus-visible` block up `app.css` "for organisation". It is last for a documented cascade reason.
- **Don't** animate `width` on the progress bar; it runs for minutes and forces layout every frame. Use `transform: scaleX()`.
- **Don't** shorten an infinite decorative animation under `prefers-reduced-motion` — turn it off. Shortening it makes it faster, not calmer.
- **Don't** use `--mountain` (1.99:1) to carry meaning, or `--mark-mountain` to draw a plain rule.
- **Don't** design a mobile or tablet layout. The only responsive range is 900×620 → resize, with one breakpoint at 1000px.
- **Don't** spread `--stage` beyond the video viewing area. One dark surface, one job; a second one turns a material into a theme.
- **Don't** put foil on the scrub bar, or on anything else in the transport but the capture button. Playback progress commits nothing.
- **Don't** reach for a `.bar-spacer` inside a wrapping flex row — use `margin-left: auto` on the item that must stay in the corner.

## Known inconsistencies

Recorded as found in the built code, not smoothed over.

1. **The stated 60° shear does not exist in any component.** `index.html`'s direction contract says "Cizallamiento 60°", and the background lattice does use a literal `60deg`. But no clipped component is at 60°: the shear angle is set per-component by a px notch or a percentage, producing roughly 71° (`.act`, 13px over ~38px), 69° (`.switch`), 74° (switch knob), 72° (range thumb), 65° (chips), 63° (mountain mark) and 73° (valley mark, the one `skewX(-17deg)`). There is no shared angle token. Treat "60°" as directional intent; the real invariant is "consistently sheared to the right", not a specific angle.

2. **Some disabled states are styled but unreachable.** `.seg button:disabled`, `.switch:disabled` and `input[type='range']:disabled` all have rules, but `Segmented`, `Switch` and `Slider` expose no `disabled` prop. Live now: `.act-commit:disabled` (running, or FFmpeg missing) and `.act-quiet:disabled` (the update button while checking or downloading). The rest are provisioned, not proven — verify them before relying on them.

3. **`.num:focus` is effectively dead.** Every `.num` in `App.tsx` is wrapped in `.field`, and `.field .num` zeroes the border while `.field .num:focus` zeroes the box-shadow. The standalone `.num:focus` rule (border `--valley-line`, valley underline) can never fire as written. It also uses a different blue (`--valley-line #7ba4cd`) than the wrapper's `.field:focus-within` (`--mark-valley #4272a3`) for the same affordance.

4. **Two tokens are declared and never used:** `--s1: 4px` (the whole interface lives on s2–s7) and `--lift-sm`. Sub-4px values that *are* used appear as literals instead: `2px` (`.crease-hint` margin), `3px` (`.spec-k` margin, `.pair-field` gap, `.switch` padding), `6px` (`.legend span` gap).

5. **Several palette values are literal hexes, not tokens.** `#f1efe9` (segmented hover), `#ddd9d0` (switch hover), `#e0bdb1` (alert hairline), `#6b2416` (alert text), the five foil gradient stops, and the density/drop chip pairs `#24512c`/`#d6e8d4` and `#6b2f18`/`#f3ddd0` — the last pair duplicated verbatim between `.mass-drop-up` and `.density-apretado`. They are captured in this file's frontmatter so they are auditable, but `tokens.css` does not define them.

6. **The update-error notice has no `role="alert"`.** It renders with the alert styling (`.notice`, alert icon) but, unlike the FFmpeg-missing, load-error, encode-error and unreachable-target notices, carries no ARIA role, so it is announced only when a reader reaches it.

7. **Decorative icons are inconsistently hidden.** `IconArrow` in the mass bar gets `aria-hidden="true"`; the same icon inside `.act` buttons, notices and the deploy toggle does not. (The two logo images are exempt: an `<img>` with `alt=""` is already ignored.) They have no `<title>` so most readers ignore them, but the treatment should be uniform.

8. **`.section-head-deployed` exists only to add a 12px top margin**, and there is an orphaned section comment (`/* --- Ventana estrecha --- */`) at line ~893 with no rules under it — the narrow-window media query it labels actually lives at the bottom of the file, past the focus block.

9. **The fold legend renders twice** when the sheet is deployed (once per crease section). Intentional as a local reminder, but it means the same two `role`-less marks appear twice on screen.

10. **Valley blue does double duty.** The Neutral Selection Rule keeps valley out of *selection*, but `--valley` is still used as a plain informational fill in three non-fold places: `.notice-quiet`, `.mass-drop` (the shrink percentage) and `.density-justo`. Those readings are all benign-or-good, so the association holds, but valley is not strictly reserved to the fold semantics the way foil is reserved to commit.
