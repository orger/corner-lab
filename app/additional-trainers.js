import { CASES_SQ1_OBL } from './catalog-square1-obl.js';
import { CASES_SQ1_EP } from './catalog-square1-ep.js';
import { createOBLDrill, createEPDrill } from './square1-last-layer.js';
import { square1LastLayerSVG } from './square1-last-layer-view.js';
import { solvedSquare1, applySquare1Alg, inverseSquare1 } from './square1.js';
import { CASES_SKEWB_NS2 } from './catalog-skewb-ns2.js';
import { createSkewbDrill, previewSkewbState } from './skewb.js';
import { skewbSVG } from './skewb-view.js';
import { CASES_SKEWB_FIRST_LAYER } from './catalog-skewb-first-layer.js';
import { createSkewbFirstLayerDrill, previewSkewbFirstLayerState } from './skewb-first-layer.js';

const square1Moves = '(a,b) turns the top and bottom in 30° steps, clockwise when viewed from outside that layer. / slices the right half by 180°. Only slice when both layers have a gap along the cut.';
const square1Preview = alg => applySquare1Alg(solvedSquare1(), inverseSquare1(alg));
const square1Common = {
  setupTitle: 'SETUP FROM A SOLVED SQUARE-1',
  setupHelp: 'Start fully solved, white on top, in the reference alignment below. Apply every turn and slice shown.',
  referenceHelp: 'Start every setup fully solved with the colours and piece alignment shown here. The dashed line is the slice; both layers must have a gap along it.',
  alignmentHelp: 'Adds independent top and bottom quarter turns after the setup. The reveal includes the starting alignment for your chosen algorithm.',
  moveHelp: square1Moves,
  selectionHelp: 'Choose individual cases in the library, or select whole pattern groups here.',
  insightsTitle: 'Recognise patterns. Build fluency.',
};
const oblSource = 'The 185 OBL cases from Malte Ihlefeld’s Alg-Trainers, including the EO cases. OBL orients both layers after cube shape; piece permutation is a later step.';
const epSource = 'All 99 edge-permutation cases from Sarah Strong’s Square-1 EP collection: 49 without parity and 50 with parity. Start with both layers oriented and corners permuted; the solved skip is excluded.';

