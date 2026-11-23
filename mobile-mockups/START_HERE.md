# BarnBuddy full mobile mockups

Open **BarnBuddy_Mobile_Screen_Atlas.pdf** and choose Light or Dark beside a section. Use **View Dark** or **View Light** on any board to jump to its matching board. Each screen ID matches the filename in both themes.

| Use | Open |
| --- | --- |
| Review all ten areas | BarnBuddy_Mobile_Screen_Atlas.pdf |
| Implement in Codex | BUILD_WITH_CODEX.md and SCREEN_MAP.json |
| Verify the current URL coverage | ROUTE_COVERAGE.csv |
| Inspect a light screen | PNG/ at 780 × 1688 or SVG/ at 390 × 844 |
| Inspect its dark version | PNG/Dark/ or SVG/Dark/ with the same filename |
| Edit native layers | Figma/ desktop importer below |

## Bring the designs into Figma

1. Open a Figma Design file in Figma Desktop on Windows or Mac.
2. Choose **Plugins → Development → Import plugin from manifest**, then select **Figma/manifest.json** from the unzipped folder.
3. Run **BarnBuddy Full Mobile Mockups** from the Development menu. It creates ten pages with side-by-side light and dark frames, editable text, shapes and vector icons.
4. If your workspace requires an assigned development plugin ID, use **Plugins → Development → New plugin** to create a local Run once plugin. Keep the Figma-generated manifest and replace its main JavaScript file with **Figma/code.js**. Run that local plugin.

For direct import, drag the SVG files into a Figma Design file. The native-layer importer recreates separate text layers and uses Inter. The screens are static design references using sample data. The desktop importer was structurally verified locally. It was not executed in Figma Desktop.

Figma reference: https://developers.figma.com/docs/plugins/plugin-quickstart-guide/
