# Corner Lab

## Blind Memo Lab

The separate letter-pair and blindfold memo trainer is in `app/blind/`. It uses the
supplied memo words, reaction timing, Good / Wrong / Change ratings, weighted
spaced practice, editable memos, and complete corner/edge trace exercises. It has
independent storage and backups. Open `dist/Blind Memo Lab.app` for the Mac app;
the matching iPhone website is built in `dist/blind-web`, configured for
`blind.orger.org`. The domain needs hosting and DNS setup before it is live.

Run `npm run build:blind:mac` to build both versions, or read the
[Blind Memo Lab guide](docs/BLIND-MEMO-GUIDE.md) for installation and conventions.

An offline trainer for Mac and iPhone covering 2×2 CLL, EG1, EG2, AUF recognition and one-looking; 5×5 last two edges and last two centres; Square-1 cube shape, OBL and EP; and Skewb first layer and NS2.

Choose **Square‑1 · Cube shape** from the trainer menu for all 169 non-cube shape pairs, disguised or inverse setups, independently randomised final layer positions, case selection, timers, learning batches and separate statistics. See the [user guide](docs/USER-GUIDE.md#square-1-cube-shape).

Version **1.9.0** adds **Skewb · First layer**: all **81 legal cases** with the bottom centre and both rear-bottom corners solved. The 80 unsolved cases are selected by default, with an optional solved skip. Choose case subsets and preferred solutions, practise with varied scrambles, and track timing, inspection and full-set progress separately from NS2. Existing histories and preferences are preserved.

## Run on iPhone

Web releases target GitHub Pages at `cubing.orger.org`. Updating the source in the existing repository publishes a new version; an installed iPhone app offers an Update button when it is ready.

Once published, open the site in Safari and use **Share → Add to Home Screen**. Open the resulting Corner Lab icon while online and wait for the offline-ready status before practising without a connection. All eight trainers run on the phone, and each device keeps its own history. Use full JSON backups to transfer history from the Mac or protect it against cleared browser data; there is no automatic device sync.

See [iPhone installation and GitHub Pages setup](docs/IPHONE-GITHUB-PAGES.md) for the publishing, domain, offline, and backup steps.

## Run on this Mac

Open **`dist/Corner Lab.app`** in Finder. You can drag it to Applications if you wish. The app bundles everything it needs; no server, account, internet connection, or Node installation is required to use it. The supplied build targets Apple silicon and macOS 13 or later.

Start with the six selected CLL Sune cases, or open **Case library** to choose any subset. Click a case to choose an alternative or validate your own algorithm. In **Practice**, set recognition AUFs, finishing AUFs, starting grips, first-layer colors, and sampling focus. Tap Space to control the timer; there is no hold requirement. **Simple** timing uses two presses: start solve, then stop. **Inspection** timing uses three: start inspection, start solve, then stop. Inspection and solve times are stored separately. Manual solve-time entry is also available.

Timing is independent of Last layer / One-look case practice. Changing the case mode selects a suggested timing option, which you can adjust. Optional inspection audio is off by default and gives a single cue at eight seconds and a double cue at twelve seconds, once per threshold. Timing and audio choices are saved with your settings, practice presets, and results. N generates the next case; Escape cancels inspection or a running solve without saving a result.

For **One-look**, select first-face patterns from the supplied **2x2 FF Algorithms (First Face)** PDF independently of the CLL/EG cases. Its 36 named variants form 22 family cards under LS, DD, UD, and UU; choose whole families or individual variants. The trainer uses the PDF's primary solutions with your preferred **U+3** insertion. The default pair is **U-3** (`R U R'`) and adapted **U+3** (`R U' R'`). Independent recognition U-AUF and bottom-layer D rotations vary alignment around the same first-face pattern. A random None / U / U2 / U′ is added at the end of every one-look scramble. The reveal shows **Initial AUF** before the first-face finish and **Align bottom** afterward. Practice and Insights show average one-look inspection time and percentages strictly under 15, 12 and 8 seconds; Insights follows your filters. Previous history is preserved. Scramble from a solved cube with white down and green front, including every rotation shown.

**Learning** practice presents every selected case once per shuffled batch, then reshuffles the whole selection. A batch counter tracks your place, and training conditions still vary. Each trainer maintains its own batch while the app is running.

**Speed** practice uses the median of each case’s latest N clean solves matching the current algorithms and conditions. Adjust **Clean solves per case (N)** under Practice focus (default 20; 1–1,000). Fewer clean solves use what is available. Each trainer and saved practice remembers its own N; the progress chart window is separate.

**Slowest N algs** and **Fastest N algs** draw equally from up to N of your selected algorithms, ranked by recent clean median time. Set **Number of algorithms (N)** (default 5) and **Recent clean solves per algorithm** (default 20) separately. Rankings use your current preferred algorithms and practice conditions and update after each result. Cases without matching clean times are excluded when measured cases exist; with no matching times, the trainer mixes your selection until a baseline exists.

The **Where to focus** table in Insights uses **Recent solves per algorithm** (default 20; 1–1,000), independently of the practice lookback. Each algorithm version gets its own window after filters; flagged results count toward this window, while the displayed clean average and median exclude failures and assistance. Grouping combines those recent windows. Charts, full history, CSV exports and resets retain all matching results.

**Insights** separates clean median speed, robust spread (MAD), slow-tail times (P90), and lapse rate. Filter by case, pattern, set, algorithm version, practice/timing mode, inspection cues, color, both U-AUFs, bottom-layer rotation, starting grip, first-face case/finish, session, or date. Inspection seconds are shown separately from solve time, and CSV exports retain timing/audio metadata. “Only selected practice cases” supports any custom subset. Individual results can be inspected and relabelled, and matching statistics can be reset without removing algorithm preferences.

**Full-set progress** includes **Range start** and **Range end** sliders to zoom to recent dates, with both axes rescaled and an **All time** reset. Zooming preserves the historical rolling averages.

The native app stores data in `~/Library/Application Support/Corner Lab/data.json`, with an atomic save and a previous-file backup. Use **Settings → Export full backup** regularly. JSON backups include preferences, presets, and all results; CSV exports contain the currently filtered results. The browser preview keeps its own separate storage.

Read [the user guide](docs/USER-GUIDE.md) for details.

## 5×5 last-two-edges practice

Select **5 × 5 · Last two edges** in the Trainer selector below the app name. This trainer includes all 13 cases from your supplied table. Each case defaults to its second-column solution and matching first-column setup. The 27 preserved strings also offer optional **Reverse direction** practice and row 3's **Other axis** choice, each with its own matching scramble. The two duplicate names are distinguished by “Rw setup” and “3Lw setup”; original names, parentheses, and half-turn-prime spelling remain in the catalog. Simulation verifies uniform centres and two unpaired edge groups, or one for the regular parity case. Optional varied setups change the moves while reaching exactly the same case.

## 5×5 last-two-centres practice

Select **5 × 5 · Last two centres** for the **19 unsolved cases** in your supplied CubeSkills *5x5 L2C Algorithms (Last Two Centers)* PDF. The sheet's solved reference is omitted from timed practice. **Case library** lets you select cases individually or in three groups: **1 centre**, **2 centres**, and **3 centres**, counting displaced pieces on each remaining face. Every case starts with four solved centres and a solved 2×3 front-centre block in the reference grip.

The printed PDF sequence is the solution; its inverse generates the default setup. Optional **Varied equivalent setup** reaches exactly the same pattern using a different sequence. The source's `M` turns only the middle slice in the same direction as `L`; generated setups write this explicitly as `3Lw Lw′`. Diagrams use the app's yellow/green palette for the same patterns shown red/blue in the PDF. Both 5×5 trainers share the timing, inspection cues, practice focus, and filtered statistics tools. Selections, saved practices and histories stay separate for all eight trainers, and full backups include them all. Read the [5×5 guide](docs/5X5-GUIDE.md) for notation and practice details.

## Square-1 OBL and EP

Choose **Square‑1 · OBL** to orient both square layers. Its **185 cases** include the EO cases; stop when each square layer has one face colour. Permutation and the middle layer are outside this step. Choose **Square‑1 · EP** to finish edge permutation after orientation and corner permutation. All **99 cases**, including **50 parity cases**, are available; follow the full solution to finish the puzzle, including any equator correction.

Start both trainers from a fully solved Square-1, **white up and green front**, with the slice alignment shown in the reference diagram. Disguised setups vary the route to the selected case while preserving what the chosen algorithm needs. Independent final top/bottom quarter turns vary recognition; the reveal includes their alignment. OBL uses face-colour diagrams, while EP also shows the side stickers. See the [stage guide](docs/USER-GUIDE.md#square-1-obl-and-ep).

## Skewb first layer

Choose **Skewb · First layer** to finish the bottom layer from two solved rear corners and a solved bottom centre. Start solved with **white up, green front and yellow down**. Both setups and solutions use **NS notation** (uppercase for top corners, lowercase for bottom corners), shown in Settings. Complete the bottom layer including the corner side colours; the other centres and upper corners may remain mixed.

The catalogue includes **81 cases**: each missing corner has three available positions and three orientations, giving **9 × 9**. The **80 unsolved cases** include situations with a third corner already solved; the skip is optional. Select recognition groups or individual cases. Shortest solutions take **one to five turns**. Disguised scrambles vary the route and irrelevant pieces while preserving the case. The trainer includes algorithm choices, Learning batches, both timers, recent-speed focus, inspection statistics and its own full-set progress chart. See the [first-layer guide](docs/USER-GUIDE.md#skewb-first-layer).

## Skewb NS2

Choose **Skewb · NS2** for **134 NS2 cases** in 20 pattern groups. Start solved, **white up and green front**, and apply the setup in **WCA Skewb notation**. The completed side is then on the bottom; its colour varies. Stop when the whole Skewb is solved.

Solutions use **explicit NS notation**, where uppercase and lowercase letters turn different corners. This differs from the WCA notation used for setups; Settings and the [NS2 guide](docs/USER-GUIDE.md#skewb-ns2) show the corner mappings. Hammer shorthand is expanded into individual turns. Disguised mode chooses among 20 verified equivalent setups per case. The source's separate EG2 cases are excluded.

## Coverage and validation

- 129 cases: 43 per set, including all oriented-top / PLL outcomes and CLL's solved case.
- 486 distinct, verified initial algorithm choices; personal choices are checked with exact cube simulation.
- Complete coverage of all 648 legal upper-layer corner states for each fixed bottom permutation.
- 36 named first-face patterns in the supplied PDF's 22 families, with its primary 1/3/4/5-move solutions; 9 printed secondary choices are retained in the data catalog.
- 13 supplied 5×5 last-two-edges cases with 27 direction/axis choices, and 19 CubeSkills last-two-centres cases verified against both pages of the supplied PDF.
- Square-1 includes 169 cube-shape cases, 185 OBL cases with 641 algorithm choices, and 99 EP cases with 169 choices, including all 50 parity cases.
- Skewb first layer includes all 81 legal cases with the rear-bottom corners and bottom centre solved, with 80 unsolved cases selected by default.
- Skewb NS2 includes 134 NS2 cases in 20 groups with verified algorithm choices, including Pure Pi and the single-sledge/hedge cases; the source's separate EG2 set is excluded.
- Generated scrambles are checked against the relevant training goal: shape, orientation, permutation, or full solve. These are case-training scrambles, not competition random-state scrambles.
- Results are timed and flagged by the solver; there is no smart-cube connection or automatic solve detection.

See [sources and case conventions](docs/SOURCES.md). Source names follow Alg-Trainers; numbering on other sites can differ. All first layers are trained on the bottom.

## Development

The interface uses browser-native ES modules, HTML, and CSS. The macOS shell uses Swift, AppKit, and WKWebView. There are no third-party runtime package dependencies.

Desktop and mobile features share `app/`. Future features should be implemented and checked on both platforms and across the applicable trainers. See [AGENTS.md](AGENTS.md).

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

GPL version 3. Includes adapted algorithm data from Malte Ihlefeld’s Alg-Trainers and mapped choices from J Perm and Sarah Strong’s Square-1 EP collection. See [LICENSE](LICENSE), [NOTICE](NOTICE), and [source documentation](docs/SOURCES.md). No warranty.
