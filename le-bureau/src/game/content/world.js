// Simulation du pays (la nuit), conséquences différées, vote de confiance et épilogue.
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

// ---------- la nuit ----------
export function simulateNight(s, E) {
  const notes = [];
  const w = s.world, p = w.power, f = s.flags;
  const before = { ...p };

  // 1. Rétablissement du courant
  let g = { flandre: 8, bruxelles: 13, wallonie: 9 };
  if (f.priorite === 'hopitaux') g = { flandre: 6, bruxelles: 13, wallonie: 19 };
  if (f.priorite === 'onr') g = { flandre: 14, bruxelles: 17, wallonie: s.day >= 2 ? 17 : 7 };
  if (f.priorite === 'equite') g = { flandre: 9, bruxelles: 13, wallonie: 15 };
  if (f.armee) g.wallonie += Math.round(5 * f.armee);
  if (f.recentralise_ok) { g.flandre += 5; g.bruxelles += 5; g.wallonie += 6; }
  if (f.regions) { g.flandre += 6; g.wallonie -= 3; }
  if (f.scission) { g.flandre += 3; g.wallonie -= 5; }
  for (const k of Object.keys(g)) p[k] = clamp(p[k] + g[k] + Math.round((E.roll() - 0.5) * 4));
  if (f.solidarite) { const gap = p.flandre - p.wallonie; if (gap > 0) { p.flandre -= Math.round(gap * 0.2); p.wallonie += Math.round(gap * 0.3); } }
  for (const k of Object.keys(p)) p[k] = clamp(p[k]);
  notes.push(`Courant rétabli au matin : Flandre ${p.flandre} %, Bruxelles ${p.bruxelles} %, Wallonie ${p.wallonie} %.`);

  // 2. Le froid
  const chaleur = f.chaleur || 0, armee = f.armee || 0;
  let risk = (100 - p.wallonie) / 12 + (100 - p.bruxelles) / 30 + (100 - p.flandre) / 45;
  risk *= (1 - 0.5 * chaleur) * (1 - 0.35 * armee) * (f.froid ? 1.45 : 1) * (f.fonds ? 0.9 : 1);
  const dead = Math.max(0, Math.round(risk * (0.75 + E.roll() * 0.5)));
  w.victimesJour = dead;
  w.victimes += dead;
  if (dead) notes.push(dead === 1 ? 'Le froid a tué une personne cette nuit.' : `Le froid a tué ${dead} personnes cette nuit, surtout dans le Hainaut et à Liège.`);
  else notes.push('Aucun décès lié au froid cette nuit.');
  f.froid = false;

  // 3. La rue
  let du = p.wallonie < 50 ? 5 : p.wallonie < 75 ? 2 : -3;
  if (s.stats.population < 35) du += 4;
  du += dead * 0.8;
  if (w.rempart > 45) du += 3;
  if (f.police) du -= 2;
  if (f.couvrefeu) du -= 4;
  du -= 3;
  w.unrest = clamp(w.unrest + Math.round(du));

  // 4. Indicateurs
  const avg = (p.flandre + p.bruxelles + p.wallonie) / 3;
  const gain = (p.flandre - before.flandre + p.bruxelles - before.bruxelles + p.wallonie - before.wallonie) / 3;
  E.stat('population', Math.round(-dead * 0.7 + gain / 8 - (w.unrest > 60 ? 3 : 0)));
  E.stat('economie', Math.round(-(100 - avg) / 14 + (avg > 80 ? 1 : 0)));
  E.stat('cohesion', Math.round(-Math.max(0, p.flandre - p.wallonie - 25) / 12 + (f.interfederal ? 2 : 0) - (w.separatisme > 50 ? 2 : 0)));
  E.stat('stabilite', -1 - (s.stats.population < 30 ? 3 : 0) - (s.stats.institutions < 35 ? 2 : 0));
  w.rempart = clamp(w.rempart + (w.unrest > 50 ? 4 : 1) + (s.stats.population < 35 ? 2 : 0) - (f.elections || f.commission ? 2 : 0));
  w.separatisme = clamp(w.separatisme + (s.stats.cohesion < 40 ? 4 : 1));
  if (w.unrest > 60) notes.push('Nuit agitée : pillages et affrontements signalés à Charleroi et Seraing.');
  else if (w.unrest < 30) notes.push('La nuit a été calme dans les grandes villes.');
  if (w.rempart > 40 && w.rempart - 4 <= 40) notes.push('Le Rempart revendique 30 000 nouveaux adhérents en trois jours.');

  // 5. Démissions et loyautés
  if (!s.resigned.verhaegen && s.trust.verhaegen < 22) {
    s.resigned.verhaegen = true;
    E.stat('stabilite', -6).stat('institutions', -4).log('Annelies Verhaegen a remis sa démission.', 'alert');
    E.dossier('demission_verhaegen', {});
    notes.push('Annelies Verhaegen a démissionné pendant la nuit.');
  }
  if (!s.resigned.lenoir && s.trust.lenoir < 20) {
    s.resigned.lenoir = true;
    E.stat('stabilite', -4).log('Margaux Lenoir a quitté votre cabinet.', 'alert');
    E.dossier('depart_lenoir', {});
    notes.push('Margaux Lenoir a quitté votre cabinet.');
  }
  if (!s.resigned.dufrasne && s.trust.dufrasne < 18) {
    s.resigned.dufrasne = true;
    E.stat('institutions', -5).world('couronne', -5).log('Le général Dufrasne a demandé à être relevé de ses fonctions.', 'alert');
    E.dossier('depart_dufrasne', {});
    notes.push('Le général Dufrasne a demandé à être relevé de ses fonctions.');
  }

  // 6. La menace qui rôde (non annoncée au joueur)
  if (s.day === 2 && !f.sabotage2_checked) {
    f.sabotage2_checked = true;
    let hit = false;
    if (s.truth === 'interne') hit = !f.garde && !f.arrestation_prevue;
    if (s.truth === 'cyber') hit = !(f.sgrs && E.roll() < 0.7);
    if (s.truth === 'negligence') hit = !f.recentralise && E.roll() < 0.45;
    if (hit) E.schedule(1, 'sabotage2');
  }

  // 7. Capital politique du lendemain
  const income = 10 + Math.round(s.stats.stabilite / 10) + (f.rempart_canal ? 4 : 0) + (f.confederal_soutien ? 3 : 0);
  E.capital(income);
  notes.push(`Capital politique : +${income} pour demain.`);
  return notes;
}

