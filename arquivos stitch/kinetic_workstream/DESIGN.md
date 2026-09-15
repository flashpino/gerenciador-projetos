---
name: Kinetic Workstream
colors:
  surface: '#fbf8ff'
  surface-dim: '#d9d8ec'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2ff'
  surface-container: '#edecff'
  surface-container-high: '#e7e6fb'
  surface-container-highest: '#e1e1f5'
  on-surface: '#191b29'
  on-surface-variant: '#414754'
  inverse-surface: '#2e2f3e'
  inverse-on-surface: '#f0efff'
  outline: '#717785'
  outline-variant: '#c1c6d6'
  surface-tint: '#005cbd'
  primary: '#005bbc'
  on-primary: '#ffffff'
  primary-container: '#0073ea'
  on-primary-container: '#ffffff'
  inverse-primary: '#acc7ff'
  secondary: '#5644d0'
  on-secondary: '#ffffff'
  secondary-container: '#6f5fea'
  on-secondary-container: '#fffbff'
  tertiary: '#006c3a'
  on-tertiary: '#ffffff'
  tertiary-container: '#00884b'
  on-tertiary-container: '#ffffff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e2ff'
  primary-fixed-dim: '#acc7ff'
  on-primary-fixed: '#001a40'
  on-primary-fixed-variant: '#004590'
  secondary-fixed: '#e4dfff'
  secondary-fixed-dim: '#c6bfff'
  on-secondary-fixed: '#160066'
  on-secondary-fixed-variant: '#4029ba'
  tertiary-fixed: '#5effa0'
  tertiary-fixed-dim: '#39e186'
  on-tertiary-fixed: '#00210e'
  on-tertiary-fixed-variant: '#00522b'
  background: '#fbf8ff'
  on-background: '#191b29'
  surface-variant: '#e1e1f5'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  cell-data:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style
The design system reflects an agile, hyper-functional, and confidence-inspiring project orchestration environment. Tailored for multidisciplinary cross-functional squads, project managers, and executive leadership, it delivers absolute clarity under high cognitive load. 

The aesthetic is Modern Functional SaaS with high-contrast data visualization. It blends clean structural geometry, crisp boundaries, and rhythmic micro-interactions with expressive, saturated semantic signals. By treating white and neutral canvas space as high-utility staging grounds, vibrant status states (Done, In Progress, Review, Stuck) pop instantly without visual fatigue. The emotional response is immediate control, operational velocity, and playful precision.

## Colors
The color palette anchors on an unmistakable operational blue (`#0073EA`) paired with energetic workflow accents and high-fidelity semantic indicators.

### Semantic Status Tokens
- **Done / Pronto**: `#00CA72` (Emerald Green) - Positive momentum, completion.
- **Working on it / Em Progresso**: `#0086F0` (Vibrant Sky Blue) - Active operational state.
- **Review / Waiting**: `#FDAB3D` (Warm Amber/Orange) - Attention and staging.
- **Stuck / Travado**: `#E2445C` (Crisp Crimson Red) - Immediate blocker indicator.
- **Not Started / Backlog**: `#C4C4C4` base with `#676879` text (Neutral Slate/Silver) - Latent potential.

### Group Identity Accents
- **Workspace Primary Group**: `#579BFC` (Azure)
- **Secondary Creative Group**: `#A25DDC` (Grape/Purple)
- **Execution Sprint Group**: `#00C875` (Mint)
- **High-Priority Tracker**: `#E2445C` (Crimson)

### Canvas & Surface Structure
- **App Canvas Base**: `#F6F7FB`
- **Surface Level 1 (Panels & Sidebar)**: `#FFFFFF`
- **Surface Level 2 (Sub-headers & Row Hover)**: `#F0F3F8`
- **Borders & Grid Dividers**: `#E6E9EF` (Subtle, high precision)
- **Primary Text**: `#323338` (Maximum contrast against pure white cells)
- **Secondary & Muted Text**: `#676879`

## Typography
Plus Jakarta Sans provides the exact combination of modern typographic warmth, low stroke contrast, and geometric rhythm necessary for dense dashboard layouts. 

