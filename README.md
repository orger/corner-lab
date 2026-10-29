# Corner Lab

An offline trainer for Mac and iPhone for deliberate 2×2 practice—CLL, EG1, EG2, AUF recognition, and one-looking—and 5×5 last-two-edges and last-two-centres algorithms.

## Run on iPhone

The touch-friendly web app is prepared for GitHub Pages at `cubing.orger.org`. Publishing the repository and configuring the domain are still required; these local changes do not make the site live.

Once published, open the site in Safari and use **Share → Add to Home Screen**. Open the resulting Corner Lab icon while online and wait for the offline-ready status before practising without a connection. All three trainers run on the phone, and each device keeps its own history. Use full JSON backups to transfer history from the Mac or protect it against cleared browser data; there is no automatic device sync.

See [iPhone installation and GitHub Pages setup](docs/IPHONE-GITHUB-PAGES.md) for the publishing, domain, offline, and backup steps.

## Run on this Mac

Open **`dist/Corner Lab.app`** in Finder. You can drag it to Applications if you wish. The app bundles everything it needs; no server, account, internet connection, or Node installation is required to use it. The supplied build targets Apple silicon and macOS 13 or later.

Start with the six selected CLL Sune cases, or open **Case library** to choose any subset. Click a case to choose an alternative or validate your own algorithm. In **Practice**, set recognition AUFs, finishing AUFs, starting grips, first-layer colors, and sampling focus. Tap Space to control the timer; there is no hold requirement. **Simple** timing uses two presses: start solve, then stop. **Inspection** timing uses three: start inspection, start solve, then stop. Inspection and solve times are stored separately. Manual solve-time entry is also available.

Timing is independent of Last layer / One-look case practice. Changing the case mode selects a suggested timing option, which you can adjust. Optional inspection audio is off by default and gives a single cue at eight seconds and a double cue at twelve seconds, once per threshold. Timing and audio choices are saved with your settings, practice presets, and results. N generates the next case; Escape cancels inspection or a running solve without saving a result.

