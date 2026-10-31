# 5×5 centres and edges practice

Use the **Trainer** selector below the app name to choose **5 × 5 · Last two
centres** or **5 × 5 · Last two edges**. Each has its own selected cases, settings,
saved practices, and results, separate from the 2×2 trainer.

## Last two centres

The centre trainer uses the supplied CubeSkills **5x5 L2C Algorithms (Last Two
Centers)** PDF. Its **19 unsolved cases** appear in reading order as `LTC-01`
through `LTC-19`; the solved reference is not a timed case. Each case has the
single printed solution from the sheet. The app adds descriptive names and
three groups to help select subsets:

| Group | Cases | Meaning |
| --- | --- | --- |
| 1 centre | 3 | One displaced piece on each remaining face |
| 2 centres | 10 | Two displaced pieces on each remaining face |
| 3 centres | 6 | Three displaced pieces on each remaining face |

Open **Case library** to choose individual cases or groups. The printed
algorithm solves the displayed pattern; the trainer generates a setup from
its inverse. Every reference case has two mixed centres on U and F, four solved
centres, and the front centre's left 2×3 block complete. These are the cases
shown in this particular sheet, rather than every possible arrangement of the
last two centres. The app's diagrams use yellow/green for the patterns that the
PDF shows in red/blue, with each face viewed from outside. Edges and corners
may be scrambled during this stage; stop when the centres are complete.

The single middle-piece case uses **M**, meaning only the central slice, turned
in the same direction as L. The app preserves M in the displayed solution.
Generated setups use the equivalent `3Lw Lw′`, which turns the three left layers
and then undoes the two outer left layers. This leaves just the middle slice
turned. M does not mean all three inner slices.

## Last two edges

The edge trainer uses your supplied last-two-edges table: **13 cases and 27
direction/axis choices**.

The two rows both named `same alt same 12 easy` retain that original name in
their data. Their displayed names add **(Rw setup)** and **(3Lw setup)** to
distinguish the first-column setup in each row. The row IDs are `LTE-01` through
`LTE-13`, in the order you supplied them.

## Notation

| Move | Meaning on a 5×5 |
| --- | --- |
| R, L, U, D, F, B | Turn the named outer layer |
| Rw, Lw, Uw | Turn the outer two layers together |
| 3Rw, 3Lw | Turn the named outer three layers together |
| x | Rotate the entire cube as an R turn |
| y, z | Rotate the entire cube as a U or F turn, respectively |
| M in the centres sheet | Turn only the middle slice in the same direction as L; equivalent to 3Lw Lw′ |
| A prime, such as Rw′ | Reverse the turn |
| A 2, such as Rw2 | Turn 180°; Rw2′ describes the same turn |
| Parentheses | Group moves for reading; perform the moves inside them in order |

The stored algorithm text preserves your parentheses and half-turn primes.
Scrambles may use normalized notation with redundant half-turn primes removed.
Start each scramble from a solved cube with white down and green front, then
perform every displayed move, including wide turns and cube rotations.

## Your setup and solution columns

Your edges table's **first column is the setup and second column is the solution**.
Every case defaults to **Solve · supplied algorithm**, using the second-column
solution with its matching first-column setup. The original setup text is
retained alongside the solution. All 13 supplied solutions are exact inverses
of their setups after normalizing parentheses and equivalent half-turn spelling.

The optional **Reverse direction** choice practises the first-column sequence
as a solution, starting from its inverse instead. This can change the starting
picture: the two directions have different fixed-frame states in seven rows.
They share the same state in rows 3, 5, 6, 7, 8, and 13. Each direction therefore
receives its own matching scramble. The original row name and selected choice
remain attached to each result.

**Other axis** preserves the third entry in **centres swapped both bad**. Its
unpaired edges are at FR/FL in the reference grip, whereas the supplied setup
places them at UF/UB. The sequences are related by a change of cube frame; the
trainer gives this choice its own correctly oriented starting state.

Source row labels are retained as your recognition shorthand. The additional
group headings—Easy inserts, Centre swaps, Parity, Double broken, Double same,
and Double alternating—organize the supplied rows; they do not claim to be a
complete classification of every possible 5×5 last-two-edges state.

## Setup choices

