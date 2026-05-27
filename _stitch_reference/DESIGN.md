---
name: Cyber-Arcade Retro-Future
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1b1b'
  surface-container: '#1f1f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#b9cac9'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#303030'
  outline: '#839493'
  outline-variant: '#3a4a49'
  surface-tint: '#00dddd'
  primary: '#ffffff'
  on-primary: '#003737'
  primary-container: '#00fbfb'
  on-primary-container: '#007070'
  inverse-primary: '#006a6a'
  secondary: '#ffabf3'
  on-secondary: '#5b005b'
  secondary-container: '#fe00fe'
  on-secondary-container: '#500050'
  tertiary: '#ffffff'
  on-tertiary: '#4d2600'
  tertiary-container: '#ffdcc3'
  on-tertiary-container: '#995200'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#00fbfb'
  primary-fixed-dim: '#00dddd'
  on-primary-fixed: '#002020'
  on-primary-fixed-variant: '#004f4f'
  secondary-fixed: '#ffd7f5'
  secondary-fixed-dim: '#ffabf3'
  on-secondary-fixed: '#380038'
  on-secondary-fixed-variant: '#810081'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#131313'
  on-background: '#e2e2e2'
  surface-variant: '#353535'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
  body-md:
    fontFamily: Space Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Space Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  score-display:
    fontFamily: Space Mono
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: 0.05em
spacing:
  unit: 4px
  gutter: 16px
  margin: 24px
  container-max: 480px
---

## Brand & Style
The design system captures the electric energy of 1980s arcade culture fused with 1990s cyberpunk aesthetics. It evokes the feeling of standing in a dark, neon-lit alleyway or hunched over a glowing cabinet in a smoke-filled arcade. The brand personality is high-octane, nostalgic yet futuristic, and unapologetically digital.

The visual style is a mix of **Retro / Vaporwave** and **High-Contrast**. It relies on the interplay between a "pure black" void and hyper-saturated neon light. Every element should feel like it is emitted from a cathode-ray tube (CRT) screen, prioritizing high-visibility "energy" states over traditional physical surfaces.

## Colors
The palette is built on the foundation of an absolute black background (#000000), representing the deep vacuum of space and the absence of light in a darkened arcade.

*   **Primary (Cyan):** Used for player health, friendly UI elements, and primary navigation focus. It should feel cool and technological.
*   **Secondary (Magenta):** Used for enemy indicators, critical warnings, and "Power-Up" states.
*   **Tertiary (Glowing Orange):** Reserved for explosions, fire, and heat-based projectiles.
*   **Accent Purple & Blue:** Used for secondary atmospheric glows and background decorative elements to add depth to the synthwave aesthetic.

All interactive elements must utilize "neon glows"—outer glows that use the same hex code as the element but at 40-60% opacity to simulate light bleed.

## Typography
This design system utilizes technical, geometric typefaces to simulate a digital cockpit or an arcade scoreboard.

*   **Headlines:** `Space Grotesk` is used for dramatic, large-scale titles. It provides a futuristic, high-tech feel that remains legible even with heavy glow effects.
*   **Body & UI:** `Space Mono` is used for all functional text, scores, and ship readouts. The monospaced nature ensures that numbers do not "jump" as scores increase, maintaining a stable pixel-grid feel.
*   **Styling:** All labels should be uppercase to mimic vintage console interfaces. For critical alerts, apply a slight horizontal skew (italics) to imply speed and urgency.

## Layout & Spacing
The layout follows a **Fixed Grid** model optimized for a vertical mobile experience (Portrait 9:16). 

*   **The 4px Grid:** All spacing and sizing must be multiples of 4 to maintain "pixel-perfect" alignment, ensuring no half-pixels occur which would break the retro aesthetic.
*   **Safe Zones:** UI is pushed to the top (Scores, Lives) and bottom (Controls, Special Weapons) to keep the center "Combat Zone" clear.
*   **Scanlines:** A global overlay of horizontal black lines (1px height, 25% opacity, every 4px) should be applied to the entire screen to simulate a CRT monitor.
*   **Margins:** 24px side margins ensure touch controls are comfortably within the reach of thumbs.

## Elevation & Depth
Depth is not created through shadows or physical stacking, but through **light intensity and color frequency**.

1.  **Background (Level 0):** Pure black (#000000) with a faint starfield or "grid floor" in low-opacity Blue (#2E5BFF).
2.  **Midground (Level 1):** Semi-transparent Magenta or Cyan panels (10-15% opacity) with 1px solid borders.
3.  **Foreground (Level 2):** Fully opaque pixel elements and text.
4.  **Action Layer (Level 3):** Glowing projectiles and explosions. These elements use a `drop-shadow` filter to create a "bloom" effect: `0 0 8px {color}` and `0 0 16px {color}`.

There are no soft ambient shadows. If an element needs to feel "above" another, it simply glows brighter or uses a high-contrast border.

## Shapes
The shape language is strictly **Sharp (0)**. 

To maintain the arcade and pixel-art integrity, rounded corners are forbidden. Every button, panel, and indicator must have 90-degree angles. To add visual interest without rounding, use "clipped corners" (45-degree chamfers) for primary action buttons or decorative frame edges, creating a "hexagonal" or "octagonal" tech feel.

## Components
*   **Buttons:** Rectangular with a 2px solid Cyan or Magenta border. On hover/active, the entire button fills with the border color, and the text inverts to Black.
*   **Progress Bars (Health/Energy):** Segmented into "blocks" rather than a smooth fill. Each block is 4px wide with a 2px gap.
*   **Input Fields:** A simple 1px Magenta underline. The cursor should be a solid Magenta block that blinks at a 500ms interval.
*   **Cards/Panels:** Background-less. Use "corner-only" borders (L-shaped brackets) in Cyan to define the boundaries of the content area.
*   **Chips/Badges:** High-contrast Magenta blocks with Black text. Used for "NEW RECORD" or "LEVEL UP" alerts.
*   **Scoreboards:** Large-scale `Space Mono` text with a 50% opacity "ghost" version of the number behind it to simulate phosphor persistence.
*   **CRT Toggle:** A UI switch to enable/disable scanline and flicker effects, styled as a chunky toggle with an "OFF/ON" text label.