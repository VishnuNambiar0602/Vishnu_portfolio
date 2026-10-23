# Design notes

The site is a working notebook, not a brochure: the projects are the content, so the page gives them room and keeps everything else quiet.

## Principles
- Every number on the site was measured by running the project. Where data is synthetic or simulated, the page says so next to the number.
- One accent colour, used only for interaction and for the single series that matters in a chart.
- No decoration without a job: no gradients, glows, card grids or motion that is not tied to an action.

## Colour tokens (`css/styles.css`)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F5F6F8` | `#0E1116` | page |
| `--surface` | `#FFFFFF` | `#161A21` | demo panels, inputs |
| `--ink` | `#14181F` | `#EDEFF3` | text |
| `--muted` | `#4B5563` | `#A5AEBB` | secondary text (AA on both backgrounds) |
| `--line` | `#D8DCE3` | `#2B313B` | 1px dividers |
| `--accent` | `#B93A12` | `#F08A5D` | links, active state, forecast line |

Contrast: ink on bg is above 15:1, muted on bg above 6:1, accent on surface 5.7:1 (light) and above 8:1 (dark).

## Type
- Headings: Bricolage Grotesque 600. Body: IBM Plex Sans 400/500. Data, code, file names: IBM Plex Mono.
- Body 17px / 1.55, paragraphs capped at 68ch. h1 `clamp(2.25rem, 5vw, 3.5rem)`, h2 2rem, h3 1.25rem.

## Spacing and shape
- Scale: 4, 8, 16, 24, 40, 64, 96px. Container 1120px, 24px gutter (16px under 600px).
- Radius 6px on controls and panels. No shadows; separation comes from 1px lines.

## Motion
- Only state changes animate (tab switch, bar fill, replay step), under 200ms. `prefers-reduced-motion` removes all of it and replay auto-play is replaced by "show all".

## Layout
- Projects use a list-plus-panel layout (one demo at a time) rather than a grid of cards, because each demo needs width.
- Below 860px the list becomes a horizontally scrollable tab strip above the panel.