**Your supplied setup** is the default for edges; **Inverse of PDF algorithm**
is the default for centres. **Varied equivalent setup** changes the
move sequence while reaching exactly the same cube state for the chosen case
and grip. It rewrites segments in randomly chosen cube frames and uses
equivalent wide-layer turns. These are verified equivalent sequences, not
outputs from a general 5×5 solver or competition random-state scrambles.

Starting grips optionally add a whole-cube y rotation. The reveal includes the
inverse regrip before your solution. Follow every move in the setup, including
rotations, from white down and green front.

## A practice cycle

Choose a subset of cases in the library. For edges, also choose the preferred
supplied sequence for each case. Apply the generated scramble to a solved cube,
recognize the centre or edge pattern, and execute the algorithm. Reveal the sequence when learning or compare
it with your solve afterwards. Times are entered by you; the app does not detect
physical cube moves or infer whether you solved it correctly.

Generated setups are designed around these algorithms. A setup and its selected
sequence are checked by the 5×5 simulator before practice. Every supplied
edge choice starts with uniform centres and two unpaired edge groups,
except the two directions of **Regular parity case**, which each have one
unpaired edge group. All supplied setups and solutions have been checked to
solve exactly, including wide-layer widths and whole-cube rotations.
Centre setups are checked against the sheet's U/F patterns and preserve the
other four centres and the completed 2×3 block. Optional y grips rotate the
whole pattern; the reveal gives the inverse regrip for the printed solution.

Tap Space twice for **Start → stop**, or three times for **Inspect → solve →
stop**. Inspection and solve seconds are stored separately. Optional inspection
audio sounds once at 8 seconds and twice at 12 seconds. N advances to another
case, H reveals the solution, and Escape cancels active inspection or solving.
Revealing before a timed solve marks it assisted.
After stopping, the previous scramble remains visible in red with a completed
label. Press Space once to load a new case and again to start its timer.

Centre, edge, and 2×2 results and saved practices are kept separately. Insights
can filter by case, pattern, direction/axis choice, setup style, grip, timing,
inspection cues, session, and date. Use **Reset matching results** to remove only
the filtered history for the current trainer; algorithm preferences and the
other trainers' results are kept. Full backups include all three trainers,
while a 5×5 CSV export contains only the filtered results from its current
centre or edge trainer. Choose **Learning** under Practice focus to see each selected case once per
shuffled batch, followed by another shuffled batch. The practice card shows
your position. Skipping consumes a position; retrying the current scramble
does not. Selecting different cases or algorithms, loading a practice, switching
away from Learning or reopening the app starts fresh.

Speed focus uses the median of the latest N clean solves per case matching
your current algorithms, setup style, grips and timing conditions. Choose
**Clean solves per case (N)** below Practice focus: default **20**, range
**1–1,000**. Recall lapses, DNFs and assisted results are excluded before taking
N; cases with fewer clean results use what is available. Each trainer and saved
practice remembers its own N. The full-set chart window is separate. Recall
focus continues to consider lapses and robust spread across matching history. The main guide explains the shared statistics.

**Slowest N algs** and **Fastest N algs** select an equally weighted pool of up
to N of your selected algorithms by recent clean median. Set **Number of
algorithms (N)** (default 5), then **Recent clean solves per algorithm**
(default 20) for the ranking window. Cases must match the preferred algorithm,
setup style, grips, timing and cues. Cases without matching clean times are
excluded if any measured cases exist; with no times, the selection is mixed
until a baseline exists. Edges and centres remember their own settings.

The Insights **Where to focus** table has a separate **Recent solves per
algorithm** field (default 20, range 1–1,000). Each algorithm version receives
its own latest-result window after filters; flagged results use window slots,
while the clean average and median exclude failed or assisted solves. Grouped
rows combine these algorithm windows. All history, exports, resets and chart
windows keep their existing scope.

In **Full-set progress**, the **Range start** and **Range end** sliders zoom
both axes to your chosen period. **All time** restores the full curve. Earlier
solves still contribute to the historical rolling averages correctly. Your
chosen dates are kept when you change the chart's set, N or filtering options.

See [SOURCES.md](SOURCES.md) for the table and PDF transcription and validation details,
and [the main user guide](USER-GUIDE.md) for the app's timing and statistics
terminology.
