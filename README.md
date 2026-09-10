# svelte-rack-focus

Two Svelte 5 components built to one rule:

> **Nothing appears and nothing disappears. Everything interpolates.**

- **`Modal`** — a dialog that arrives *through the focal plane* of a fast
  lens, while the page behind it racks out of focus under a soft vignette.
- **`AnimatedList`** — a list that measures itself, so an item can leave
  without its neighbours ever jumping.

Both work with zero configuration and no stylesheet to import.

## Install

```bash
npm install svelte-rack-focus
```

Svelte 5 is a peer dependency. Nothing else is.

## Use

```svelte
<script>
  import { Modal, AnimatedList } from 'svelte-rack-focus';

  let open = $state(false);
  let items = $state([{ id: 1, label: 'One' }]);
</script>

<button onclick={() => (open = true)}>Open</button>

<Modal bind:open title="Hello">
  <p>The page behind this is blurred to 10px.</p>
  {#snippet footer()}
    <button onclick={() => (open = false)}>Close</button>
  {/snippet}
</Modal>

<AnimatedList {items} gap={12}>
  {#snippet children(item)}
    <article>{item.label}</article>
  {/snippet}
</AnimatedList>
```

`AnimatedList` needs each item to have an `id` (`string | number`) and expects
`items` already in the order you want displayed — sort it yourself and the
list will animate to the new order.

### Props

`Modal`: `open` (bindable), `title`, `eyebrow`, `dismissible`, `width`,
`blur`, `duration`, `exitDuration`, `backdrop`, `portalTo`, `class`,
`labelledBy`, `onclose`, plus `children` and `footer` snippets.

`AnimatedList`: `items`, `gap`, `moveDuration`, `enterDuration`,
`exitDuration`, `enterBlur`, `exitBlur`, `stagger`, `staggerMax`, `easing`,
`class`, and a `children` snippet that receives one item.

Also exported: `dof`, `focusIn`, `focusOut`, `rack`, `rackStyle` (the
transitions, usable on any element), `portal`, `lockScroll`, `trapFocus` (the
actions), and `DURATION`, `EASE`, `BLUR` (the default values).

### Theming

Every colour and shape is a CSS custom property with a fallback, so the
components look right in an app that has never heard of them. Override any of
them from anywhere:

```css
:root {
  --rf-surface: #1a1f2c;        /* dialog background — a colour           */
  --rf-surface-image: none;     /* optional gradient layer over it        */
  --rf-fg: #e9edf6;
  --rf-muted: #a3adc2;
  --rf-accent: #7aa2ff;
  --rf-border: rgba(255, 255, 255, 0.14);
  --rf-shadow: 0 40px 90px -30px rgba(0, 0, 0, 0.9);
  --rf-radius: 22px;
  --rf-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --rf-z: 900;
}
```

Colour defaults use `light-dark()`, which follows whatever `color-scheme`
your app declares — set `color-scheme: dark` on `:root` and the dialog goes
dark on its own. For the lab's own filmic palette instead:

```js
import 'svelte-rack-focus/theme.css';
```

**Timings are props, not custom properties.** The modal's transitions are
driven from JS and the list's timers have to agree with its CSS, so a
stylesheet cannot be the source of truth for them. Pass `duration={800}`
rather than trying to override a variable.

Two gotchas worth knowing:

- The modal portals itself to `<body>`, so it inherits fonts and colours from
  `body` — not from whatever wrapper you set them on. Set your font on `body`
  (or pass `portalTo`).
- `light-dark()` takes two **colours**. `--rf-surface` is a colour; use
  `--rf-surface-image` for a gradient.

## Developing / running the demo

This repo is the library (`src/lib`) plus a demo app that uses it
(`src/routes` + `src/demo`). Requires **Node 20+** (Vite 8):

```bash
nvm use && npm install && npm run dev
```

`npm run check` typechecks; `npm run build` builds the demo;
`npm run package` builds the publishable `dist/` and lints it with `publint`.

### How the packaging works

`svelte-package` copies `src/lib` to `dist/`, transpiles the TypeScript and
generates `.d.ts` files alongside. Three things about this setup are worth
knowing before you change it:

- **All Svelte config lives in `svelte.config.js`, not `vite.config.ts`.**
  `svelte-package` reads that file directly and never goes through Vite, so
  splitting the config across both means the published package and the dev
  app get compiled differently.
- **`vitePreprocess({ script: true })` is deliberate.** As of
  vite-plugin-svelte 4 the script transform is opt-in — the dev server strips
  TypeScript itself and does not need it, but `svelte-package` very much
  does. Without it, `lang="ts"` and real type syntax ship to consumers.
- **The `lang="ts"` attribute stays on the published components even though
  the types are gone.** `AnimatedList`'s `generics` attribute requires it.

Demo-only code lives in `src/demo`, deliberately outside `src/lib`, because
`svelte-package` publishes *everything* in `src/lib`.

To test a change the way a consumer will see it, install the tarball into a
throwaway app rather than trusting `dist/` by eye:

```bash
npm run package && npm pack
cd /tmp && npx sv create consumer --template minimal --types ts
cd consumer && npm install /path/to/svelte-rack-focus-0.1.0.tgz
```

That is how the `light-dark(gradient, gradient)` bug above was caught: it was
invisible in the demo, which sets `--rf-surface` itself, and left the dialog
with no background at all in an app that does not.

## The two studies

### 1. Depth-of-field modals

`src/lib/Modal.svelte`

