# PresenSI Design System Specification (`DESIGN.md`)

> **Reference Benchmark:** `https://huggingface.co/spaces/joelniklaus/harness-leaderboard`
> **Aesthetic Direction:** Warm Editorial Neo-Brutalist Paper & Ink
> **Scope:** Complete visual overhaul of `frontend/` while preserving 100% of existing business logic, API contracts, face-recognition/GPS pipelines, and state flows.

---

## 1. Visual Philosophy & Core Principles

1. **Warm Paper & Charcoal Ink:** Replace sterile white/zinc SaaS surfaces with warm newsprint ground (`#E9E6DD`) and raised cream paper panels (`#FBF8F1`), anchored by deep charcoal ink (`#232323`).
2. **Crisp 2px Outlines & Hard Offset Shadows:** No blurry `shadow-md` or translucent glassmorphism cards. Every primary container, button, chip, and modal uses a crisp `2px solid var(--edge)` border paired with a solid hard offset shadow (`2px 2px 0` to `6px 6px 0 var(--shadow)`).
3. **Tactile Micro-Interactions:** Interactive controls (chips, buttons, pills, selects) lift subtly on hover (`translate(-1px, -1px)`) and press down on active (`translate(1px, 1px)`), giving physical paper-craft feedback.
4. **Signature Yellow Accent (`#FFD21E`):** Used deliberately for active navigation pills, primary CTAs, `<mark>` hero highlights, key KPI tiles, active filter chips, and progress bars. Text on yellow ALWAYS uses `--on-yellow` (`#232323`) in both Light and Dark themes.
5. **Dual Theme (Light & Warm Dark Mode):** First-class warm charcoal dark mode (`#1D1C19` ground, `#272622` surface, `#DCD7CB` off-white ink, `#78746B` 3:1+ outlines, `#EDC536` softened yellow) with zero flash of unstyled content (pre-paint `<script>` in `index.html`).
6. **Expressive + Technical Typography Triad:**
   - **Display (`Chewy`):** Warm, approachable, distinctive headers (`h1`, `h2`, `h3`, hero brand title, KPI numerals, modal titles).
   - **Body (`Source Sans 3`):** High-legibility humanist sans for forms, explanations, UU PDP copy, and table descriptions.
   - **Mono (`IBM Plex Mono`):** Uppercase nav pills, badges, table headers, NIMs, timestamps, GPS coordinates, cosine similarity scores, and technical metadata.

---

## 2. Design Tokens (CSS Custom Properties)

### Light Theme (`:root`)
| Token | Hex / Value | Role |
|---|---|---|
| `--bg` | `#E9E6DD` | Page canvas (warm stone/newsprint) |
| `--surface` | `#FBF8F1` | Raised panels, cards, inputs, modals |
| `--ink` | `#232323` | Primary text, icons |
| `--soft` | `#55524B` | Secondary text, labels, inactive nav |
| `--muted` | `#8C8C8C` | Tertiary captions, placeholders |
| `--line` | `#D8D3C8` | Inner table/list hairlines (`1px`) |
| `--paper` | `#FFF1C6` | Butter-paper highlight (info callouts, best cells, version badges) |
| `--yellow` | `#FFD21E` | Primary brand accent (active nav, primary CTA, key stat tile, `<mark>`) |
| `--orange` | `#FF9D00` | Secondary warm highlight |
| `--blue` | `#3B7CF6` | Link / info accent |
| `--red` | `#EF3E36` | Destructive / error indicator |
| `--green` | `#3E8E5E` | Success / verified indicator |
| `--pink` | `#F6C7C4` | Error / rejected / warning tint surface |
| `--mint` | `#CDEBD6` | Success / verified / completed tint surface |
| `--edge` | `#232323` | Crisp `2px` border color |
| `--shadow` | `#232323` | Hard offset shadow color |
| `--topbar` | `rgba(233, 230, 221, 0.92)` | Sticky topbar backdrop |
| `--hover` | `#F5F0E3` | Table row / menu item hover |
| `--best-hover` | `#FCE9A9` | Highlighted row hover |
| `--tip` | `#232323` | Dark tooltip / code block background |
| `--tip-ink` | `#F4EFE3` | Dark tooltip / code block text |
| `--on-yellow` | `#232323` | Text & border on `--yellow` (invariant across themes) |
| `--on-yellow-soft` | `#55524B` | Secondary text on `--yellow` (invariant across themes) |

