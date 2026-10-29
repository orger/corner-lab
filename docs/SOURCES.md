# Algorithm sources and verification

The installed app is self-contained and makes no remote requests for algorithms,
diagrams, scrambles, or statistics. Diagrams are generated from actual cube states.

## Supplied 5×5 last-two-centres reference

The user's supplied [CubeSkills *5x5 L2C Algorithms (Last Two Centers)*
PDF](../last-2-centers-algorithms-5x5-2.pdf) is retained unchanged. Its two pages
contain **19 unsolved patterns and one solved reference**. `app/catalog-centres.js`
transcribes all 19 printed solutions in reading order as `LTC-01` through
`LTC-19`, omitting the solved reference from timed practice. Each entry records
its source page, row, and column, and retains the original grouped move text in
`sourceAlg`. The descriptive case names and the **1 centre / 2 centres / 3
centres** groups are organizational labels added by the app. They contain 3,
10, and 6 cases respectively, counting misplaced pieces per remaining face.

The PDF credits its illustrations to Conrad Rider's VisualCube. The app draws
its own diagrams from simulated cube states rather than copying those images.
The sheet shows red and blue centres; the app shows the identical arrangements
using its usual yellow-U and green-F colors. All cases retain a solved left 2×3
block of the front centre in the reference grip. This is coverage of the
provided sheet, not a claim that every possible last-two-centres state is
included.

The sheet's `M` is the single middle slice turning in the direction of L.
`compileCentresAlg()` expands it to `3Lw Lw′` for the simulator while retaining
M in displayed solutions. Inversion provides the default practice setup.
The optional varied setup rewrites moves into an exactly equivalent sequence;
it does not use a general 5×5 solver.

Tests compare every inverse-generated U/F centre arrangement with patterns
visually transcribed from both PDF pages. They verify the other four centres
stay solved, the front 2×3 block is preserved, and all solutions solve their
generated states. All four selectable y grips and varied equivalent setups
are also checked. Pairing of the edges is unrestricted at the centre-solving
stage.

## Supplied 5×5 last-two-edges table

`app/catalog5.js` transcribes the user's **13-row, 27-entry** algorithm table,
in the supplied order. The source is the table provided in this conversation;
no external author or source site is attributed to these entries. Every name
and move string is retained in `originalName` and `sourceAlg`. The `alg` field
also keeps the original grouping and half-turn-prime spelling.

Stable row IDs are `LTE-01` through `LTE-13`, with `-a1`, `-a2`, and, for row 3,
`-a3` algorithm IDs. The first two rows have the same original name. Their
displayed names add “(Rw setup)” and “(3Lw setup)” to distinguish their supplied
setups while preserving the source name.

The user confirmed that **column 1 contains setups and column 2 contains
solutions**. Every row defaults to its second-column solution, labelled
**Solve · supplied algorithm**. Its `setupAlg` retains the exact first-column
text. All 13 solutions are exact inverses of their supplied setups after
normalization of parentheses and equivalent half-turn primes.

First-column sequences remain selectable as **Reverse direction** practice,
each with its own inverse-generated starting state. Row 3's third sequence is
retained as **Other axis** with separate source-column metadata and its own
matching state. The 27 preserved strings are direction/axis choices for 13
source cases, not a claim of 27 distinct case algorithms.

Simulator tests verify all 27 matching setups have uniform centres. Twenty-five
have two unpaired edge groups; the two row-5 parity choices have one. Every
selected sequence solves its own setup exactly, including all four selectable
U offsets and all four starting y grips. The two directions give the same exact
colour state in rows 3, 5, 6, 7, 8, and 13, and different states in the other
seven rows. Row 3's third sequence is related to its first by the explicit
conjugation `x y [first sequence] y' x'`, placing the unpaired groups on FR/FL
instead of UF/UB. Tests preserve these distinctions rather than treating every
entry in a row as an interchangeable solution from one fixed picture.

The last-two-edges groups are organizational labels added for this app, not
source claims about exhaustive case coverage. Nothing in this catalog asserts
that the supplied 13 rows include every last-two-edges case.

## Supplied first-face reference