// ---------- vote de confiance ----------
function voteScore(s) {
  const st = s.stats, f = s.flags, a = (id) => s.adopted.includes(id);
  let score = 0.42 * st.stabilite + 0.2 * st.institutions + 0.18 * st.population + 0.12 * st.cohesion + 0.08 * st.economie;
  let mods = 0;
  if (f.majorite === 'succes') mods += 6; else if (f.majorite === 'partiel') mods += 3;
  if (f.verts) mods += 4;
  if (f.message_royal) mods += 4;
  if (f.elections) mods += 6;
  if (f.interfederal) mods += 2;
  if (a('pouvoirs_speciaux')) mods -= s.world.couronne >= 40 ? 2 : 6;
  if (a('dialogue_rempart')) mods -= 5;
  if (a('brigades')) mods -= 6;
  if (a('boucs_emissaires')) mods -= 3;
  if (f.ecoutes_revelees) mods -= 6;
  if (f.confederal) mods += 10;
  if (f.pacte_rempart) mods += 5;
  if (f.vdb_soutien) mods += 3;
  if (f.gerard_fachee) mods -= 2;
  if (f.conflit_palais) mods -= 3;
  if (f.dementi && f.ecoutes_revelees) mods -= 4;
  if (s.resigned.verhaegen) mods -= 5;
  if (s.resigned.lenoir) mods -= 3;
  return Math.round(36 + score * 0.9 + mods);
}
export function voteEstimate(s) {
  const real = voteScore(s);
  const noise = Math.round(((s.seed % 7) - 3) * (1 - s.trust.lenoir / 120));
  return { pour: Math.max(20, Math.min(140, real + noise)) };
}
export function voteOfConfidence(s) {
  if (s.flags.exception) return { kind: 'exception', pour: null, contre: null };
  const pour = Math.max(10, Math.min(145, voteScore(s)));
  const abst = s.flags.verts ? 6 : 3;
  const contre = 150 - pour - abst;
  return { kind: pour >= 76 ? 'confiance' : 'chute', pour, contre, abst };
}

