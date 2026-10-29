import { createDrill } from './cube5.js';
import { compileCentresAlg } from './catalog-centres.js';

/** Keep the same drill interface as the edge trainer. Inverse setups preserve
 * the four finished centres and the front face's left 2×3 centre block.
 * Edge pairing is deliberately unrestricted at the centre-solving stage.
 */
export function createCentresDrill(options = {}) {
  const result = createDrill({ ...options, alg: compileCentresAlg(options.alg || '') });
  const centres = result.afterSetupStatus.centres;
  const mixed = centres.filter(centre => !centre.solved);
  const front = centres.find(centre => centre.face === 'F');
  if (mixed.length !== 2 || mixed.some(centre => !['U', 'F'].includes(centre.face)) ||
      ![0, 1, 3, 4, 6, 7].every(index => front.colors[index] === front.color)) {
    throw new Error('A last-two-centres case must preserve the other four centres and the front 2×3 block.');
  }
  return { ...result, centreCaseVerified: true };
}