One-look first-face selection follows the user's supplied
[2x2 FF Algorithms (First Face) PDF](<../2x2 FF.pdf>), marked **2x2 FF [22, 36]**.
The original PDF is retained unchanged. `app/first-face-cases.js` covers all
**36 named variants in the sheet's 22 representative/mirror families**, with
the explicit user adaptation described below:

| Heading on sheet | Families | Named variants |
| --- | --- | --- |
| LS [3,5] | 3 | D+4, D-4, U+3, U-3, U3 |
| DD [3,4] | 3 | KO5, PT5, OP5, KT5 |
| UD [6,12] | 6 | JK1, QT1, PQ3, JO3, OQ3, JP3, RT5, IK5, DK3, AT3, BP3, CO3 |
| UU [10,15] | 10 | BC1, BD5, CF3, BE3, BR5, CI5, DQ3, AJ3, FJ5, EQ5, QR3, JQ5, IQ5, JR5, FQ3 |

Each first-listed bold algorithm is the trainer's primary choice, except for
the user-adapted U+3 entry. The 36 primary move lengths reproduce the sheet's
half-turn-metric table: **3 one-move, 17 three-move, 2 four-move, and 14 five-move
algorithms**, totaling **132 moves**.
This source-based selection does not claim that all possible first-face
solutions have been enumerated or that each primary is optimal under every grip.

The data also retains all **9 secondary algorithms**, for 45 sequences total.
Printed move text remains in `sourceAlg` for unmodified choices; the adapted
U+3 retains its PDF text in `originalSourceAlg`. Equivalent `R2'`/`U2'` spelling
is normalized to `R2`/`U2` for simulation. JQ5's wrapped secondary text is joined as
`U (R U' R' U) R' U' R` (8 outer-face moves). Purple “breaking bar” annotations
are retained for OQ3, JP3, and KT5's secondary choice. Secondary choices are
preserved for future support; the current case picker uses primary choices.

Stable IDs include `FF-LS-Uminus3` for **U-3 / R U R'** and `FF-LS-Uplus3`
for **U+3 / R U' R'**, the two defaults. At the user's request, U+3 now inserts
the upper front-left piece into the bottom front-right corner. This is a
**user adaptation**, not the algorithm printed in the PDF. Its original
`R' U' R` sequence is preserved in `originalSourceAlg`, and the entry and its
primary choice carry `userAdapted` and `sourceNote` metadata. The old sequence
solves a different first-face pattern, so it is not offered as an interchangeable
alternative for the new diagram. The stable case ID is retained; stored results
keep their original finish, scramble, and solution strings.

Family names follow the sheet's bold representatives and adjacent mirror
pairings. The **22** figure describes the
reference's grouping; no additional mathematical orbit classification is
assumed from the name alone.

Simulation checks all 36 active primary color-occupancy patterns are distinct in
their reference orientations and all 45 active algorithms complete the intended
first-face color from their corresponding primary reference. The first-face
catalog tests also check every primary against all 129 CLL/EG cases and all 16
recognition/finishing U-AUF pairs, with varied D offsets: **74,304 generated
drills**. The intended first-face color stays incomplete on D until the primary's
final move; the bottom alignment and chosen last-layer solution then solve
exactly. Independent engine checks cover first-face color, starting grip, and
bottom-rotation variations. These tests validate the named PDF cases rather than
substituting arbitrary short move strings for first-face patterns.

One-look generation also adds an independently sampled final U adjustment to
the scramble: None, U, U2, or U′. The solution first undoes any starting grip,
then undoes that U adjustment before inserting the first-face piece. Tests
check this alignment preserves the intended first-face completion and selected
last-layer state across color, grip, and U-adjustment variations. The adjustment
is stored as `initialAuf`; older results retain their original no-adjustment
meaning. This is a training variation added by the app, not an additional PDF
case or source algorithm.

## Sources

