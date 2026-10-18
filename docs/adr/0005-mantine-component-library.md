# 5. Use Mantine for UI components and styling

Date: 2026-10-18 · Status: proposed

## Context

The frontend needs forms with date pickers and field errors (trips, places, journal entries, expenses), tables (expenses, budget by category), modals (delete confirmation, expense form), file upload (cover photo, gallery), tabs, notifications and a full-screen photo viewer with arrows (US-09). One person builds every screen in one week, alongside the backend, so the screens must look consistent without hand-written CSS for each one. The layout is desktop only (architecture, Frontend conventions).

The options considered were:

- **Mantine**: a React and TypeScript component library with a theme object, form helpers, date inputs, a dropzone, a carousel and notifications as first-party packages.
- **Tailwind CSS with shadcn/ui**: utility classes and copy-in components. More visual freedom, but each component is assembled and maintained in the repository.
- **Plain CSS modules**: no dependency, but every input, table and modal is built by hand.

## Decision

Use Mantine with the default PostCSS setup. The packages used are:

| Package | Used for |
| --- | --- |
| `@mantine/core`, `@mantine/hooks` | Layout, inputs, tables, modals, tabs, badges |
| `@mantine/form` | Form state, and mapping DRF field errors onto inputs |
| `@mantine/dates` (with `dayjs`) | Trip, place, journal and expense dates |
| `@mantine/dropzone` | Cover photo and multi-photo upload, JPEG only (US-08) |
| `@mantine/carousel` (with `embla-carousel-react`) | Full-screen photo viewer (US-09) |
| `@mantine/notifications` | Save and delete confirmations, network errors |

- One theme in `src/theme.ts` sets the colours, fonts, radius and default component props. Components do not hard-code colours; they use theme tokens.
- Leaflet keeps its own CSS. Map popups and controls sit inside Mantine components, not the other way round.
- Rendered Markdown (US-07, US-09) is wrapped in `TypographyStylesProvider`, so headings and lists use the theme fonts.
- Fonts are installed as `@fontsource` packages and bundled with the app, so the site does not depend on a font CDN during the demo.
- The colours, fonts and screen layouts are described in [ui-design.md](../ui-design.md).

## Consequences

- Every screen gets consistent spacing, focus states and keyboard handling without custom CSS, so the week goes into features and tests instead.
- Form errors from the API are shown with `form.setErrors()`, which keeps the backend as the source of truth for business rules.
- The look is recognisably Mantine. The custom theme and fonts make it the project's own, but it will not be a bespoke design.
- Tests render components inside a test `MantineProvider`, and the Vitest setup has to stub `window.matchMedia` and `ResizeObserver`, which jsdom does not provide.
- Mantine has no Markdown editor or drag-and-drop list. The journal editor is a `Textarea` next to a live `react-markdown` preview, and the route order is changed with up and down buttons. This avoids two more dependencies.