// ---------- titres de presse ----------
export function headline(s) {
  const f = s.flags, w = s.world;
  const paper = s.stats.libertes < 40 ? 'La Sentinelle' : 'Le Courrier de Bruxelles';
  if (f.exception) return { paper: 'La Sentinelle', title: 'L’ORDRE, ENFIN', sub: 'Le Parlement suspendu « jusqu’au retour du calme ». Plusieurs rédactions n’ont pas paru.' };
  if (w.victimesJour >= 6) return { paper, title: `Le froid a tué ${w.victimesJour} fois cette nuit`, sub: 'Dans le Hainaut, des familles dorment dans leur voiture, moteur allumé.' };
  if (f.scission && !f.scission_titre) { f.scission_titre = true; return { paper, title: 'Deux réseaux, bientôt deux pays ?', sub: 'La scission du réseau électrique divise jusqu’au sein des partis flamands.' }; }
  if (f.accusation && !f.accusation_titre) { f.accusation_titre = true; return { paper: 'La Sentinelle', title: '« SABOTEURS ÉTRANGERS » : LE GÉNÉRAL DÉSIGNE L’ENNEMI', sub: 'Aucune preuve n’a été présentée. Le Rempart appelle à « la vigilance de chacun ».' }; }
  if (f.brigades && !f.brigades_titre) { f.brigades_titre = true; return { paper, title: 'Les brigades du Rempart patrouillent à Seraing', sub: 'Brassards noirs, lampes torches et aucune formation. La police locale « prend acte ».' }; }
  if (f.message_royal && !f.roi_titre) { f.roi_titre = true; return { paper, title: '« Nous ne sommes qu’un seul pays dans le noir »', sub: 'Le Roi s’est adressé à la Nation en français, en néerlandais et en allemand.' }; }
  if (f.interfederal && !f.inter_titre) { f.inter_titre = true; return { paper, title: 'Autour d’une même table, enfin', sub: 'La cellule interfédérale s’est réunie jusqu’à deux heures du matin.' }; }
  if (w.unrest > 60) return { paper, title: 'Nuit de colère à Charleroi', sub: 'Vitrines brisées, barricades : les quartiers sans courant ne croient plus aux promesses.' };
  if (w.power.wallonie > 80) return { paper, title: 'La lumière revient en Wallonie', sub: 'Mais les factures, les enquêtes et les rancunes, elles, ne font que commencer.' };
  return { paper, title: 'Le courant revient, la colère reste', sub: `Wallonie : ${w.power.wallonie} % des foyers alimentés. À Bruxelles, le métro roule au ralenti.` };
}