A dialog arrives *through the focal plane* of a fast lens. It starts fully
transparent at **100px** of blur and 1.045× scale; the page behind it racks
out to **10px**, loses a third of its saturation and light, and picks up a
vignette. Leaving, the dialog holds its shape, falls back to 0.965× and
smears away — a shorter, quicker move, because dismissal should feel
responsive.

Two things make it read as a camera rather than as a fade:

- **Three properties, three curves.** `src/lib/motion/transitions.ts`
  deliberately passes `easing: linear` to Svelte and shapes blur, opacity
  and transform separately inside `css()`. The dialog becomes *solid* well
  before it becomes *sharp*, which is exactly what a lens finding focus
  looks like. A single shared easing curve cannot express that.
- **The background racks more slowly than the dialog arrives** (720ms vs
  620ms), so the eye reads the dialog as the thing the lens chose.

Gotcha worth knowing: a Svelte transition hands the element back to its own
CSS when it finishes, so the *settled* state has to exist statically. The
`10px` backdrop blur is declared on `.backdrop` in the component's `<style>`
and `rack()` interpolates from zero up to exactly those values. Keep the two
in step or the blur will snap off at the end of the intro.

The modal also portals itself to `<body>` (`src/lib/motion/portal.ts`) so it
cannot be clipped or re-anchored by an ancestor's `overflow`, `transform` or
`filter`; locks body scroll with scrollbar-width compensation so locking
never jolts the layout; and traps focus on the dialog element itself rather
than on its first control, so no focus ring pops into view on open.

### 2. A list that arranges itself

`src/lib/AnimatedList.svelte`

The obvious implementation — normal flow plus `animate:flip` — has a hole in
it. A removed node keeps occupying space until its outro finishes, so the
surviving cards do not begin closing the gap until the moment the node
vanishes, and then they jump.

So this component owns its layout instead. Every card is measured
individually — **cards may be any height, and any mix of heights** — and
positioned absolutely from those measurements. A `ResizeObserver` on each
card keeps the stack correct when a height *changes* under it: text
rewrapping as the panel resizes, a late-loading font, content edited in
place. Three states:

| state | behaviour |
| --- | --- |
| `entering` | mounted **straight at its final slot** and fades up out of blur; never glides |
| `present` | translates between slots under a CSS transition |
| `leaving` | dropped from the layout calculation **immediately**, frozen where it stood, fading out beneath its neighbours |

Because a new card cannot displace anything *above* itself, its final `y` is
known before it is measured — it can be mounted in exactly the right place
and only has to fade in. Everything below it discovers its new `y` a tick
later and glides there. Removals close the gap in the same breath as the
fade, rather than after it.

Position uses the standalone `translate` property rather than `transform`,
which leaves `transform`/`scale` free for the enter and exit keyframes
without the two clobbering each other. The deck's own height transitions on
the same curve, so the scroll area never snaps to a new size.

## Layout of the source

```
src/
  lib/                        <- everything here is published
    index.ts                  the public surface
    Modal.svelte              the depth-of-field dialog
    AnimatedList.svelte       the self-measuring list
    theme.css                 optional palette (`svelte-rack-focus/theme.css`)
    motion/
      tokens.ts               durations, easings, blur radii
      transitions.ts          dof() / focusIn() / focusOut() / rack()
      portal.ts               escape the stacking context
      scroll-lock.ts          reference-counted, jolt-free
      trap-focus.ts           tab containment
  demo/                       <- NOT published; demo-only
    SignalCard.svelte, data.ts, clock.svelte.ts
  routes/+page.svelte         the demo
  app.css                     the demo's own theme
```

## Things to try in the demo

- **Open the dialog** — watch the background rack out, and the dialog's
  opacity land before its sharpness does.
- **Add a signal** while sorted by *Confidence* — it drops into its sorted
  slot and everything below it slides down.
- **Dismiss a card** (× on hover) — the gap closes while the card is still
  fading.
- **Change the sort** — every card takes the shortest path to its new slot.
- **Resize the window** — the notes rewrap, every card changes height, and
  the stack re-measures and re-stacks itself.
- **Live** — signals arrive every 2.4s and the oldest are evicted, so
  additions and removals overlap mid-animation. Nothing is allowed to snap.

## Responsive behaviour

The desktop layout is an app shell: `body` does not scroll, the shell is
exactly `100dvh`, and the feed panel is its own scroll region — the brief's
"vertical scrolled area on the right".

That only holds while the shell actually fits the viewport. Below the
two-column breakpoint, or in a short window, the page is taller than the
viewport, so `@media (max-width: 900px), (max-height: 40rem)` hands scrolling
back to the document: `html`/`body` go back to `overflow: visible`, the shell
grows to its content, and the feed stops being a nested scroller and simply
flows down the page. One honest page scroll beats two nested ones under a
tall hero.

Getting this wrong is easy and silent: an earlier version gave the shell
`height: auto` *and* `overflow-y: auto` at the breakpoint. With `height:
auto` the shell can never overflow itself, so its `overflow-y` never engaged
— while `body { overflow: hidden }` clipped everything past the fold. The
feed was simply unreachable on a phone. The fix is that the element which
scrolls must also be the element with a bounded height.

Below 900px the layout goes single-column; below 26rem the feed header and
the card meta rows wrap rather than overflow sideways. The modal's scroll
lock only does real work in the document-scrolling modes, which is exactly
where it is needed.

## Accessibility

`prefers-reduced-motion` shortens every duration to ~160ms and drops the
blur and travel, but keeps a crossfade — because "no jarring transitions"
still applies. Reduced motion is not no motion.