- **Display & Board Headers**: Bold and confident, anchoring the workspace canvas.
- **Table Cells & Content**: Set at `13px` with medium (`500`) weight to ensure legibility across multi-column data structures without causing visual clutter.
- **Labels & Micro-data**: Capitalized or prominent small elements leverage weight (`600`–`700`) and slight tracking to remain sharp in compact badge geometries.
- **Number & Date Formats**: Always rendered with proportional, clean tabular alignment for instant vertical scanning.

## Layout & Spacing
The layout follows a fluid-flexible SaaS workspace grid optimized for horizontal multi-column density alongside an adaptive collapsible navigation hierarchy:

- **Primary Left Rail (Global)**: Fixed `64px` width for cross-workspace and platform navigation.
- **Secondary Workspace Sidebar**: Resizable, defaulted to `240px`, collapsible to `0px` with an accessible expansion trigger.
- **Main Canvas Board**: Stretches fluidly with horizontal overflow scroll for dynamic custom data columns.
- **Row Densities**: Standard data row height is `36px` to `40px`, while summary footers and group headers sit at `44px`.
- **Spacing Rhythm**: 
  - Gaps between table cells are strictly zeroed out (`border-collapse: collapse`) with internal padding governed by `space-sm` (vertical) and `space-md` (horizontal).
  - Structural workspace components decouple via `space-lg` and `space-xl`.

## Elevation & Depth
Depth in the system is governed by clean architectural planes rather than heavy shadows, preserving scanning efficiency across dense grids.

- **Level 0 (App Shell)**: Flat surface base (`#F6F7FB`).
- **Level 1 (Work Surfaces & Tables)**: Crisp white cards (`#FFFFFF`) framed by precise low-contrast structural borders (`1px solid #E6E9EF`).
- **Level 2 (Modals, Overlays, Dropdown Menus)**: Elevated with a clean directional ambient shadow: `0 8px 24px -4px rgba(0, 0, 0, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.04)`.
- **Hover Transitions**: Data rows switch instantaneously to `#F0F3F8` with no vertical displacement. Draggable items lift subtly with `0 4px 12px rgba(0, 0, 0, 0.08)`.
- **Status Surfaces**: Full-bleed cell backgrounds use bold, flat color with bright white text, producing an uninterrupted mosaic of team activity.

## Shapes
The shape hierarchy reinforces utility and rapid tactile targeting:

- **Status & Value Badges**: Fully pill-shaped or smoothed rounded rects (`radius: 4px` to `8px`) inside table cells, presenting a solid block of color with soft perimeter ergonomics.
- **Input Fields & Action Triggers**: Balanced at `6px` to `8px` corner radius, creating approachable form structures.
- **Table Group Headers**: Integrated left-accent border tabs (`6px` rounded left edge) that visually frame the group collections below them.
- **Avatars**: Circular (`50%` radius) with 2px borders when stacked in assignment clusters.

## Components

### Expandable Board Groups
- Group headers feature an expandable caret, an editable title set in bold brand tones (e.g., `#579BFC`, `#A25DDC`), and an inline item counter pill.
- The left margin contains an uninterrupted color bar that binds all rows in that section to the group identity.

### Data Table Rows & Cells
- **Text & Input Cells**: Clean background, `#323338` text, transitioning on edit to a pure white field with a `2px solid #0073EA` outline.
- **Status Cells**: Full cell saturation using semantic color tokens with crisp white typography. Hovering triggers a micro-luminance boost (`brightness: 1.05`) indicating clickable picker action.
- **Progress Trackers**: Segmented multi-colored horizontal progress bars reflecting the aggregated completion percentage of the group.

### Action Buttons & Controls
- **Primary Button**: `#0073EA` background, white text, 8px radius, subtle active scale (`0.98`).
- **Secondary Button**: `#FFFFFF` with `#E6E9EF` border and `#323338` text; transitions to `#F0F3F8` hover.
- **New Item / Add Row**: Clean contextual row inputs embedded directly at the base of each group table.

### Checkboxes & Row Selectors
- Custom 16x16 rounded checkboxes with a 4px corner radius. In unchecked state, borders are `#C4C4C4`; when checked, they flood `#0073EA` with an animated white checkmark.

### Workspace Sidebar Navigation
- Vertical icon-and-text hierarchy with active state indicators (accent left edge highlight, background `#EBF3FF`, active text `#0073EA`).