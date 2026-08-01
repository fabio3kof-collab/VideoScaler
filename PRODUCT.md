# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Ships as a Windows desktop application; the interface itself is a web UI inside a desktop shell, so web design conventions apply rather than iOS/Android native ones.

## Stack

Delegated to Claude. Chosen: **Electron + React + Vite + TypeScript**, with FFmpeg bundled as the processing engine and `electron-builder` for Windows packaging.

Reasoning: the product requires local filesystem access, large-file handling, and a bundled native binary (FFmpeg) — all of which rule out a pure browser app. Electron was chosen over Tauri because it ships a bundled FFmpeg and a Windows installer without requiring a Rust toolchain on the user's machine, because the ecosystem for driving FFmpeg from Node is mature, and because `electron-updater` gives the required install-and-auto-update loop out of the box. Recorded tradeoff: Electron's own bundle is heavy (~120–200 MB), which sits awkwardly with a product about making files lighter. If bundle size later becomes a product-level concern, Tauri is the migration target and the React/TypeScript UI layer carries over.

The user delegated the language and the starting approach to Claude, with one binding condition: it must be a desktop application.

## Users

Everyday users compressing their own media as a routine task ("para uso diario"), on Windows, working with local files. They are not necessarily video professionals, but they are willing to touch settings: the user explicitly wants every characteristic that affects file weight exposed as an option, not hidden behind a single automatic button.

The recurring situation is a file that is too big for where it needs to go — an upload cap, an attachment limit, a storage budget, a sharing platform's ceiling — and must be made to fit without looking obviously degraded.

## Product Purpose

VideoScaler reduces the file size of videos (and images) while losing as little perceptible quality as possible, sized to fit a specific space requirement.

Success is a file that meets the size constraint and that the user is willing to ship without feeling they ruined it.

## Positioning

Most compression tools optimize for one click and hide the levers; professional encoders expose the levers but assume codec expertise. VideoScaler's position is the middle that is usually missing: **every parameter that affects weight is present and adjustable, organized for daily use, oriented around a target size rather than an abstract quality slider.**

The claim a neighboring product could not truthfully copy is the combination — full parameter surface + size-budget framing + local, routine, non-professional daily use.

## Operating Context

- Windows desktop, local files, files brought in from the file system (drag-and-drop is the expected entry point for this class of tool — *assumption, not confirmed*).
- The work is repetitive: the same user compresses media regularly, often against the same constraints.
- Both video and image files are in scope per the user's answer ("bajar el peso de videos o imagenes").
- Output is a new local file the user then uploads, attaches, or stores elsewhere. VideoScaler is a step in a workflow, not the destination.

## Capabilities and Constraints

Confirmed:

- Reduce file weight of video, and of images, with minimum quality loss.
- **Video first.** Video is the first scope ("en primera instancia un bajador de peso de los videos"); images are a planned second scope in the same product, not a parallel v1 concern.
- Expose options across *all* characteristics that affect weight, for both video and images — the breadth of user-manipulable control is a product requirement, not a power-user afterthought.
- Compression is targeted at a space requirement (a size the output must fit).
- Runs as a Windows desktop app; processing is local.
- **Installable and easily updatable.** The app must install onto the user's computer and pick up every change with minimal friction. Packaging and the update path are day-one constraints, not release-time chores.

Assumed by Claude, pending confirmation (flagged so future work does not treat these as decided):

- FFmpeg as the underlying encoder for video, which sets the realistic parameter surface: container, video codec, CRF/quality mode, bitrate mode (CBR/VBR/two-pass), resolution, frame rate, audio codec/bitrate/channels, and preset/speed.
- Files stay on the user's machine; nothing is uploaded.

Explicitly undecided:

- Batch processing (many files at once) versus one file at a time.
- Which codecs are offered (H.264 / H.265 / AV1 / VP9) and whether GPU-accelerated encoding is supported.
- Whether presets, saved profiles, or history exist alongside manual control.
- Preview / before-after comparison of quality loss.
- Licensing, pricing, and distribution.

## Brand Commitments

Working name: **VideoScaler** (from the project directory; not confirmed by the user as final).

Open naming issue to raise before any identity work: the name reads as *upscaling*, while the product downscales and compresses. Future work must not resolve this silently in either direction.

No logo, colors, typography, voice, or identity constraints have been established. None exist to preserve.

## Evidence on Hand

None. The project directory is empty apart from tooling configuration — no code, copy, assets, logo, screenshots, benchmarks, users, testimonials, or performance data.

Future work must not fabricate compression ratios, speed claims, quality comparisons, user counts, testimonials, or pricing. Any such figure must come from the user or from a real measured build.

## Product Principles

1. **Every weight lever is visible.** The user asked for options on all characteristics that reduce file weight. Hiding controls to look clean is a failure of the brief, not a simplification.
2. **The size target is an input, not an outcome.** The user arrives with a constraint to satisfy; the product should accept that number and work backward from it.
3. **The quality tradeoff must be judgeable before committing.** "Minimum quality loss" is only meaningful if the user can see what they are giving up.
4. **Built for repetition.** This is a daily-use utility, not a one-time wizard. Repeat work should cost fewer actions the second time.
5. **Local and private by default.** Processing happens on the user's machine; this is a property to protect, not trade away for convenience.
6. **Shipping is part of the product.** The app installs and updates itself cheaply. Any decision that makes the update loop expensive is a decision against the product.