// ---------- conséquences différées ----------
export const CONSEQUENCES = {
  pouvoirs_reaction(s, E) {
    E.stat('institutions', s.world.couronne >= 40 ? -2 : -5).trust('verhaegen', -6);
    E.dossier('conseil_etat', {});
  },
  recentralisation(s, E) {
    const ok = E.roll() < 0.72;
    E.flag('recentralise_ok', ok);
    if (ok) E.power('flandre', 6).power('bruxelles', 6).power('wallonie', 6);
    else E.power('wallonie', 2).stat('stabilite', -2);
    E.dossier('recentralisation', { ok });
  },
  agressions(s, E) {
    E.world('unrest', 6).stat('economie', -3).stat('population', -2);
    E.note({ id: 'agr', text: 'Agressions ?', lon: 4.42, lat: 50.95, color: '#d0302a', dx: 30, dy: -40 });
    E.dossier('agressions', {});
  },
  bavure(s, E) {
    if (E.roll() < 0.55) {
      E.flag('bavure').stat('population', -6).world('rempart', 3).stat('institutions', -3);
      E.marker({ id: 'bavure', type: 'emeute', lon: 5.4994, lat: 50.5833, city: 'seraing', dx: -24, dy: -8 });
      E.dossier('bavure', { grave: true });
    } else {
      E.world('unrest', -3).stat('libertes', -2);
      E.dossier('bavure', { grave: false });
    }
  },
  arrestation(s, E) {
    E.flag('arrestation').world('enquete', 40).stat('population', 4).stat('institutions', 2);
    E.dossier('arrestation', {});
  },
  fuite_ecoutes(s, E) {
    E.flag('ecoutes_revelees').stat('population', -6).stat('institutions', -5).stat('stabilite', -6).trust('verhaegen', -8);
    E.dossier('fuite_ecoutes', {});
  },
  tir_seraing(s, E) {
    E.stat('population', -5).world('unrest', 5).stat('libertes', -2).stat('cohesion', -3);
    E.marker({ id: 'tir', type: 'emeute', lon: 5.4994, lat: 50.5833, city: 'seraing', dx: -24, dy: -8 });
    E.dossier('tir_seraing', {});
  },
  commission_conclusions(s, E) {
    E.flag('verite');
    if (s.truth === 'negligence') E.stat('economie', -2).stat('population', 4).stat('institutions', 2);
    if (s.truth === 'cyber') E.stat('population', 2).stat('cohesion', 3).stat('economie', -1);
    if (s.truth === 'interne') E.world('unrest', -2).stat('population', 3);
    E.dossier('commission', {});
  },
  sabotage2(s, E) {
    const region = s.truth === 'cyber' ? 'flandre' : 'wallonie';
    E.power(region, -14).world('unrest', 5).stat('population', -3).stat('economie', -2).flag('sabotage2');
    E.marker({ id: 'sab2', type: 'sabotage', lon: region === 'flandre' ? 4.29 : 5.65, lat: region === 'flandre' ? 51.3 : 50.7, dx: 0, dy: 0 });
    E.dossier('sabotage2', { region });
  },
};

export const HINTS = {
  pouvoirs_reaction: 'Le Conseil d’État doit rendre son avis sur les pouvoirs spéciaux.',
  recentralisation: 'Les Régions n’ont pas encore répondu à la refédéralisation du réseau.',
  agressions: 'Vos accusations circulent. Personne ne sait encore ce qu’elles vont déclencher.',
  bavure: 'Les brigades du Rempart patrouillent cette nuit pour la première fois.',
  arrestation: 'La police judiciaire suit une piste précise.',
  fuite_ecoutes: 'Quelqu’un, quelque part, sait pour les écoutes.',
  tir_seraing: 'Une vidéo tournée à Seraing circule. Personne ne l’a encore authentifiée.',
  commission_conclusions: 'La commission d’enquête remettra ses premières conclusions.',
  sabotage2: null,
};

// ---------- épilogue ----------
const TRUTH_TEXT = {
  negligence: 'Ce que l’on sait aujourd’hui : il n’y a pas eu d’attaque. Un transformateur du poste de Courcelles-Motte, dont l’ONR avait reporté trois fois la révision pour raisons budgétaires, a lâché par grand froid. Les protections automatiques ont fait le reste. Les « traces de piratage » étaient des balayages de routine, sans lien.',
  cyber: 'Ce que l’on sait aujourd’hui : un logiciel malveillant, baptisé BRABO par les enquêteurs, a pris le contrôle des automates de trois postes haute tension. Les serveurs de commande renvoient vers un groupe lié à une puissance étrangère, qu’aucun gouvernement européen n’a encore officiellement nommé.',
  interne: 'Ce que l’on sait aujourd’hui : un ancien technicien de l’ONR, licencié en novembre et proche d’une mouvance radicale, a utilisé un badge non désactivé pour saboter le poste de Courcelles-Motte. Il a agi presque seul. Aucune puissance étrangère n’est impliquée.',
};
const ATTRIB = { negligence: 'des défaillances de l’ONR', cyber: 'une cyberattaque étrangère', interne: 'un sabotage intérieur', attente: 'rien avant la fin de l’enquête' };

