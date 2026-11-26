# Corner Lab user guide

Corner Lab trains 2×2 CLL, EG1, EG2, recognition AUF, finishing AUF, and short
one-look solutions with the first face on the bottom. It also trains 5×5 last
two edges, last two centres, Square-1 cube shape, OBL and EP, and Skewb first layer and NS2.
Choose one of the eight trainers from the selector beside the
app name. You use your physical cube and record times with the keyboard, a
button, or manual entry. The following practice instructions describe the 2×2
trainer; see [5X5-GUIDE.md](5X5-GUIDE.md) for 5×5 practice and
[Square-1 cube shape](#square-1-cube-shape), [OBL and EP](#square-1-obl-and-ep),
[Skewb first layer](#skewb-first-layer), and [Skewb NS2](#skewb-ns2) below for their goals and notation.

## Start a practice

1. Open `dist/Corner Lab.app`. On the first run, six CLL Sune cases are selected.
2. Open **Case library**. Select the sets, patterns, or individual cases you want.
   **Select shown** and **Clear shown** affect the currently filtered library.
   Other sets' selections remain available. The Practice button shows the total.
3. Click a case to choose your preferred algorithm. Each listed choice solves
   the same reference picture. Source links identify where it came from.
4. In **Practice**, choose your AUFs, starting grips, colors, and practice focus.
   Click **Apply & generate case** when ready. Builder changes apply to the next
   scramble; an already displayed scramble retains its original conditions.
5. Begin with a solved cube held **white down and green front**. Apply the
   entire displayed scramble, including any `x`, `y`, or `z` rotations.
6. Choose **Simple** or **Inspection** timing. Tap **Space** to advance the
   timer—there is no hold requirement. Simple timing starts and stops the solve
   in two presses. Inspection timing uses three presses: start inspection,
   start the solve, then stop. The on-screen timer button does the same thing.
   You can also enter a solve time in seconds and click **Add time**.
7. The solution appears after stopping. Mark **Recall lapse** or **DNF** if
   appropriate. Space then generates the next case.

After a solve, the old scramble remains visible in red on a tinted panel,
labelled **Previous scramble · completed**. It is the scramble you just used.
Press Space or choose **Next case** to load a fresh scramble; press Space again
when ready to start its timer. This warning appears in every trainer.

The app verifies its generated solutions mathematically. It does not sense your
physical cube, determine whether you solved it, or time individual turns.

| Control | Action |
| --- | --- |
| Space in Simple timing | First press starts the solve; second stops and records it |
| Space in Inspection timing | First press starts inspection; second starts the solve; third stops and records it |
| Space after a result | Generate the next case |
| N | Skip to the next case without recording a solve |
| H / Reveal | Show or hide the solution |
| Escape during inspection or the solve | Cancel without saving a result |
| Discard result | Remove the just-completed result |

Revealing the solution before completing the solve marks the attempt
**assisted**, even if you hide it again. Assisted attempts remain in history but
do not affect the unassisted speed, spread, or lapse statistics. The optional
scrambled-cube preview is a view of the scramble, not a solution reveal.

## Timing and optional inspection cues

Timing is independent of the case-practice mode. You can use inspection timing
for Last layer or simple timing for One-look. Switching between Last layer and
One-look selects the suggested timing option—Simple and Inspection respectively—
and you can then change it to your preference.

In **Simple** timing, the first Space press starts the solve clock. The second
stops it and records solve time. In **Inspection** timing, the first press starts
an inspection clock. The second freezes inspection time and starts a separate
solve clock at zero. The third stops the solve. Recorded solve seconds never
include inspection seconds.

**Inspection audio** is optional and off by default. When enabled, it gives one
cue at eight seconds and a double cue at twelve seconds of inspection. Each
threshold is announced once per inspection. The cues do not stop inspection,
start the solve, or add penalties; you advance the timer yourself. Audio stops
when you leave inspection or cancel the attempt.

Your timing and audio choices are saved with your settings and named practice
presets. Each new result also retains those choices. Manual entry records the
solve time you enter and can have no separately measured inspection time, even
when Inspection timing is selected.

## Choose algorithms and complete sets

There are **129 cases and 486 built-in algorithm choices**. Each of CLL, EG1,
and EG2 contains 43 cases: six each of Sune, Anti-Sune, Pi, U, L, and T; four H;
and three O / PLL cases.

| Set | Condition of the completed bottom face |
| --- | --- |
| CLL | The bottom layer is fully solved |
| EG1 | The bottom has an adjacent corner swap; the reference bar is at the back |
| EG2 | The bottom has a diagonal corner swap |

**O / PLL** means that the top face is already oriented. Each set includes a
solved top, adjacent top swap, and diagonal top swap. CLL therefore includes
its T/J-perm and Y-perm cases, plus a solved/AUF-only case. EG2 includes the
top-solved case requiring an upside-down Y perm below. These are available even
when another source teaches them in a different set.

Case IDs follow the imported Alg-Trainers catalog, such as `CLL-S1`, `EG1-Pi3`,
and `EG2-O-Solved`. Numbers on J Perm or other sites can differ. Alternatives
were matched by cube state, not by assuming that the numbers agree.

To add a personal algorithm, open the case, enter the moves under **Add your
own**, and click **Validate & use algorithm**. Include any starting U or y setup
required to solve the displayed reference. The app accepts outer face turns,
half turns, cube rotations, grouped notation, and supported wide turns. A
needed final AUF or cube-frame correction is added explicitly. An algorithm
that does not solve this case is rejected; the message leaves your saved choice
intact.

Choosing another algorithm affects future scrambles. Old results retain the
exact algorithm text and its version ID, so Insights can compare versions.

## AUF, starting grip, and color

**Recognition AUF** selects an extra adjustment before the stored preferred
algorithm: None, U, U′, or U2. Selecting several values makes the trainer vary
the starting top-layer position. **Finishing AUF** independently chooses the
adjustment after the preferred algorithm. Algorithms may already contain
alignment moves from their source; these two controls are additional moves
around the complete stored sequence. Follow the separate lines in the reveal.

**Starting grip** rotates the whole scrambled case around the vertical axis.
For example, a y starting grip is undone by the y′ regrip shown in the solution.
This changes the viewing side; it is different from turning only the U layer.

**Bottom-layer rotation** independently varies the completed bottom layer's
alignment: None, D, D′, or D2. All four are selected by default. The **Align
bottom** line in the reveal gives the inverse adjustment after the first-face
finish and before the recognition AUF. This lets the same first-face pattern
lead to different bottom alignments while retaining the selected CLL/EG case.

Choose one **first-layer color** for fixed-color training, or several colors to
sample from that selection. The scramble starts from the same white-down,
green-front solved grip in all modes. Its leading rotations arrange the selected
color correctly. Do not omit these rotations when changing colors.

The revealed solution order is:

**Regrip → initial AUF, if any → first-face finish, if any → align bottom → recognition AUF → preferred algorithm → finishing AUF.**

## One-look practice

In this app, **One-look** means planning a short first-layer completion and the
resulting CLL/EG algorithm and AUF before starting to turn. The first face begins
incomplete. You predict what will remain after completing it, then try to execute
the full solution without another recognition pause.

Choose the CLL/EG cases and the **first-face cases** independently. First-face
selection follows the supplied **2x2 FF Algorithms (First Face)** PDF: **36 named
orientations in 22 representative/mirror families**. The default pair is
**U-3**, `R U R'`, and **U+3**, `R U' R'`. U+3 is a user-requested adaptation
of the PDF entry: it inserts the upper front-left piece into the bottom
front-right corner. The PDF's original `R' U' R` text is retained as source
metadata. Existing results keep the finish and solution actually used at the
time; changing this choice does not rewrite their history.

Click **Choose** in the first-face section. The picker groups the named variants
into family cards under the sheet's four headings:

| PDF group | Families | Named variants |
| --- | --- | --- |
| LS | 3 | 5 |
| DD | 3 | 4 |
| UD | 6 | 12 |
| UU | 10 | 15 |

Select or clear a whole family, or check individual named variants. Use group,
move-length, name, or algorithm search to narrow the choices. The default-pair
button returns to U-3 and U+3. Each diagram shows the selected first-face color
schematically in yellow, with the remaining stickers grey; it depicts the
first-face pattern independently of the downstream last-layer case.

The trainer uses each named case's **primary algorithm from the PDF**, except
for the adapted U+3 choice above. These have one, three, four, or five moves in
half-turn metric; R2 counts as one move.
The picker selects meaningful first-face patterns rather than arbitrary move
strings. Nine secondary algorithms printed on the sheet are preserved in the
catalog for future choice support; the current picker uses the primary choices.

Every one-look scramble independently samples an **initial U adjustment** from
**None, U, U2, or U′**, applied at the end of the scramble. This changes where
the insertion piece starts, so it is not always lined up for the same insertion.
It is separate from the recognition AUF used after the first face is complete.
When the solution is revealed, follow **Regrip**, then **Initial AUF**
before the first-face finish. The initial adjustment is saved with each result
and is available as **Initial AUF (scramble)** in Insights filters and result
details, **By initial AUF** in grouping, and `initialAuf` in CSV exports.
Older results without this field used no initial adjustment.

For each generated scramble, the intended first-face color starts incomplete
on the bottom and first becomes complete on the first-face algorithm's final move.
The subsequent bottom alignment, recognition AUF, preferred CLL/EG algorithm,
and finishing AUF solve the selected last-layer case. Top and bottom alignment
controls vary the same selected first-face patterns, so they do not need to be
listed as additional first-face cases.

With **Inspection** timing, tap Space to start planning, tap again when your plan
is ready to start the solve, and tap a third time when finished. Optional audio
cues mark eight and twelve seconds. The app records inspection and execution
separately but does not automatically determine whether you looked again or
paused to recall the case. Choose Simple timing if you only want solve time.

## Practice focus and saved practices

| Focus | How cases are sampled |
| --- | --- |
| Balanced | Every selected eligible case has equal probability; random repeats can occur |
| Learning | Each selected case appears once in a shuffled batch; the next batch reshuffles all cases |
| Speed | Cases with slower medians over their latest N clean solves receive more weight |
| Slowest N algs | Equal draws from up to N selected algorithms with the slowest recent clean medians |
| Fastest N algs | Equal draws from up to N selected algorithms with the fastest recent clean medians |
| Recall | Recall/DNF flags, unusually slow results, and relative spread increase weight |
| Coverage | Cases with fewer unassisted observations receive more weight |

Choose **Learning** for guaranteed coverage of your selection. Each batch
contains every selected case exactly once, using its preferred algorithm, in
random order. The next batch reshuffles the whole selection. AUFs, grips,
colors and first-face completions continue to vary with your settings. The
practice card shows the batch number and position without revealing the case.
A case can repeat across a batch boundary.

Generating or skipping to the next case advances the batch. Revealing,
cancelling the timer or retrying the current scramble does not. Changing the
selected cases, a preferred algorithm or practice mode, loading a saved practice,
leaving and re-entering Learning, or reopening the app starts a new batch.
Each trainer keeps its own batch during the running app session. The Learning
choice is saved with your practice settings; an unfinished batch is not saved.

When you select **Speed**, set **Clean solves per case (N)** below Practice
focus. The default is **20**, adjustable from **1 to 1,000**, saved separately
for each trainer and with saved practices. The calculation first filters for
your selected algorithms and conditions, excludes Recall lapse, DNF and
Assisted results, then takes the latest N clean solve times for **each case**
by their recorded date. Flagged attempts do not use up a place in the window.
A case with fewer than N clean solves uses all available clean solves; a case
with none keeps a neutral weight. Inspection time is excluded.

This window controls Speed and ranked practice selection. It does not trim your history,
change the Insights summaries or set the window for the full-set progress chart.
Those chart controls remain independent. Recall and Coverage use matching history
as before.

For **Slowest N algs** or **Fastest N algs**, set **Number of algorithms (N)**
to choose the pool size (default **5**, range **1–129**), then set **Recent clean
solves per algorithm** to choose the ranking lookback (default **20**, range
**1–1,000**). The pool is drawn from your selected cases and preferred algorithms,
using the same condition filters and recent clean medians as Speed. Each member
of the pool is equally likely. Rankings update as results are recorded; they do
not change your underlying case selection. Ties keep catalog order. If fewer
than N selected algorithms have matching clean times, all measured ones are
used. Unmeasured cases are excluded once matching times exist; if none exist,
all selected cases can appear until there are times to rank.

Speed and Recall reduce the influence of small samples. Every eligible case
retains a positive chance of appearing. Focus uses history matching the selected
cases, their currently preferred algorithms, mode, color range, both U-AUF
ranges, bottom-layer rotation range, starting-grip range, and—in One-look—the
selected first-face cases. Timing mode also matches; inspection timing additionally
matches the audio setting. Focus is not limited to the current session.
Insights filters are separate from these practice settings.

**Save practice** stores the current case selection, conditions, mode, focus, the clean-solve window, ranked pool size, Insights lookback,
finish selection, timing mode, inspection-audio choice, and recording/preview settings under a name. Load saved
practices from **Settings**. Algorithm preferences are global: a saved practice
uses your current preferred algorithm for each of its cases. Deleting a saved
practice does not delete solve history.

**New session** starts a fresh session summary. Earlier sessions remain in
Insights. Turn **Settings → Store solve statistics** off for unrecorded practice;
this does not erase existing results or prevent settings from being saved.

## Read speed and recall separately

Recorded results keep the case, set, pattern, exact algorithm/version, mode,
initial U adjustment, recognition and finishing U-AUFs, bottom-layer rotation,
grip, first-layer color, first-face case/finish,
solve time, timing mode, audio setting,
outcome flags, session, timestamp, scramble, and complete solution. Inspection
time is stored separately when measured. Older results infer Inspection timing
when a measured inspection time is present; their audio setting defaults to off.
Open a result to inspect its details or change its flags.

**One-look inspection** summaries appear in one-look Practice for the current
session and in 2×2 Insights for the currently filtered results. They show the
arithmetic mean as **Average inspection** and the percentages **Under 15 seconds**,
**Under 12 seconds**, and **Under 8 seconds**, alongside the number of measured
inspections. Thresholds are strict: exactly 12 seconds is not under 12 seconds.

These summaries count only measured, unassisted **One-look** inspections. A
measured zero counts; manual times, Simple timing, missing inspection times,
and assisted attempts do not. Timed inspections still count when the solve is
marked **Recall lapse** or **DNF**, because those flags describe the subsequent
solve outcome. Older measured inspections remain eligible even if their records
predate the separate timing-option field. Empty selections show no average or
percentage rather than treating missing measurements as zero.

**Clean** means a positive-time result that is unassisted and has neither a
Recall lapse nor DNF flag. Clean does not mean an automatic slow result has
been removed.

| Metric | Calculation and interpretation |
| --- | --- |
| Clean average | Arithmetic mean of clean solve times in the displayed window |
| Clean median | Median of clean times; a robust estimate of typical execution |
| MAD | Median of the absolute distances of clean times from their median; lower means steadier execution |
| P90 | The 90th percentile of all positive unassisted times, including marked failures; describes the slow end |
| Lapse rate | Number of unassisted attempts marked Recall lapse/DNF or detected as slow-tail results, divided by all unassisted attempts |

Percentiles interpolate between adjacent sorted observations. A result carrying
both Recall lapse and DNF counts once in the lapse rate.

In **Where to focus**, set **Recent solves per algorithm** to choose the table's
lookback (default **20**, range **1–1,000**). It takes the latest matching results
by date separately for each case and exact algorithm version, after applying
Insights filters. If fewer exist, it uses those available. Recall lapses, DNFs
and assisted attempts count toward this recent-results window, so lapse rates
describe recent practice; the clean average and median exclude those flagged
results. Grouping by case, set or conditions combines these recent algorithm
windows. Grouping by algorithm keeps historical move-text revisions separate.
This setting is saved independently for each trainer. It does not shorten the
full history, change chart windows, or limit CSV exports or filtered resets.

After at least **five clean observations** in the displayed group, an unmarked
clean result counts as unusually slow when it exceeds:

```text
max(1.75 × median,
    median + 3 × 1.4826 × MAD,
    median + 2 seconds)
```

Explicit recall and DNF flags count immediately. Automatic slow-tail detection
does not delete, trim, or relabel the recorded time. These unmarked observations
still participate in the clean median and MAD. The threshold is recalculated
for the group being summarized, so a result may be unusual within a narrow case
selection but ordinary in a mixed group.

A high median with low MAD suggests consistently slow execution. A fast median
with recall flags, a large P90, or a high lapse rate suggests occasional trouble.
An unusually slow result is a useful review signal, not proof of a memory error;
use the explicit flag to record what actually happened.

For useful comparisons, use **Insights** to filter like conditions: the same
algorithm version, mode, color, or AUF range. Group the table by case, algorithm
version, pattern, set, initial U adjustment, either later AUF, bottom-layer
rotation, grip, color, first-face case,
finish, mode, or timing option. Inspection seconds are displayed separately in
history. You can sort by
slowest typical time, most inconsistency, or least practice. Small groups show
**Building baseline** until five clean observations are available.

## Track progress across a complete algorithm set

Open **Insights** in any trainer and use the **Full-set progress** card. Its
**Full algorithm set** selector offers fourteen choices:

- 2×2 CLL, EG1, or EG2 individually.
- CLL + EG1, CLL + EG2, EG1 + EG2, or all three together.
- 5×5 last two edges or 5×5 last two centres.
- Square-1 cube shape, OBL, or EP.
- Skewb first layer or NS2.

The single curve summarises the selected algorithm set. Choose **Solves per
case (N)** from 1 to 100; the default is 5. For each case, the app takes the
arithmetic mean of its last **up to N** eligible solve times. If the case has
fewer than N solves, it uses all the times available. A case with no eligible
solves is left out. The app then takes the arithmetic mean of the contributing
case averages. Every included case has equal weight, so repeatedly practising
one case cannot give it a greater share of the set average. This is a mean,
rather than the clean median used in the speed summary elsewhere in Insights.

The curve starts with your **first eligible solve**. **Current case coverage**
shows how many of the full set's cases contribute, how many have N solves, and
how many have none. Expand **Cases with fewer than N eligible solves** to see
which cases currently use shorter histories or are not yet included. You can
choose a larger N without waiting until every case has that many times.

The horizontal axis shows date and the vertical axis shows seconds; lower is
faster. Each plotted point uses only results recorded by that date. Each case
keeps its most recent up to N times until you practise it again, even if those
times are older than another case's. New solves update future points without
changing earlier ones. **Change over shown range** compares the last
average with the first point within the displayed date range. Adding a newly
practised case can change the average, so check the coverage at the dates you
are comparing.

Use **Range start** and **Range end** in **Chart date range** to zoom to a
particular period. The horizontal date axis and vertical time scale both
adjust, so early fluctuations outside the range do not compress the recent
curve. **All time** restores the full range. Moving the sliders changes only
what is shown: the rolling averages still use earlier solves where appropriate.
The **Latest set average · all history** and current coverage above the chart
remain overall latest values; **Change over shown range** describes the zoomed
period. Your chosen dates stay in place when you change the algorithm set, N,
practice mode, timing option or recall-lapse filter. If a view has fewer dates,
the sliders fit the available results; switching back restores your chosen
range. **All time** clears the chosen range.

Use **Explore dates** below the chart to inspect an exact value, timestamp and
the number of cases contributing **at that date**. It also shows how many of
those cases already had N solves. Expand **Plotted values** for a table of the
observations within the chosen range and their historical coverage. The table displays 50 dates at a
time; moving the date slider changes the displayed block. Hovering a plotted
dot also shows its time, value and coverage.

Eligible times must be positive, completed and unassisted. **DNFs and assisted
solves are always excluded**. Completed solves marked **Recall lapse** remain
included by default, so forgetting an algorithm can affect progress. Tick
**Exclude marked recall lapses** to omit those solves too. Unmarked slow times
are retained. Inspection time is never added to solve time.

For 2×2 sets, **Practice mode** keeps Last layer and One look separate; it
defaults to Last layer. **Timing** can include both timer options or restrict
the graph to Start → stop or Inspect → solve → stop. All algorithm choices,
grips and other conditions within that scope contribute to their case's times.

The card always uses the **complete selected algorithm set**, independent of
the cases currently selected for practice and of the other Insights filters
below it. Its controls last for the current app session and are not stored in
saved practice presets. Switching trainer selects that trainer's full set as
the initial chart choice, while the selector still offers all fourteen choices.
Deleting, resetting, importing or changing flags on stored results recalculates
the chart from the remaining eligible history.

## Reset exactly the results you intend

Insights filters combine: algorithm set, pattern, case, practice mode, timing
option, inspection cues, color, both U-AUFs, bottom-layer rotation, grip,
initial U adjustment, algorithm version, first-face case/finish, session, and a
starting date.
**Only selected practice cases** restricts the results to any custom case subset
you selected in the library.

To clear one algorithm, choose its case and algorithm version. To clear a
pattern or a complete set, use those filters. Add conditions to narrow the scope
further. Confirm the matching result count, then choose **Reset matching
results…** and review the final deletion dialog. Resetting removes the matching
attempt records, so their aggregate statistics disappear too. Algorithm
preferences and practice selections remain.

Open a single result and choose **Delete this result** to remove only that
attempt. **Export results** creates CSV from the current Insights selection,
including timing/audio metadata and separate inspection and solve seconds;
**Export full backup** creates a restorable JSON copy of everything.

## Storage, export, and restore

The standalone Mac app stores data at:

```text
~/Library/Application Support/Corner Lab/data.json
```

Each native save is atomic and retains the immediately previous file as
`data.previous.json`. That previous copy advances with saves; explicit exported
backups are the way to keep a particular point in your training history.

Use **Settings → Export full backup** for a JSON backup containing settings,
preferred and personal algorithms, saved practices, and all results. **Import
backup…** validates its structure and personal algorithms before asking to
replace the current data. Import replaces data; it does not merge histories.

One backup contains all eight trainers. Each retains its own case selection,
preferred algorithms, settings, practices and results. Backups from older
versions load with new trainers empty; their recorded times and algorithm text
are preserved. CSV exports and filtered resets affect the current trainer only.

If a saved file cannot be loaded or a save fails, the app shows the error.
Existing saved data is not silently replaced with fresh defaults after a load
failure. Export any current in-memory results you need to preserve, and import
a valid backup to restore normal saving.

The browser or installed web app keeps its own device storage, separate from the Mac
app. Transfer data between them using JSON export/import. All practice, diagrams,
algorithms, and statistics work offline. Source links open external reference
pages only when you choose to follow them.

See [SOURCES.md](SOURCES.md) for algorithm provenance, complete-case verification,
source corrections, and case-numbering conventions.


## Square-1 cube shape

Select **Square‑1 · Cube shape** in the trainer menu. Start every setup from a
Square-1 in cube shape, with both square layers aligned to the middle and the
small half of the middle layer on the left. Piece colours and permutation do
not matter for this drill. Stop the timer when both layers have returned to
square shape; the middle layer may still need correcting during your full solve.

The library includes **169 non-cube combinations**, treating the top and bottom
as distinct and keeping mirror cases separate. This is the 170 possible ordered
shape pairs with the already-square pair omitted. Cases are grouped by their
minimum number of slice moves. Choose individual cases, search by layer name,
or select a whole slice-count group. The supplied solutions are generated by
Corner Lab's shape search and verified by its Square-1 simulator.

After an attempt, the solution reveal also shows **your shape route** and
**recognition notes** from the supplied table. The notes follow the matching
case, including mirrored and swapped-layer equivalents. Your table's slice
count helps distinguish variants such as similar versus different fists.
These are your recognition cues and chosen route; the generated numeric
solution above may take a different route. Reorient or mirror directional
cues to match the shapes shown. Notes remain hidden until the solution is
revealed, and revealing early retains the usual assisted-result behaviour.

Notation is **(top, bottom)**, in 30-degree units. Positive numbers turn clockwise
when looking directly at that layer from outside; negative numbers turn the
other way. **/** turns the right half 180 degrees. A slice must pass between
pieces: never force a cut through a corner. The two diagrams show top and bottom
as viewed directly from outside, with the slice line marked.

**Setup style → Disguised scramble** takes a different legal route to the
selected shape pair, helping you avoid learning the case from the reverse of
its solution. It chooses short alternative routes with **at least five slice
moves** (`/`). Layer turns do not count toward that minimum. These routes are
not guaranteed to be the shortest possible scrambles. **Inverse algorithm**
keeps the direct setup available without the five-slice minimum.
The disguised setup changes piece permutation; only the selected layer shapes
and their alignment matter for this practice.

**Starting layer orientation** is a separate control. **Random top & bottom
turns** appends independent turns after the final slice, using all twelve
30-degree positions on each layer. The resulting position may need alignment
before it can be sliced. **Reference orientation** keeps the shapes in their
algorithm's reference position. The revealed solution includes the alignment
needed before the preferred algorithm. These choices are stored with results
and can be filtered independently in Insights. New practices default to
Disguised scramble and random orientation; existing setup-style preferences
are retained, with random orientation enabled unless explicitly changed.
These are practice setups, not competition random-state scrambles.

The timer, manual entry, optional inspection cues, Learning batches, speed and
recall focus work as in the other trainers. Inspection and solve times are
recorded separately. Insights includes inspection averages and percentages
under 15, 12 and 8 seconds, as well as the full-set progress chart and its date
sliders. Filters, CSV exports and resets apply only to Square-1 results. Full
backups include all eight trainers. Older backups gain independent empty sections
for trainers they did not yet contain, while their existing histories stay unchanged.

This mode practises cube-shape recognition and execution. It does not train
cube-shape parity, colour orientation or permutation.

## Square-1 OBL and EP

These are separate stages with separate histories. Select **Square‑1 · OBL**
or **Square‑1 · EP** in the trainer menu, then choose individual cases or
pattern groups in **Case library**. Open a case to compare the supplied
algorithms and choose the one you prefer. Each diagram follows that algorithm's
reference alignment; the chosen algorithm applies to future setups.

| Trainer | Included cases | When to stop |
| --- | --- | --- |
| OBL | 185 cases, including EO; 641 verified algorithm choices | Both layers are square, with white on one layer and yellow on the other; permutation and the middle layer do not matter |
| EP | 99 cases: 49 without parity and 50 with parity; 169 verified choices | The entire puzzle is solved, including final layer alignment and the equator |

For either trainer, start every setup from a **fully solved Square-1, white up
and green front**, with red right, blue back and orange left. Match the
illustrated piece and slice alignment. This starting position is stricter than
cube-shape practice, where colours can be mixed. EP setups leave both layers
oriented and the corners permuted up to layer turns, so the task is the
remaining edge permutation. The solved EP skip is omitted.

The notation is the same numeric **(top, bottom) /** notation as cube shape:
numbers count 30-degree turns, positive clockwise when looking at the layer
from outside, and `/` turns the right half 180 degrees. Both diagrams show
outside views. The bottom therefore mirrors the left/right viewing direction.
For OBL, read the face colours. For EP, compare the side stickers on edges with
those on their neighbouring corners.

**Disguised scramble** is the default. Both stages prefer short alternative
routes with **at least five slice moves** (`/`), counted after cancelling
redundant moves. The route differs from the direct inverse of your selected
solution; the app does not claim a globally shortest scramble. OBL aligns the
resulting colour pattern to the selected algorithm. EP reaches the full
reference state, including the equator. **Inverse algorithm** remains available
for a direct setup without the five-slice minimum. These are case-training
setups, not uniform random-state scrambles.

The five-slice floor can make a previously shorter setup longer, particularly
for easy OBL cases. It prevents those cases from having very short disguised
setups while reducing unnecessary length in longer cases.

**Starting layer orientation** is independent of setup style. **Random top &
bottom turns** adds separate 0°, 90°, 180° or 270° turns, written as `0`, `3`,
`6` or `-3`, after the setup. **Reference orientation** keeps the preferred
algorithm's starting position. Follow the full reveal: it includes any initial
alignment and, for EP, the finishing alignment and middle-layer correction.

Both stages share two-press timing, three-press inspection timing, optional
8s/12s cues, manual entry, Learning batches and all practice-focus choices.
**Slowest N algs** ranks recent clean median solve times under the current
algorithm and conditions; **Recall** uses inconsistency and lapse signals.
Inspection averages and percentages under 15, 12 and 8 seconds remain separate
from solve times. Insights can filter by case, pattern, algorithm, setup style,
layer orientation, timing, session and date. Resetting matching results leaves
the other trainers and your algorithm choices intact.

Their **Full-set progress** charts include the complete OBL or EP catalogue,
regardless of the selected practice subset. Each practised case contributes
equally through the mean of its latest up to N eligible solves. Cases with no
solves are omitted; this chart average is distinct from the clean median used
for speed-focused practice.

## Skewb first layer

Select **Skewb · First layer** to practise finishing the bottom layer when the
**back-left bottom corner, back-right bottom corner and bottom centre** are
already solved. The goal includes correct corner side colours. Other centres
and upper corners can remain mixed. Moves may temporarily disturb the fixed
pieces, provided the complete bottom layer is restored at the end.

There are **81 legal cases**, including one already-solved skip. Each missing
corner has three available positions in its own set of reachable corners,
with three orientations per position: **9 × 9 = 81**. The **80 unsolved cases**
are selected by default, including cases where one front corner is already
solved. Choose the optional **Already solved** case to practise recognising a
skip. The full-set chart covers all 81; as elsewhere, unpractised cases are
omitted from the average.

Start every setup fully solved, **white up, green front and yellow down**.
The dots in the bottom diagram mark the fixed centre and rear corners. Read
all six faces from outside the puzzle; the bottom view's rear edge is at the
bottom of that small diagram.

**Both setups and solutions use NS notation** in this trainer:

| Letter | Corner | Letter | Corner |
| --- | --- | --- | --- |
| F | UFR | f | DFR |
| R | URB | r | DRB |
| B | UBL | b | DBL |
| L | ULF | l | DLF |

U/D mean up/down, F/B front/back and R/L right/left. Each move is a **120°
clockwise turn looking at that corner**; a prime reverses it. Uppercase moves
turn top corners; lowercase moves turn bottom corners. The NS2 trainer uses
WCA notation for its setups, so check the setup heading when switching stages.

In case names, **LF** identifies the yellow–green–orange corner and **RF** the
yellow–green–red corner. Their locations and yellow-sticker directions distinguish
all cases. Recognition groups separate corners on top, twisted bottom corners,
mixed cases and cases with one corner already solved. Choose any subset and
select your preferred solution in the case details. Shortest solutions take
**one to five turns**; the skip needs none.

**Disguised scramble** varies the move sequence and the irrelevant pieces while
preserving the selected first-layer case. **Reference setup** is the direct
inverse of the selected solution. Every offered solution works for every
supplied disguised setup of its case.

The trainer has independent selection, preferences, saved practices and history.
It supports Learning batches, recent-speed focus, both timer modes, optional
inspection cues, inspection statistics, filtered resets and a full-set progress
chart. A full backup includes this trainer, and importing an older backup adds
its default selection and an empty history without changing earlier results.

## Skewb NS2

Select **Skewb · NS2** for **134 NS2 cases** in 20 pattern groups. Only NS2
is included; the source's separate EG2 set is excluded. The library offers
**499 verified algorithm choices**. Choose any case subset and a preferred
algorithm for each case, just as in the other trainers.

The three easy cases omitted from the original collection are included:
**Pure Pi** is in **Pn + HZ Pure**; **Pi + 3S** includes the two cases with
the U-face centre on a side, solved by one sledge or one hedge. Here the U face
is opposite the completed bottom face; its colour can vary. Pure Pi's
default solution is two sledges. The reveal spells out the corner turns, so
there is no need to remember a separate S/H notation. The additions have the
same case selection, Learning batches, timing and statistics as other cases.
Your existing selections are kept; choose the new cases in the library or
use **Select shown** to include them in practice.

Start every setup from a solved Skewb held **white up and green front**: red
right, orange left, blue back and yellow down. After the setup, a completed
side is on the bottom; its colour can vary. Keep that side down and solve all
six faces. A final whole-puzzle rotation does not affect whether it is solved.

**Setups use WCA notation; solutions use explicit NS notation.** These assign
some letters to different corners. Read a corner name as the three faces that
meet there, for example UFR means up–front–right.

| Notation | Corner-turn letters |
| --- | --- |
| WCA, used in setups | U = UBL; R = DRB; L = DLF; B = DBL |
| NS uppercase, used in solutions | F = UFR; R = URB; B = UBL; L = ULF |
| NS lowercase, used in solutions | f = DFR; r = DRB; b = DBL; l = DLF |

Each corner turn is **120° clockwise when looking at that corner**; a prime
reverses it. Uppercase NS moves turn top corners and lowercase moves turn bottom
corners. Whole-cube `x`, `y` and `z` rotations use the usual 90-degree convention.
The source's S/H hammer shorthand has been expanded into explicit turns to
make the displayed solutions unambiguous. Include any rotations shown.

**Disguised scramble** chooses among **20 verified WCA setups per case**, each
reaching the same complete state and working with the selected solution.
**Reference setup** gives a fixed setup. These are practice setups, not
uniform random-state scrambles. The diagram shows the actual stickers and the
completed bottom side; there is no Square-1 layer-orientation control.

The timers, inspection cues, manual entry, Learning batches, recent-speed and
recall focus, saved practices, inspection statistics and filtered history work
as in the other trainers. NS2 has its own full-set progress chart, preferences
and history. Neither its statistics nor filtered resets affect your 2×2,
5×5 or Square-1 results.
