import {facelets} from './cube.js';

export const COLORS = {U:'#efcd53',D:'#faf9f5',F:'#54a487',B:'#6089cf',R:'#db7161',L:'#eeab5b'};
export function cubeSVG(state, {size=180, net=false}={}) {
  const f=facelets(state);
  if(net) {
    const positions={U:[2,0],L:[0,2],F:[2,2],R:[4,2],B:[6,2],D:[2,4]};
    return `<svg width="${size}" viewBox="-3 -3 170 132" role="img" aria-label="All six cube faces">${Object.entries(positions).map(([face,[x,y]])=>f[face].map((c,i)=>`<rect x="${(x+i%2)*20}" y="${(y+Math.floor(i/2))*20}" width="19" height="19" rx="3" fill="${COLORS[c]}" stroke="#233c38" stroke-width="1.5"/>`).join('')).join('')}</svg>`;
  }
  // Bilinear face grids. Top row of F and R sits next to U.
  const faces=[['U',[[90,12],[163,50],[90,90],[17,50]]],['F',[[17,50],[90,90],[90,176],[17,135]]],['R',[[90,90],[163,50],[163,135],[90,176]]]];
  const point=(q,u,v)=>[q[0][0]*(1-u)*(1-v)+q[1][0]*u*(1-v)+q[2][0]*u*v+q[3][0]*(1-u)*v,q[0][1]*(1-u)*(1-v)+q[1][1]*u*(1-v)+q[2][1]*u*v+q[3][1]*(1-u)*v];
  // U corners run back-left, back-right, front-right, front-left around q,
  // matching the engine's row-major U indices 0, 1, 3, 2 directly.
  return `<svg width="${size}" viewBox="0 0 180 191" role="img" aria-label="Cube state, upper, front and right faces"><g stroke="#263e37" stroke-width="4.5" stroke-linejoin="round">${faces.map(([face,q])=>[0,1,2,3].map(i=>{const x=i%2/2,y=Math.floor(i/2)/2;return `<polygon points="${[[x,y],[x+.5,y],[x+.5,y+.5],[x,y+.5]].map(([u,v])=>point(q,u,v).join(',')).join(' ')}" fill="${COLORS[f[face][i]]}"/>`}).join('')).join('')}</g></svg>`;
}
export function topSVG(state,size=78) {
  const f=facelets(state),tile=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${COLORS[c]}" stroke="#233c38" stroke-width="1.2"/>`;
  return `<svg width="${size}" viewBox="0 0 90 90" role="img" aria-label="Top-layer case diagram">${f.U.map((c,i)=>tile(21+i%2*25,21+Math.floor(i/2)*25,23,23,c)).join('')}${[0,1].map(i=>tile(21+i*25,9,23,9,f.B[1-i])+tile(21+i*25,73,23,9,f.F[i])+tile(9,21+i*25,9,23,f.L[i])+tile(73,21+i*25,9,23,f.R[1-i])).join('')}</svg>`;
}

/** First-face recognition mask, in a fixed U/F/R/D net. Yellow is the
 * intended D color regardless of the eventual training color scheme. */
export function firstFaceSVG(state,size=98) {
  const f=facelets(state),positions={U:[2,0],L:[0,2],F:[2,2],R:[4,2],B:[6,2],D:[2,4]};
  return `<svg class="first-face-diagram" width="${size}" viewBox="-2 -2 100 76" role="img" aria-label="First-face sticker pattern, six-face net with yellow target stickers">${Object.entries(positions).map(([face,[x,y]])=>f[face].map((c,i)=>`<rect x="${(x+i%2)*12}" y="${(y+Math.floor(i/2))*12}" width="11" height="11" rx="1.5" fill="${c==='D'?'#efcd53':'#e9ede7'}" stroke="${c==='D'?'#a99349':'#c4cec0'}" stroke-width=".7"/>`).join('')+`<text x="${x*12+11.5}" y="${y*12+14}" text-anchor="middle" font-size="6" font-family="sans-serif" font-weight="600" fill="#596b51" stroke="#fff" stroke-width="1.8" paint-order="stroke">${face}</text>`).join('')}</svg>`;
}
