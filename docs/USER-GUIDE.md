# Corner Lab user guide

Corner Lab trains 2×2 CLL, EG1, EG2, recognition AUF, finishing AUF, and short
one-look solutions with the first face on the bottom. It also trains 5×5 last
two edges and last two centres. Choose a trainer from the selector beside the
app name. You use your physical cube and record times with the keyboard, a
button, or manual entry. The following practice instructions describe the 2×2
trainer; see [5X5-GUIDE.md](5X5-GUIDE.md) for 5×5 practice.

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
when ready to start its timer. This warning appears in all three trainers.

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
**Full algorithm set** selector offers nine choices:

- 2×2 CLL, EG1, or EG2 individually.
- CLL + EG1, CLL + EG2, EG1 + EG2, or all three together.
- 5×5 last two edges or 5×5 last two centres.

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
the initial chart choice, while the selector still offers all nine choices.
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

If a saved file cannot be loaded or a save fails, the app shows the error.
Existing saved data is not silently replaced with fresh defaults after a load
failure. Export any current in-memory results you need to preserve, and import
a valid backup to restore normal saving.

The browser preview uses its own localStorage and is separate from the Mac
app. Transfer data between them using JSON export/import. All practice, diagrams,
algorithms, and statistics work offline. Source links open external reference
pages only when you choose to follow them.

See [SOURCES.md](SOURCES.md) for algorithm provenance, complete-case verification,
source corrections, and case-numbering conventions.
