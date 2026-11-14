// Petites aides DOM, typographie française et pictogrammes SVG dessinés à la main.

export function h(tag, attrs = {}, ...kids) {
  const el = tag === 'svg' ? document.createElementNS('http://www.w3.org/2000/svg', 'svg') : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv);
        else el.style[sk] = sv;
      }
    }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

// Espaces fines insécables avant la ponctuation haute, après « et avant ».
export function typo(text) {
  return String(text)
    .replace(/ ([?!:;»])/g, ' $1')
    .replace(/« /g, '« ')
    .replace(/([0-9]) %/g, '$1 %');
}

const P = {
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 10h18"/>',
  screen: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  crown: '<path d="M3 18h18M4 16 3 7l5 4 4-7 4 7 5-4-1 9z"/>',
  seal: '<circle cx="12" cy="10" r="6"/><path d="m9 15-2 6 5-2 5 2-2-6"/><path d="M10 10h4"/>',
  pylon: '<path d="M8 21 12 3l4 18M9.5 14h5M10.5 9h3M6 7h12M5 11h14"/>',
  speech: '<path d="M4 5h16v10H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  shield: '<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z"/><path d="M12 7v9"/>',
  finger: '<path d="M7 11V5a1.5 1.5 0 0 1 3 0v6"/><path d="M10 10h5a3 3 0 0 1 3 3v2a6 6 0 0 1-6 6h-1a5 5 0 0 1-4-2l-3-4 1.5-1.5L8 15"/>',
  band: '<path d="M6 8c3 1.5 9 1.5 12 0v8c-3 1.5-9 1.5-12 0z"/><path d="M10 10.5v5M14 10.5v5"/>',
  gate: '<path d="M4 21V9l8-5 8 5v12"/><path d="M8 21v-8h8v8M12 13v8"/>',
  split: '<path d="M12 3v6M12 9 6 15v6M12 9l6 6v6"/><circle cx="12" cy="3" r="1"/>',
  table: '<ellipse cx="12" cy="12" rx="8" ry="4"/><path d="M4 12v4M20 12v4M12 16v4"/>',
  ballot: '<path d="M4 11h16v9H4z"/><path d="M8 11V4h8v7M10 7l1.5 1.5L14 6"/>',
  circle: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="5" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/><circle cx="5" cy="12" r="1.5"/>',
  lens: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 6 6"/>',
  hands: '<path d="M3 13l4-4 3 2 2-2 3 3 3-3 3 4"/><path d="M7 9l5 5 3-3"/><path d="M4 16l3 3h10l3-3"/>',
  scroll: '<path d="M7 4h11v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2h12"/><path d="M7 4a2 2 0 0 0-2 2v10M10 8h5M10 11h5"/>',
  note: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 15h7M9 9h3"/>',
  report: '<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 11h6M9 14h4"/>',
  press: '<path d="M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v10a2 2 0 0 1-2 2M7 9h7M7 12h7M7 15h5"/>',
  letter: '<rect x="3" y="6" width="18" height="12" rx="1"/><path d="m3 7 9 6 9-6"/>',
  secret: '<rect x="5" y="10" width="14" height="10" rx="1"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  palace: '<path d="M3 21h18M5 21V10M19 21V10M9 21v-7M15 21v-7M3 10l9-6 9 6z"/>',
  chart: '<path d="M4 20V4M4 20h16M7 15l4-4 3 3 5-6"/>',
};
export function icon(name) {
  const span = document.createElement('span');
  span.className = 'ico';
  span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${P[name] || P.note}</svg>`;
  return span;
}
export function svgIcon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${P[name] || P.note}</svg>`;
}
export const KIND_ICON = { note: 'note', rapport: 'report', presse: 'press', courrier: 'letter', renseignement: 'secret', palais: 'palace', analyse: 'chart', cr: 'note' };
export const KIND_LABEL = { note: 'Note', rapport: 'Rapport', presse: 'Presse', courrier: 'Courrier', renseignement: 'Renseignement', palais: 'Palais', analyse: 'Analyse', cr: 'Compte rendu' };

export function fmtHour(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')} h ${String(mm).padStart(2, '0')}`;
}

export function statColor(v) {
  return v < 25 ? '#d8473f' : v < 40 ? '#d4893c' : v < 60 ? '#c9b45c' : '#86a86f';
}
export function statWord(k, v) {
  const W = {
    stabilite: ['en sursis', 'fragile', 'tenue', 'solide'],
    population: ['hostile', 'méfiante', 'partagée', 'confiante'],
    cohesion: ['rompue', 'fracturée', 'tendue', 'unie'],
    economie: ['en chute', 'à l’arrêt', 'ralentie', 'robuste'],
    institutions: ['défiantes', 'réticentes', 'loyales', 'acquises'],
    libertes: ['suspendues', 'restreintes', 'surveillées', 'garanties'],
  }[k];
  return W[v < 25 ? 0 : v < 40 ? 1 : v < 60 ? 2 : 3];
}
