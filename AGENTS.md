# AGENTS.md — angular20-playground

A low-poly farming game using Angular 20+ standalone + raw WebGPU (no Three.js).
Self-contained, single-project repo (not a monorepo). Personal project.

## Commands

| Command | What it does |
|---------|-------------|
| `npm start` | Dev server (port 4200) |
| `npm test` | Karma + Jasmine tests (watch mode) |
| `npm run test:ci` | Single-run tests via ChromeHeadless + code coverage — fastest way to surface compile errors |
| `npm run build` | Production build (Vite/esbuild via `@angular/build:application`) |
| `npm run watch` | `ng build --watch --configuration development` |

No linter, no formatter, no typecheck script (typechecking happens during build/test). Use `npm run test:ci` to quickly catch compile-time type errors without launching a browser UI.

## Conventions

- **Tabs, not spaces** (`.editorconfig` enforces `indent_style = tab`, `indent_size = 4`)
- **Standalone components only** — no `NgModule`, `bootstrapApplication()` in `main.ts`
- **Naming:** `app.ts` (not `app.component.ts`), `app.html` (template), `app.scss` (styles), `app.config.ts`
- **`styleUrl` (singular)** — Angular 17+ API, not `styleUrls`
- **No barrel files** — each file imported directly by path
- **`@Component({ standalone: true })` is implicit** in Angular 19+ but still explicit in this codebase via `standalone: true`

## Architecture

- **Entrypoint:** `src/main.ts` → `src/app/app.ts` (single root component, `AfterViewInit` boots WebGPU)
- **Scene graph:** Custom discriminated-union `Tree<T>` in `src/app/ds/tree.ts` (not a library)
- **Math:** `@thi.ng/matrices` + `@thi.ng/vectors` for 4x4 transforms, perspective, lookAt
- **Parser:** `parsimmon` for model ID parsing (animation targeting)
- **Shader:** WGSL in `public/assets/shaders/shader1.wgsl` — storage buffer (vertex data) + uniform buffer (view-projection matrix)
- **WebGPU types:** `@webgpu/types` via `/// <reference types="@webgpu/types" />` in root component
- **Assets:** Static meshes in `public/assets/rocks/` (OBJ files from BlockBench), shaders in `public/assets/shaders/`

## RxJS patterns

Heavy RxJS usage: `BehaviorSubject`, `ReplaySubject`, `animationFrames`, `combineLatest`, `switchMap` drive input handling, camera, resize, and render loop. `NgZone.runOutsideAngular()` wraps `ResizeObserver` to avoid unnecessary change detection. Render loop uses raw `requestAnimationFrame`, not Angular zone.

## Test quirks

- Jasmine + Karma (not Jest)
- `ChangeDetectionStrategy.OnPush` — tests must account for this if they assert on rendered output
- Only one test exists (`src/app/app.spec.ts` — basic existence smoke test)

## Key files

- `src/app/app.ts` — root component, WebGPU setup, render loop, input handling, scene update
- `src/app/models/scene.ts` — scene graph construction (Cuberman, terrain, carrots, fence poles)
- `src/app/models/unit.ts` — `Mesh`, `Model` types, `Universal` constants
- `src/app/models/geom.ts` — TRS transforms, world matrix, AABB
- `public/assets/shaders/shader1.wgsl` — the only shader (Lambertian diffuse + ambient)

## Requirements

- Node 20