### Dark Theme (`:root[data-theme="dark"]`)
| Token | Hex / Value | Role |
|---|---|---|
| `--bg` | `#1D1C19` | Warm dark charcoal ground |
| `--surface` | `#272622` | Raised warm dark panel |
| `--ink` | `#DCD7CB` | Warm off-white text (~11:1 contrast) |
| `--soft` | `#ADA79A` | Secondary text (~6:1 contrast) |
| `--muted` | `#948F84` | Tertiary text |
| `--line` | `#3E3C37` | Inner dividers |
| `--paper` | `#3D3624` | Dark butter-paper highlight |
| `--yellow` | `#EDC536` | Slightly dimmed brand yellow |
| `--blue` | `#5B93F8` | Dark-mode info blue |
| `--red` | `#F26B63` | Dark-mode danger red |
| `--green` | `#4FA571` | Dark-mode success green |
| `--pink` | `#4F2B29` | Dark-mode danger/warning tint surface |
| `--mint` | `#1F3D2B` | Dark-mode success tint surface |
| `--edge` | `#78746B` | 3:1+ crisp border outline |
| `--shadow` | `#0E0D0B` | Deep offset shadow |
| `--topbar` | `rgba(29, 28, 25, 0.90)` | Sticky dark topbar |
| `--hover` | `#312F2B` | Row/item hover |
| `--best-hover` | `#4A3F22` | Highlighted row hover |
| `--tip` | `#34322D` | Tooltip / code block surface |

---

## 3. Typography Scale & Usage

Loaded via Google Fonts in `frontend/index.html`:
`IBM Plex Mono (400, 500, 600)` + `Source Sans 3 (400, 600, 700)` + `Chewy (400)`
Plus metric-adjusted local fallback `@font-face` declarations in `frontend/src/index.css`.

| Element | Font Family | Size | Weight | Tracking / Case |
|---|---|---|---|---|
| Page Hero / Brand Title (`h1`) | `var(--display)` (`Chewy`) | `28px–44px` | `400` | `line-height: 1.0`, tight |
| Section Header (`h2`) | `var(--display)` (`Chewy`) | `22px–30px` | `400` | `line-height: 1.1` |
| Card / Modal Title (`h3`) | `var(--display)` (`Chewy`) | `19px–22px` | `400` | `line-height: 1.15` |
| KPI Big Metric | `var(--display)` (`Chewy`) | `24px–32px` | `400` | `line-height: 1.05` |
| Body Copy | `var(--body)` (`Source Sans 3`) | `14px–16px` | `400 / 600` | `line-height: 1.5` |
| Nav Switch / Tab Pills | `var(--mono)` (`IBM Plex Mono`) | `11px–12px` | `500 / 600` | `uppercase`, `+0.05em` |
| Table Headers (`th`) | `var(--mono)` (`IBM Plex Mono`) | `10px–11px` | `500 / 600` | `uppercase`, `+0.04em` |
| Status Tags / Badges | `var(--mono)` (`IBM Plex Mono`) | `10px–11px` | `600` | `uppercase`, `+0.04em` |
| Technical Data (NIM, GPS, Similarity, Time) | `var(--mono)` (`IBM Plex Mono`) | `12px–13px` | `400 / 600` | `tabular-nums` |

---

## 4. Component Primitives (`frontend/src/index.css`)

| Class | Specification | Usage |
|---|---|---|
| `.hlb-panel` | `bg: var(--surface)`, `border: 2px solid var(--edge)`, `radius: 16px`, `shadow: 6px 6px 0 var(--shadow)` | Main page cards, auth card, tables container, modals |
| `.hlb-tile` | `bg: var(--surface)`, `border: 2px solid var(--edge)`, `radius: 12px`, `shadow: 4px 4px 0 var(--shadow)` | KPI summary tiles, sub-cards, status cards |
| `.hlb-tile-key` | `.hlb-tile` + `bg: var(--yellow)`, `color: var(--on-yellow)` | Primary highlighted KPI tile (e.g., accuracy, active session) |
| `.hlb-switch` | `bg: var(--surface)`, `border: 2px solid var(--edge)`, `radius: 999px`, `padding: 4px`, `shadow: 3px 3px 0 var(--shadow)` | Sticky desktop navbar segmented pill & Login/Register mode switch |
| `.hlb-switch-item` | `font: var(--mono)`, `uppercase`, `radius: 999px`; active `.on`: `bg: var(--yellow)`, `color: var(--on-yellow)`, `font-weight: 600` | Nav links, segmented tabs |
| `.hlb-chip` | `bg: var(--surface)`, `border: 2px solid var(--edge)`, `radius: 999px`, `shadow: 2px 2px 0 var(--shadow)`, tactile hover lift | Filter pills, course tags, quick actions |
| `.hlb-chip-on` | `bg: var(--yellow)`, `color: var(--on-yellow)`, `border-color: var(--on-yellow)`, `font-weight: 600` | Selected chip/filter |
| `.hlb-btn-primary` | `bg: var(--yellow)`, `color: var(--on-yellow)`, `border: 2px solid var(--on-yellow)`, `radius: 12px`, `shadow: 3px 3px 0 var(--shadow)`, `font: 600 var(--mono)` | Primary CTA (Submit Presensi, Login, Create Session, Approve) |
| `.hlb-btn-ink` | `bg: var(--ink)`, `color: var(--surface)`, `border: 2px solid var(--edge)`, `radius: 12px`, `shadow: 3px 3px 0 var(--shadow)` | High-contrast secondary CTA |
| `.hlb-btn-secondary` | `bg: var(--surface)`, `color: var(--ink)`, `border: 2px solid var(--edge)`, `radius: 12px`, `shadow: 2px 2px 0 var(--shadow)` | Cancel, Reset, Export, Back |
| `.hlb-btn-danger` | `bg: var(--pink)`, `color: var(--ink)`, `border: 2px solid var(--edge)`, `radius: 12px`, `shadow: 2px 2px 0 var(--shadow)` | Reject, Delete, Logout |
| `.hlb-input` | `bg: var(--surface)`, `color: var(--ink)`, `border: 2px solid var(--edge)`, `radius: 12px`, focus `outline: 2px solid var(--focus)` | Text inputs, selects, textareas |
| `.hlb-tag` | `border: 1.5px solid var(--edge)`, `radius: 999px`, `font: 600 10px var(--mono)`, `uppercase`; variants `.ok` (`--mint`), `.warn` (`--pink`), `.accent` (`--yellow`), `.paper` (`--paper`), `.neutral` (`--line`) | Attendance status (`AUTO_PRESENT`, `PENDING_REVIEW`, `REJECTED`), role badges, GPS zone tags |
| `.hlb-alert` | `border: 2px solid var(--edge)`, `radius: 12px`, `shadow: 4px 4px 0 var(--shadow)`, variants `.info` (`--paper`), `.danger` (`--pink`), `.success` (`--mint`) | Banners, UU PDP notices, error/success alerts |
| `.hlb-table` | Full-width separated table, `2px solid var(--edge)` header underline, `1px solid var(--line)` row dividers, `var(--hover)` row highlight | History table, Benchmark M1–M6 table, Sessions list |
| `.hlb-progress` | `height: 10px`, `border: 2px solid var(--edge)`, `radius: 999px`, `bg: var(--bg)`, inner bar `bg: var(--yellow)` | Similarity score bars, attendance progress |
| `.hlb-theme-btn` | `32px × 32px` circle, `bg: var(--surface)`, `border: 2px solid var(--edge)`, `shadow: 2px 2px 0 var(--shadow)` | Light/Dark theme toggle |