export function dominantPath(s) {
  const score = { couronne: 0, rempart: 0, regions: 0, compromis: 0 };
  const weights = {
    conseil_couronne: ['couronne', 1], pouvoirs_speciaux: ['couronne', 2], recentraliser: ['couronne', 2], message_royal: ['couronne', 1.5],
    dialogue_rempart: ['rempart', 1.2], boucs_emissaires: ['rempart', 2], brigades: ['rempart', 2], etat_exception: ['rempart', 4],
    regions_crise: ['regions', 1], scinder_reseau: ['regions', 2], conference_confederale: ['regions', 3],
    cellule_interfederale: ['compromis', 1], commission_enquete: ['compromis', 1.5], solidarite: ['compromis', 1.5], elections: ['compromis', 3],
  };
  for (const id of s.adopted) if (weights[id]) score[weights[id][0]] += weights[id][1];
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : 'gestion';
}

export function epilogue(s) {
  const path = dominantPath(s);
  const vote = s.ended?.vote || voteOfConfidence(s);
  const st = s.stats, w = s.world, f = s.flags;
  const P = [];
  let title, verdict;

  if (s.ended?.kind === 'chute' && !vote.pour) {
    title = 'Le gouvernement est tombé';
    verdict = 'Avant même le vote, votre majorité s’est dissoute. Le Roi a accepté votre démission à 23 h 10.';
  } else if (vote.kind === 'exception') {
    title = 'Le Parlement ne siège plus';
    verdict = 'Il n’y a pas eu de vote jeudi soir. Les portes de l’hémicycle sont restées fermées, gardées par des brigades à brassard noir.';
  } else if (vote.kind === 'confiance') {
    title = 'La confiance, de justesse';
    verdict = `Jeudi, 18 h 52 : ${vote.pour} voix pour, ${vote.contre} contre, ${vote.abst} abstentions. Votre gouvernement survit à la crise.`;
  } else {
    title = 'Motion de défiance';
    verdict = `Jeudi, 18 h 52 : ${vote.pour} voix pour, ${vote.contre} contre. Il en fallait 76. Vous restez en affaires courantes jusqu’à la formation d’un nouveau gouvernement.`;
  }

  const paths = {
    couronne: {
      name: 'La voie de la Couronne',
      text: 'Le pays a retrouvé la lumière plus vite qu’il ne le craignait, et il sait à qui il le doit : un Palais redevenu central, une armée présente, un État qui décide. En Flandre, beaucoup y voient un retour en arrière ; les constitutionnalistes s’interrogent sur ce que pèse encore le Parlement. L’ordre est revenu. La question de savoir à qui il appartient reste ouverte.',
    },
    rempart: {
      name: 'La voie du Rempart',
      text: f.exception
        ? 'Le calme règne. Il règne parce que les rédactions se censurent, parce que les brigades tiennent les carrefours, parce que ceux qui protestent sont « signalés ». Le Rempart n’a pas pris le pouvoir : vous le lui avez prêté, et il ne compte pas le rendre. Plusieurs pays européens ont rappelé leur ambassadeur.'
        : 'Le Rempart est entré dans l’État par la porte de service : des brigades reconnues, un discours repris au sommet, des ennemis désignés. Les rues de Seraing sont plus calmes. Les familles des personnes agressées parce qu’elles « avaient l’air étrangères » ne le sont pas. Ce que vous avez légitimé ne s’éteindra pas avec la crise.',
    },
    regions: {
      name: 'La voie des Régions',
      text: f.confederal
        ? 'Pour la première fois, la fin de la Belgique est une négociation officielle, avec un calendrier. La Flandre a rallumé ses lumières plus vite ; la Wallonie a compté ses morts et ses dettes. Personne ne sait si l’on discute d’une confédération ou d’un divorce. Bruxelles, au milieu, se demande à qui elle appartiendra.'
        : 'Chaque Région a géré « sa » crise. Les écarts se sont creusés : en Flandre, on parle d’efficacité, en Wallonie d’abandon. Vous n’avez pas scindé le pays. Vous avez montré qu’il pouvait fonctionner en deux morceaux, et beaucoup s’en souviendront.',
    },
    compromis: {
      name: 'La voie du Compromis',
      text: f.elections
        ? 'Vous avez rendu la main. Dans quarante jours, les Belges voteront, la lumière revenue, avec une commission d’enquête et des comptes publics sur la table. C’était plus lent. Il y a eu des nuits où l’on vous a cru faible. Mais aucune Région ne peut dire qu’elle a été sacrifiée, et aucune liberté n’a été suspendue pour aller plus vite.'
        : 'Le pays a tenu, péniblement, autour d’une table où chacun avait sa chaise. Rien n’a été rapide : les arbitrages ont pris des nuits, les reproches ont fusé. Mais les Régions sortent de la crise en se parlant encore, et c’est plus que ce que beaucoup prédisaient lundi matin.',
    },
    gestion: {
      name: 'La voie du gestionnaire',
      text: 'Vous n’avez choisi aucune direction. Vous avez répondu au téléphone, signé des ordres, tenu la ligne. Certains diront que c’était de la prudence. D’autres, que le pays attendait un cap et n’a reçu qu’un standard téléphonique.',
    },
  };
  const pth = paths[path];
  P.push(pth.text);

  // Vérité et attribution publique
  const att = f.attribution;
  let truthLine = TRUTH_TEXT[s.truth];
  if (att && att !== 'attente') {
    truthLine += att === s.truth ? ` Vous aviez publiquement désigné ${ATTRIB[att]}. Vous aviez raison, et cela a compté.` : ` Vous aviez publiquement désigné ${ATTRIB[att]}. Vous vous étiez trompé, et la presse ne l’oubliera pas.`;
  } else if (att === 'attente') {
    truthLine += ' Vous aviez refusé de désigner un coupable avant l’enquête. On vous l’a reproché sur le moment.';
  }

  const fates = [];
  fates.push(s.resigned.verhaegen ? 'Annelies Verhaegen a démissionné. Elle prépare un livre.' : s.trust.verhaegen > 60 ? 'Annelies Verhaegen reste à l’Intérieur. Elle vous fait confiance, ce qui n’était pas gagné.' : 'Annelies Verhaegen reste en poste, par devoir plus que par loyauté.');
  fates.push(s.resigned.dufrasne ? 'Le général Dufrasne a été relevé à sa demande. Il dîne souvent au Palais.' : s.trust.dufrasne > 70 && w.couronne > 40 ? 'Le général Dufrasne a pris goût à la lumière. On le cite déjà pour « un rôle politique ».' : 'Le général Dufrasne est retourné à ses états-majors.');
  fates.push(s.resigned.lenoir ? 'Margaux Lenoir a quitté votre cabinet. Elle répond désormais aux journalistes.' : s.stats.stabilite < 32 && s.trust.lenoir > 62 ? 'Margaux Lenoir est restée. Elle vous a parfois menti pour vous épargner. Vous ne saurez jamais combien de fois.' : 'Margaux Lenoir est restée à vos côtés.');

  return {
    title,
    verdict,
    path,
    pathName: pth.name,
    paragraphs: P,
    truth: truthLine,
    fates,
    figures: [
      ['Décès liés au froid', String(w.victimes)],
      ['Courant en Wallonie', `${w.power.wallonie} %`],
      ['Influence du Rempart', w.rempart > 55 ? 'forte' : w.rempart > 35 ? 'en hausse' : 'contenue'],
      ['Tentation séparatiste', w.separatisme > 55 ? 'forte' : w.separatisme > 35 ? 'en hausse' : 'contenue'],
      ['Place du Palais', w.couronne > 50 ? 'centrale' : w.couronne > 30 ? 'renforcée' : 'protocolaire'],
    ],
    stats: { ...st },
  };
}