- [Malte Ihlefeld's Alg-Trainers](https://github.com/mihlefeld/Alg-Trainers),
  [algorithm data at the imported commit](https://github.com/mihlefeld/Alg-Trainers/blob/34b5b16b47639ff21122c7ab46a044966d41ea00/2x2-EG-Trainer/algs_info.json).
  The CLL, EG-1, and EG-2 entries provide the starting catalog and its stable case
  numbering. The original data snapshot is `scripts/catalog-source.json`.
- J Perm's [CLL](https://jperm.net/algs/2x2/cll),
  [EG-1](https://jperm.net/algs/2x2/eg-1), and
  [PBL](https://jperm.net/algs/2x2/pbl) move sequences, accessed 10 September 2026.
  The small extracted move-data snapshot is `scripts/catalog-jperm.json`.
  The corresponding public data files are `/lib/2x2cll.js`, `/lib/2x2eg-1.js`,
  and `/lib/2x2pbl.js` on that domain. No site implementation or diagrams are used.
- J Perm's [advanced 2×2 guide](https://jperm.net/2x2/faster) gives the standard
  method definitions: CLL for a solved D layer, EG-1 for an adjacent swap below,
  and EG-2 for a diagonal swap below. The guide counts 42 CLL algorithms and
  43 in each EG set. The trainer adds CLL's solved/AUF-only outcome to make all
  three sets contain 43 selectable cases.

The GPLv3 license and provenance of the imported project are preserved in
`LICENSE` and `NOTICE`. Each selectable choice also carries its own source link.
Case numbers are not universal: a J Perm choice is matched by its cube state,
not by assuming that its number agrees with the imported trainer's number.

## Complete case coverage

There are **129 selectable cases: 43 CLL, 43 EG1, and 43 EG2**, with **486 distinct
verified algorithm choices**. Each set contains six
Sune, six Anti-Sune, six Pi, six U, six L, six T, four H, and three O cases.
O means that the top face is already oriented; it does not necessarily mean
that the top layer is permuted correctly.

The O group is deliberately complete:

| Set | Top solved | Adjacent swap on top | Diagonal swap on top |
| --- | --- | --- | --- |
| CLL | Solved / AUF only | T / J perm | Y perm |
| EG1 | Adjacent swap below | Adjacent / adjacent PBL | Diagonal / adjacent PBL |
| EG2 | Upside-down Y perm | Adjacent / diagonal PBL | Diagonal / diagonal PBL |

Completeness is tested by enumerating all **4! × 3³ = 648** legal upper-corner
states over a fixed bottom for each set. The test independently generates the
states covered by actual inverses of every canonical algorithm with all 16
starting/final AUF pairs. Physical yaw and cyclic side-color names remove the
arbitrary front-color choice, then each generated state must match the exact
fixed bottom. These sets are equal: 648 expected, 648 covered, no missing states
and no extra illegal states in every set. Another orbit check ensures that no
two case families duplicate each other.

## Alignment and corrected source data

The first-layer color is D (white) in every canonical reference. EG1's bottom
bar is at the back. Starting U/y setup moves, final AUFs, and any final physical
cube rotations are written explicitly in each aligned algorithm. These may
differ from a source's text because the source's picture or finishing grip is
different. A choice's original source name is retained separately.

Every alternative solves the *exact same reference state* as the default,
including the final cube frame. This is stronger than accepting a solved cube
in any orientation: it makes inverse scrambles retain the selected first-layer
color and case when a preferred algorithm changes. The app's custom-algorithm
validator checks the same property.

Two source issues were investigated using full simulation:

- A CLL-AS5 entry, `R U R' U' R' F R F' R U2 R' U' R U' R'`, is actually an
  alternative for CLL-AS6, with a final U2. It is retained under AS6 and its
  original source assignment is recorded in the build report.
- The rotated EG2-H1 alternative starts from a different first-face position.
  It is retained with an explicit starting rotation after checking all physical
  starting/finishing frames; it is not discarded as an invalid algorithm.

Harmless notation such as `U2'`, parenthesized AUF, and spaced primes is
normalized. Adjacent repeated moves are combined (`x x x` becomes `x'`), and
identical choices are deduplicated. Some EG algorithms perform an effective whole-cube rotation using
outer turns; a final frame correction keeps white on D when inverted.

## Reproduce

Run from the repository root with Node.js:

```sh
node scripts/catalog-build.js
node --test tests/catalog.test.js
```

The build writes `app/catalog.js` and `scripts/catalog-report.json`. The report
includes all source-to-case mappings, corrections, counts, and any excluded
choices. No network access is needed to rebuild or run the tests. User-entered
algorithms are stored separately and are never overwritten by catalog rebuilds.