---

## 5. Page-by-Page Mapping

- **Global Chrome (`App.tsx`, `Navbar.tsx`, `MobileBottomNav.tsx`):**
  - Sticky blurred topbar (`var(--topbar)`) with Brand mark (Chewy title + `<mark>` yellow pill/badge), centered `.hlb-switch` pill navigation, right-side user pill + circular Light/Dark theme toggle + Logout button.
  - Mobile bottom bar with `2px solid var(--edge)` top border, warm surface, active yellow pill indicator.
  - Footer in `var(--mono)` centered/split colophon style.
- **Auth (`LoginPage.tsx`):**
  - Centered warm paper hero with Chewy `PresenSI` title + `<mark>` highlight + UU PDP version pill (`UU PDP 27/2022`), `.hlb-panel` card with `.hlb-switch` login/register toggle, tactile inputs, yellow primary CTA, top-right theme toggle.
- **Student Presensi (`PresensiPage.tsx`, `CameraCapture.tsx`, `GpsMapCard.tsx`, `PresensiStatusCard.tsx`, `CourseSelect.tsx`, `AttendanceSuccessModal.tsx`, `ResultCard.tsx`, `UuPdpExplainer.tsx`):**
  - Clear editorial header, tactile `.hlb-panel` camera frame with crisp 2px border and mono HUD overlay, GPS map card with `.hlb-tag` radius indicator, UU PDP collapsible `<details>` (FAQ style from reference!), bold verification status modal.
- **Lecturer Pages (`SessionsPage.tsx`, `OversightPage.tsx`, `LecturerResolveModal.tsx`, `BenchmarkPage.tsx`, `BenchmarkDetailModal.tsx`):**
  - `BenchmarkPage` directly channels the Harness Leaderboard aesthetic: 4-column `.hlb-tile` KPI strip (first tile `.hlb-tile-key` yellow), horizontal similarity bar visualizations with crisp 2px borders, and `.hlb-table` leaderboard of M1–M6 cases with rank numbers in `Chewy` display font!
  - `OversightPage` & `SessionsPage`: tactile cards, `.hlb-tag` status pills, crisp filter chips, side-by-side face comparison panel in `LecturerResolveModal`.
- **History, Register & Profile (`HistoryPage.tsx`, `RegisterPage.tsx`, `ProfilePage.tsx`):**
  - Consistent `.hlb-panel` cards, `.hlb-chip` filters, `.hlb-table` data views, `.hlb-alert` privacy/consent boxes.

---

## 6. Strict Logic Preservation Invariant

The following files and behaviors MUST NOT be altered:
- `backend/**` — untouched.
- `frontend/src/api.ts`, `frontend/src/auth.ts`, `frontend/src/config.ts`, `frontend/src/types.ts`, `frontend/src/utils/geo.ts` — untouched.
- All React state, `useEffect`, `useCallback`, API calls, props interfaces, form validation logic, camera stream/canvas capture, GPS geolocation/Haversine checks, and role-based routing in `App.tsx` — preserved verbatim.