export const ADDITIONAL_TRAINERS = [
  {
    id: 'square1-obl', label: 'Square‑1 · OBL', branch: 'sq1obl', cases: CASES_SQ1_OBL,
    options: {
      kind: 'square1-obl', setId: 'OBL', buildDrill: createOBLDrill,
      previewState: square1Preview, diagram: (state, options) => square1LastLayerSVG(state, { ...options, stage: 'obl' }),
      presentation: {
        ...square1Common, noun: 'OBL', singular: 'OBL', title: 'Orient both layers.', eyebrow: 'SQUARE-1 / OBL',
        intro: 'Recognise the two colour patterns. Orient the top and bottom.',
        sourceNote: oblSource, libraryTitle: '185 OBL cases. Your selection.',
        libraryIntro: 'Choose the colour patterns and algorithm alternatives you want to practise.',
        solutionHelp: 'Includes starting alignment. Stop when both layers are square and each has one face colour; permutation and the middle layer are outside OBL.',
        previewHelp: 'Top and bottom are viewed from outside. Restore square layers with one face colour on each. Side colours and permutation do not need to match.',
        caseHelp: 'The reference diagram follows this algorithm’s setup. Random top and bottom alignment is included in the practice reveal.',
        notationHTML: `<p>${oblSource}</p><p>${square1Moves}</p><p>Disguised scrambles use short alternative routes with at least five slices, aligned to your preferred algorithm. Stop after orienting both square layers. Permutation and middle-layer orientation are separate steps.</p><p><a href="https://mihlefeld.github.io/Alg-Trainers/Sq1-OBL-Trainer/index.html?select" target="_blank" rel="noreferrer">Original OBL trainer ↗</a></p>`,
        presetHint: 'e.g. Two-slice OBL', exportName: 'Square1-OBL',
      },
    },
  },
  {
    id: 'square1-ep', label: 'Square‑1 · EP', branch: 'sq1ep', cases: CASES_SQ1_EP,
    options: {
      kind: 'square1-ep', setId: 'EP', buildDrill: createEPDrill,
      previewState: square1Preview, diagram: (state, options) => square1LastLayerSVG(state, { ...options, stage: 'ep' }),
      presentation: {
        ...square1Common, noun: 'EP', singular: 'EP', title: 'Finish the edge permutation.', eyebrow: 'SQUARE-1 / EP',
        intro: 'Read the side colours. Place the edges. Finish the solve.',
        sourceNote: epSource, libraryTitle: '99 EP cases. Your selection.',
        libraryIntro: 'Practise any subset, including parity cases. Choose the algorithm you prefer for each case.',
        solutionHelp: 'Follow the full solution, including final alignment and any middle-layer correction, then stop with the puzzle solved.',
        previewHelp: 'Side stickers show the edge and corner colours. Top and bottom are viewed from outside; compare each edge with its neighbouring corners.',
        caseHelp: 'The diagram shows the edge permutation in this algorithm’s reference alignment. The practice reveal includes all required starting and finishing turns.',
        notationHTML: `<p>${epSource}</p><p>${square1Moves}</p><p>Disguised scrambles use short alternative routes with at least five slices to the selected permutation. The reveal includes final layer alignment and a middle-layer correction when needed, so the full sequence finishes the puzzle.</p><p><a href="https://sarah.cubing.net/square-1/ep" target="_blank" rel="noreferrer">Sarah Strong’s EP collection ↗</a></p>`,
        presetHint: 'e.g. EP parity cases', exportName: 'Square1-EP',
      },
    },
  },
  {
    id: 'skewb-first-layer', label: 'Skewb · First layer', branch: 'skewbfl', cases: CASES_SKEWB_FIRST_LAYER,
    options: {
      kind: 'skewb-first-layer', setId: 'FL', buildDrill: createSkewbFirstLayerDrill,
      previewState: previewSkewbFirstLayerState, diagram: (state, options) => skewbSVG(state, { ...options, firstLayer: true }),
      presentation: {
        noun: 'first-layer', singular: 'first-layer', title: 'Finish the first layer.', eyebrow: 'SKEWB / FIRST LAYER',
        intro: 'Two rear corners and the bottom centre are in place. Finish the two front corners.',
        sourceNote: 'All 81 legal configurations with the yellow bottom centre and both rear-bottom corners solved: 80 unsolved cases and one optional skip. Each missing corner has nine possible positions and orientations. Solutions finish the entire bottom layer, including side colours.',
        libraryTitle: '81 first-layer cases. Your selection.', libraryIntro: 'Choose recognition groups or individual cases. The 80 unsolved cases are selected by default; Already solved is an optional skip.',
        selectionHelp: 'Select patterns here, or choose individual positions and twists in the library.',
        setupTitle: 'SETUP FROM A SOLVED SKEWB · NS NOTATION',
        setupHelp: 'Start solved with white up, green front and yellow down. Both setups and solutions use NS corner turns; uppercase and lowercase turn different corners. See Settings for the mapping.',
        referenceHelp: 'Start fully solved, white up and green front. After the setup, the yellow centre and the two rear-bottom corners remain in place. Keep this grip throughout the solution.',
        previewHelp: 'The dots on the bottom view mark the fixed centre and rear corners. Complete the yellow bottom layer with its side colours matching; the other centres and upper corners can remain mixed.',
        solutionHelp: 'NS notation. Stop with all four bottom corners and the yellow centre correctly placed, including the corner side colours. The fixed pieces may move during the solution, but must finish restored.',
        caseHelp: 'LF is the yellow–green–orange corner; RF is yellow–green–red. The case name gives each corner’s location and the direction its yellow sticker faces. Both setups and solutions use NS notation.',
        moveHelp: 'NS: F=UFR, R=URB, B=UBL, L=ULF; f=DFR, r=DRB, b=DBL, l=DLF. Each letter turns 120° clockwise looking at that corner; a prime reverses it. U/D mean up/down, F/B front/back, and R/L right/left in corner names.',
        providedLabel: 'Reference setup', insightsTitle: 'Recognise the corners. Shorten the pause.',
        notationHTML: '<p>All 81 legal first-layer cases keep the bottom centre and the two rear-bottom corners solved. The 80 unsolved cases are selected initially; select Already solved to practise recognising a skip. Cases with a third corner already solved are included.</p><p>Start fully solved, white up, green front and yellow down. Finish with the yellow centre and all four yellow corners correctly placed, including their side colours. Other centres and upper corners are outside this step.</p><p><strong>Both setups and solutions use NS notation:</strong> F=UFR, R=URB, B=UBL, L=ULF; f=DFR, r=DRB, b=DBL, l=DLF. Uppercase turns a top corner and lowercase turns a bottom corner. Turn 120° clockwise when looking directly at the named corner; a prime reverses it. This differs from the WCA setups used in the NS2 trainer.</p><p>Each front corner has three available positions and three orientations, giving 9 × 9 = 81 cases. The library includes shortest solutions of one to five turns. Disguised scrambles vary the route and the irrelevant pieces while preserving the selected first-layer case. Reference setup is the direct inverse of your chosen solution.</p>',
        presetHint: 'e.g. Both corners on top', exportName: 'Skewb-First-Layer',
      },
    },
  },
  {
    id: 'skewb-ns2', label: 'Skewb · NS2', branch: 'skewbns2', cases: CASES_SKEWB_NS2,
    options: {
      kind: 'skewb', setId: 'NS2', buildDrill: createSkewbDrill, previewState: previewSkewbState, diagram: skewbSVG,
      presentation: {
        noun: 'NS2', singular: 'Skewb', title: 'Recognise the NS2 finish.', eyebrow: 'SKEWB / NS2',
        intro: 'Choose your patterns. Learn the sequence. Finish the Skewb.',
        sourceNote: '134 NS2 cases across 20 pattern groups: the 131 from Malte Ihlefeld’s trainer plus Pure Pi and the two side-facing Pi + 3S finishes. The separate EG2 cases are excluded. Algorithm choices have been checked against each setup.',
        libraryTitle: '134 NS2 cases. Your selection.', libraryIntro: 'Choose individual cases or whole pattern groups, then select your preferred algorithm.',
        selectionHelp: 'Select NS2 pattern groups here, or choose individual cases in the library.',
        setupTitle: 'SETUP FROM A SOLVED SKEWB · WCA NOTATION',
        setupHelp: 'Start solved with white up and green front. Scrambles use WCA U / R / L / B turns; solutions use the NS notation described in Settings.',
        referenceHelp: 'Start every setup fully solved, white up and green front. After the setup, the completed side is on the bottom; its colour varies by case.',
        previewHelp: 'The diagram shows the actual scrambled stickers. Start with the completed side on the bottom, then follow any rotations in your chosen algorithm.',
        solutionHelp: 'Solutions use explicit NS corner-turn notation. Follow any whole-cube rotations shown. Stop when all six faces are solved.',
        caseHelp: 'Scrambles use WCA notation. These solutions use explicit NS moves, with hammer shorthand expanded to avoid ambiguity. Uppercase and lowercase moves turn different corners.',
        moveHelp: 'NS: F=UFR, R=URB, B=UBL, L=ULF; f=DFR, r=DRB, b=DBL, l=DLF. Turn 120° clockwise looking at the named corner; a prime reverses it. x, y and z rotate the whole cube.',
        providedLabel: 'Reference setup', insightsTitle: 'Learn the patterns. Steady the finish.',
        notationHTML: '<p>The 134 NS2 cases include the source’s 131 cases plus Pure Pi and the two Pi + 3S cases with the U centre on a side face. Here U means the colour opposite the completed bottom face. Pure Pi is in Pn + HZ Pure; the single-sledge and single-hedge cases are in Pi + 3S. The source’s EG2 set is separate and is not part of this trainer.</p><p><strong>Scrambles use WCA notation:</strong> U turns around UBL, R around DRB, L around DLF, and B around DBL. Start white up and green front.</p><p><strong>Solutions use NS notation:</strong> F=UFR, R=URB, B=UBL, L=ULF; f=DFR, r=DRB, b=DBL, l=DLF. Uppercase corners are on top and lowercase corners on the bottom. Each move is a 120° clockwise turn looking at that corner; a prime reverses it. Whole-cube x/y/z rotations use the usual 90° convention.</p><p>S/H hammer shorthand has been expanded into explicit turns. Disguised mode chooses from 20 verified equivalent setups per case. Stop when the whole Skewb is solved.</p><p><a href="https://mihlefeld.github.io/Alg-Trainers/Skewb-NS2-Trainer/index.html?select" target="_blank" rel="noreferrer">Original NS2 trainer ↗</a></p>',
        presetHint: 'e.g. Pi + Swirl', exportName: 'Skewb-NS2',
      },
    },
  },
];