For **One-look**, select first-face patterns from the supplied **2x2 FF Algorithms (First Face)** PDF independently of the CLL/EG cases. Its 36 named variants form 22 family cards under LS, DD, UD, and UU; choose whole families or individual variants. The trainer uses the PDF's primary solutions with your preferred **U+3** insertion. The default pair is **U-3** (`R U R'`) and adapted **U+3** (`R U' R'`). Independent recognition U-AUF and bottom-layer D rotations vary alignment around the same first-face pattern. A random None / U / U2 / U′ is added at the end of every one-look scramble. The reveal shows **Initial AUF** before the first-face finish and **Align bottom** afterward. Practice and Insights show average one-look inspection time and percentages strictly under 15, 12 and 8 seconds; Insights follows your filters. Previous history is preserved. Scramble from a solved cube with white down and green front, including every rotation shown.

**Learning** practice presents every selected case once per shuffled batch, then reshuffles the whole selection. A batch counter tracks your place, and training conditions still vary. Each trainer maintains its own batch while the app is running.

**Speed** practice uses the median of each case’s latest N clean solves matching the current algorithms and conditions. Adjust **Clean solves per case (N)** under Practice focus (default 20; 1–1,000). Fewer clean solves use what is available. Each trainer and saved practice remembers its own N; the progress chart window is separate.

**Insights** separates clean median speed, robust spread (MAD), slow-tail times (P90), and lapse rate. Filter by case, pattern, set, algorithm version, practice/timing mode, inspection cues, color, both U-AUFs, bottom-layer rotation, starting grip, first-face case/finish, session, or date. Inspection seconds are shown separately from solve time, and CSV exports retain timing/audio metadata. “Only selected practice cases” supports any custom subset. Individual results can be inspected and relabelled, and matching statistics can be reset without removing algorithm preferences.

**Full-set progress** includes **Range start** and **Range end** sliders to zoom to recent dates, with both axes rescaled and an **All time** reset. Zooming preserves the historical rolling averages.

The native app stores data in `~/Library/Application Support/Corner Lab/data.json`, with an atomic save and a previous-file backup. Use **Settings → Export full backup** regularly. JSON backups include preferences, presets, and all results; CSV exports contain the currently filtered results. The browser preview keeps its own separate storage.

Read [the user guide](docs/USER-GUIDE.md) for details.

## 5×5 last-two-edges practice

Select **5 × 5 · Last two edges** in the Trainer selector below the app name. This trainer includes all 13 cases from your supplied table. Each case defaults to its second-column solution and matching first-column setup. The 27 preserved strings also offer optional **Reverse direction** practice and row 3's **Other axis** choice, each with its own matching scramble. The two duplicate names are distinguished by “Rw setup” and “3Lw setup”; original names, parentheses, and half-turn-prime spelling remain in the catalog. Simulation verifies uniform centres and two unpaired edge groups, or one for the regular parity case. Optional varied setups change the moves while reaching exactly the same case.

## 5×5 last-two-centres practice

Select **5 × 5 · Last two centres** for the **19 unsolved cases** in your supplied CubeSkills *5x5 L2C Algorithms (Last Two Centers)* PDF. The sheet's solved reference is omitted from timed practice. **Case library** lets you select cases individually or in three groups: **1 centre**, **2 centres**, and **3 centres**, counting displaced pieces on each remaining face. Every case starts with four solved centres and a solved 2×3 front-centre block in the reference grip.

The printed PDF sequence is the solution; its inverse generates the default setup. Optional **Varied equivalent setup** reaches exactly the same pattern using a different sequence. The source's `M` turns only the middle slice in the same direction as `L`; generated setups write this explicitly as `3Lw Lw′`. Diagrams use the app's yellow/green palette for the same patterns shown red/blue in the PDF. Both 5×5 trainers share the timing, inspection cues, practice focus, and filtered statistics tools. Centres, edges, and 2×2 selections, saved practices, and histories stay separate, and full backups contain all three. Read the [5×5 guide](docs/5X5-GUIDE.md) for notation and practice details.

## Coverage and validation

- 129 cases: 43 per set, including all oriented-top / PLL outcomes and CLL's solved case.
- 486 distinct, verified initial algorithm choices; personal choices are checked with exact cube simulation.
- Complete coverage of all 648 legal upper-layer corner states for each fixed bottom permutation.
- 36 named first-face patterns in the supplied PDF's 22 families, with its primary 1/3/4/5-move solutions; 9 printed secondary choices are retained in the data catalog.
- 13 supplied 5×5 last-two-edges cases with 27 direction/axis choices, and 19 CubeSkills last-two-centres cases verified against both pages of the supplied PDF.
- Every generated scramble has a complete, simulator-verified solution. These are case-training scrambles, not competition random-state scrambles.
- Results are timed and flagged by the solver; there is no smart-cube connection or automatic solve detection.

See [sources and case conventions](docs/SOURCES.md). Source names follow Alg-Trainers; numbering on other sites can differ. All first layers are trained on the bottom.

## Development

The interface uses browser-native ES modules, HTML, and CSS. The macOS shell uses Swift, AppKit, and WKWebView. There are no third-party runtime package dependencies.

```sh
npm test
npm run dev       # local browser preview at http://127.0.0.1:8765
npm run build:web # GitHub Pages files in dist/web
npm run package:web # Website and repository ZIP files in dist/
npm run build:mac # Apple Command Line Tools / Xcode required
```

`scripts/build-mac.sh` creates the app bundle and icon, copies offline resources and license notices, and applies a local ad hoc signature. Build on another architecture to target it. Public distribution to other Macs would need appropriate developer signing and notarization.

Tests cover move physics, inverse solutions, every catalog alternative, exhaustive case coverage, all AUF combinations, colors/grips, valid first-layer completions, controller sampling, personal algorithm validation, robust statistics, and backup integrity. A native smoke harness checks actual WebKit module loading and persistence separately.

## License

GPL version 3. Includes adapted algorithm data from Malte Ihlefeld’s Alg-Trainers and mapped choices from J Perm. See [LICENSE](LICENSE), [NOTICE](NOTICE), and [source documentation](docs/SOURCES.md). No warranty.
