# Spec → BRD Requirement Mapping — Real AI Integration

## Spec Inventory

| Spec | Title | Prerequisites | BRD Features |
|------|-------|--------------|-------------|
| SPEC-024 | Model Manager + SAM Segmentation | None | AI-F1 |
| SPEC-025 | SD 1.5 + ControlNet Visualization | SPEC-024 | AI-F2 |
| SPEC-026 | Prompt Engineering & Quality Presets | SPEC-025 | AI-F3 |

## Coverage Check

| BRD Feature | Covered In Spec(s) | Status |
|------------|-------------------|--------|
| AI-F1 — Real SAM Segmentation | SPEC-024 | Covered |
| AI-F2 — Real SD + ControlNet | SPEC-025 | Covered |
| AI-F3 — Prompt Engineering + Quality | SPEC-026 | Covered |

## Design Constraint Coverage

| DC # | Constraint | Covered In Spec(s) |
|------|-----------|-------------------|
| AI-DC-1 | Lazy model download | SPEC-024 |
| AI-DC-2 | Download progress logging | SPEC-024 |
| AI-DC-3 | Fallback to mock on failure | SPEC-024, SPEC-025 |
| AI-DC-4 | Model version tracking | SPEC-024, SPEC-025 |
| AI-DC-5 | Memory management (unload idle) | SPEC-024 |
| AI-DC-6 | All prior constraints | All |

## Uncovered Requirements
None.
