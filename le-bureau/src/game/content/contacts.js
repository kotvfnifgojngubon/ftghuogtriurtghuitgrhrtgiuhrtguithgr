// Personnages, ordres possibles par téléphone, demandes et comptes rendus.
// Tous les personnages et organisations sont fictifs.
import { voteEstimate } from './world.js';

export const CONTACTS = {
  verhaegen: {
    name: 'Annelies Verhaegen', role: 'Ministre de l’Intérieur', initials: 'AV', tone: '#3b5b9a', main: true,
    bio: 'Juriste anversoise, vingt ans de carrière. Tient à la légalité comme à une rambarde. Commande la police fédérale et le Centre de crise.',
    resignedText: 'Annelies Verhaegen a démissionné. Son intérim est assuré par un secrétaire général qui n’exécute que le strict minimum.',
  },
  dufrasne: {
    name: 'Lt-gén. Raoul Dufrasne', role: 'Chef de la Défense', initials: 'RD', tone: '#56683c', main: true,
    bio: 'Officier namurois, proche du Palais. Efficace, loyal à la Couronne avant tout. Il n’aime pas les ordres timides.',
  },
  lenoir: {
    name: 'Margaux Lenoir', role: 'Cheffe de cabinet', initials: 'ML', tone: '#8a2433', main: true,
    bio: 'Votre bras droit. Elle connaît chaque député et chaque rédacteur en chef. Elle vous protège, parfois de vous-même, parfois de la vérité.',
  },
  gerard: { name: 'Isabelle Gérard', role: 'Ministre-présidente wallonne', initials: 'IG', tone: '#b0302a' },
  vandenbroeck: { name: 'Pieter Van den Broeck', role: 'Ministre-président flamand', initials: 'PV', tone: '#c9a227' },
  delorge: { name: 'Maxime Delorge', role: 'Fondateur du Rempart', initials: 'MD', tone: '#1a1a1a' },
  palais: { name: 'Baron Antoine Desmet', role: 'Chef de cabinet du Roi', initials: 'AD', tone: '#7d1022' },
  claes: { name: 'Sofie Claes', role: 'Journaliste, De Ochtendpost', initials: 'SC', tone: '#4a5560' },
  lejeune: { name: 'Marc Lejeune', role: 'Administrateur de l’ONR', initials: 'ML', tone: '#6a6a40' },
};

const pct = (v) => `${Math.round(v)} %`;
const unrestText = (u) => (u < 25 ? 'calme, presque trop' : u < 45 ? 'tendu mais tenu' : u < 65 ? 'des débordements chaque nuit' : 'au bord de l’émeute');

export function greeting(c, s) {
  const t = s.trust[c];
  if (c === 'verhaegen') {
    if (t < 30) return 'Verhaegen. Je vous écoute. Sachez que je note désormais chacun de vos ordres.';
    if (s.adopted.includes('brigades')) return 'J’ai lu le décret sur les « brigades ». Je vous écoute, mais je ne l’appliquerai pas de gaieté de cœur.';
    return ['', 'Verhaegen. Le Centre de crise tourne à plein. Dites-moi ce dont vous avez besoin.', 'Bonjour, mon Général. Nuit difficile à Charleroi. Je vous écoute.', 'Verhaegen. J’ai trois gouverneurs en attente sur l’autre ligne. Faites vite.', 'C’est le jour du vote. Je vous écoute, et j’espère que vous savez compter.'][s.day];
  }
  if (c === 'dufrasne') {
    if (t < 30) return 'Dufrasne. (Un silence.) À vos ordres, puisqu’il le faut.';
    if (s.adopted.includes('conseil_couronne')) return 'Mon Général. Le Palais est satisfait de la tournure des choses. Que puis-je pour vous ?';
    return ['', 'Dufrasne. Mes unités sont en alerte depuis 4 heures du matin. J’attends vos instructions.', 'Mon Général. Mes hommes sont prêts. Il ne manque qu’une décision.', 'Dufrasne. Je n’aime pas ce que je vois dans les rapports de la nuit.', 'Mon Général. Quelle que soit l’issue du vote ce soir, l’armée restera l’armée.'][s.day];
  }
  if (c === 'lenoir') {
    if (t < 35) return 'Oui ? (Elle ne dit pas « mon Général ». Elle le disait toujours.)';
    return ['', 'Je suis là. Je suis toujours là. Allez-y.', 'Bonjour. J’ai lu toute la presse de la nuit. Vous voulez la version courte ?', 'Lenoir. Les couloirs du Parlement bruissent. Qu’est-ce qu’on fait ?', 'Le vote est à 18 heures. Je vous écoute.'][s.day];
  }
  return 'Allô ?';
}

// Points de situation : chaque source voit le pays à sa façon (biais assumés).
export function situation(c, s) {
  const p = s.world.power;
  const w = s.world;
  if (c === 'verhaegen') {
    const r = w.rempart < 40 ? 'Le Rempart ? Du bruit sur les réseaux sociaux, rien de structuré à mon avis.' : 'Le Rempart a des relais dans certaines zones de police. Ça m’inquiète vraiment.';
    const v = w.victimes ? `On compte ${w.victimes} décès liés au froid depuis lundi. Les communes en signalent d’autres, non confirmés.` : 'Aucun décès confirmé à ce stade. Ça ne durera pas si les températures restent à −9.';
    return `Ordre public : ${unrestText(w.unrest)}. Courant rétabli à ${pct(p.flandre)} en Flandre, ${pct(p.bruxelles)} à Bruxelles, ${pct(p.wallonie)} en Wallonie, selon l’ONR. ${v} ${r}`;
  }
  if (c === 'dufrasne') {
    const u = Math.min(100, w.unrest + 15);
    const cyb = s.flags.sgrs ? 'Mon renseignement maintient : signature étrangère, sans aucun doute.' : 'Mon instinct me dit que ce n’est pas une panne. Quelqu’un a frappé, et quelqu’un de l’extérieur.';
    return `Situation sécuritaire : ${unrestText(u)}. Les zones de police wallonnes sont à bout. ${s.flags.armee ? 'Mes génies ont installé des groupes électrogènes dans les hôpitaux.' : 'Je peux déployer 2 000 hommes en six heures si vous le décidez.'} ${cyb}`;
  }
  if (c === 'lenoir') {
    const est = voteEstimate(s);
    const lie = s.stats.stabilite < 32 && s.trust.lenoir > 62;
    const pour = lie ? Math.max(est.pour, 76) : est.pour;
    const vote = `Si le vote de confiance avait lieu maintenant : environ ${pour} voix pour, sur 150. Il en faut 76.`;
    const press = s.stats.population < 35 ? 'La presse vous décrit comme dépassé.' : s.stats.population < 55 ? 'La presse hésite. Elle attend de voir.' : 'La presse vous ménage, pour l’instant.';
    const reg = s.stats.cohesion < 40 ? 'Les partis flamands et wallons ne se parlent plus que par communiqués.' : 'Les présidents de parti se parlent encore. C’est déjà ça.';
    return `${vote} ${press} ${reg}${lie ? ' (Elle a répondu très vite. Peut-être trop vite.)' : ''}`;
  }
  return '';
}

// ---------- Ordres ----------
// legal : true | 'douteux' | false (ou fonction de l'état)
// willing(s) => { mode: 'oui' | 'reticent' | 'refus', text }
// resolve(s, E, outcome) appliqué à l'arrivée du compte rendu ; immediate(s, E) appliqué tout de suite.
export const ORDERS = [
  // --- Intérieur ---
  {
    id: 'v_police', contact: 'verhaegen', label: 'Renforcer la police fédérale à Charleroi et Liège', base: 0.72, legal: true,
    ask: 'Envoyez la police fédérale en renfort à Charleroi et à Liège.',
    willing: (s) => ({ mode: 'oui', text: 'Je peux libérer 600 policiers. Les zones locales vont râler, mais c’est faisable.' }),
    resolve(s, E, o) {
      E.flag('police');
      if (o === 'succes') E.world('unrest', -9).stat('population', 2).stat('libertes', -1);
      else if (o === 'partiel') E.world('unrest', -4).stat('libertes', -1);
      else E.world('unrest', 3).stat('institutions', -2);
      E.marker({ id: 'police-cha', type: 'police', lon: 4.4446, lat: 50.4108, dx: -26, dy: 6 });
      E.marker({ id: 'police-lie', type: 'police', lon: 5.5797, lat: 50.6326, dx: -26, dy: 6 });
    },
    report: {
      succes: 'Fait : 640 policiers fédéraux déployés à Charleroi et Liège avant 18 h. Patrouilles mixtes avec les zones locales. Échec : rien de notable. Incertain : la fatigue des effectifs au troisième jour.',
      partiel: 'Fait : 380 policiers arrivés à Liège. Échec : à Charleroi, la zone locale a refusé de partager son centre de commandement ; renforts mal coordonnés. Incertain : qui commande quoi, cette nuit.',
      echec: 'Fait : les colonnes sont parties. Échec : bouchons, carburant rationné, et deux syndicats policiers ont déposé un préavis. Les renforts sont arrivés de nuit, désorganisés. Incertain : l’impact sur le moral.',
    },
  },
  {
    id: 'v_chaleur', contact: 'verhaegen', label: 'Ouvrir des centres d’accueil chauffés', base: 0.7, legal: true,
    ask: 'Ouvrez des centres d’accueil chauffés dans toutes les communes sans courant.',
    mod: (s) => (s.flags.armee ? 0.12 : 0),
    willing: () => ({ mode: 'oui', text: 'Enfin quelqu’un qui pense aux gens avant les centrales. Je mobilise les gouverneurs.' }),
    immediate: (s, E) => E.trust('verhaegen', 4),
    resolve(s, E, o) {
      const k = o === 'succes' ? 1 : o === 'partiel' ? 0.5 : 0.15;
      E.flag('chaleur', k);
      E.stat('population', Math.round(5 * k)).stat('economie', -2);
      if (k > 0.4) {
        E.marker({ id: 'chaleur-cha', type: 'chaleur', lon: 4.3, lat: 50.43, dx: 0, dy: 0 });
        E.marker({ id: 'chaleur-lie', type: 'chaleur', lon: 5.62, lat: 50.58, dx: 0, dy: 0 });
      }
    },
    report: {
      succes: 'Fait : 212 centres ouverts (écoles, salles de sport, églises), 31 000 personnes hébergées la première nuit. Échec : aucun. Incertain : les stocks de mazout pour les chaudières, estimés à quatre jours.',
      partiel: 'Fait : 118 centres ouverts. Échec : dans le Hainaut, les groupes électrogènes manquent ; plusieurs centres n’ont ouvert qu’à 22 h. Incertain : combien de personnes âgées sont restées chez elles.',
      echec: 'Fait : une liste de bâtiments a été établie. Échec : sans chauffage de secours, la plupart des centres n’ont pas pu ouvrir. Incertain : tout le reste.',
    },
  },
  {
    id: 'v_couvrefeu', contact: 'verhaegen', label: 'Imposer un couvre-feu nocturne (Hainaut, Liège)', base: 0.68, legal: 'douteux',
    ask: 'Je veux un couvre-feu de 22 h à 6 h dans le Hainaut et la province de Liège.',
    willing: (s) => (s.world.unrest > 58 ? { mode: 'reticent', text: 'Vu les pillages, je peux le défendre devant un juge. À peine.' } : { mode: 'refus', text: 'Un couvre-feu pour quelques vitrines ? Les gouverneurs refuseront, et ils auront raison. Je ne le signerai pas.' }),
    resolve(s, E, o) {
      if (o === 'echec') { E.world('unrest', 4).stat('institutions', -3).log('Couvre-feu : contesté et mal appliqué.'); return; }
      E.flag('couvrefeu');
      E.world('unrest', o === 'succes' ? -13 : -7).stat('libertes', -8).stat('population', -3).stat('cohesion', -3);
      E.note({ id: 'cf', text: 'Couvre-feu 22 h–6 h', lon: 4.6, lat: 50.25, color: '#d0302a', dx: 30, dy: 40 });
    },
    report: {
      succes: 'Fait : couvre-feu appliqué dès 22 h ; 214 interpellations la première nuit. Échec : aucun recours n’a abouti. Incertain : la Ligue des droits humains a saisi le Conseil d’État.',
      partiel: 'Fait : couvre-feu en vigueur à Liège. Échec : trois bourgmestres du Hainaut refusent de l’appliquer. Incertain : sa base légale, que deux constitutionnalistes contestent déjà à la radio.',
      echec: 'Fait : l’arrêté a été publié. Échec : suspendu en référé par le Conseil d’État à 21 h 40. Incertain : votre crédit auprès des juges.',
    },
  },
  {
    id: 'v_enquete', contact: 'verhaegen', label: 'Prioriser l’enquête de la police judiciaire', base: 0.7, legal: true,
    ask: 'Donnez à la police judiciaire tous les moyens sur l’origine de la panne.',
    willing: () => ({ mode: 'oui', text: 'Le parquet fédéral sera ravi. Ils réclamaient des enquêteurs depuis lundi.' }),
    resolve(s, E, o) {
      E.world('enquete', o === 'succes' ? 30 : o === 'partiel' ? 15 : 5);
      E.flag('pj');
      if (s.truth === 'interne' && o !== 'echec') E.flag('arrestation_prevue').schedule(1, 'arrestation');
    },
    report: {
      succes: (s) => `Fait : 40 enquêteurs détachés, saisie des journaux d’accès du poste de Courcelles-Motte. Échec : aucun. Incertain : ${s.truth === 'interne' ? 'un badge d’accès utilisé à 2 h 58 appartiendrait à un employé licencié en novembre.' : 'les journaux d’accès ne montrent aucune intrusion physique évidente.'}`,
      partiel: 'Fait : 15 enquêteurs détachés. Échec : l’ONR tarde à remettre les journaux d’accès, invoquant le « secret industriel ». Incertain : pourquoi l’ONR traîne des pieds.',
      echec: 'Fait : la demande est transmise. Échec : le parquet et l’ONR se renvoient la responsabilité des scellés. Incertain : l’état des preuves.',
    },
  },
  {
    id: 'v_ecoutes', contact: 'verhaegen', label: 'Autoriser des écoutes sans mandat', base: 0.55, legal: false,
    ask: 'Je veux des écoutes sur les suspects. Sans attendre de mandat.',
    willing: () => ({ mode: 'refus', text: 'Non. C’est illégal, et vous le savez. Si vous insistez, je le ferai consigner.' }),
    immediate: (s, E) => E.flag('ecoutes'),
    resolve(s, E, o) {
      E.stat('libertes', -9).stat('institutions', -5).world('enquete', o === 'echec' ? 0 : 15);
      if (E.roll() < 0.6) E.schedule(1, 'fuite_ecoutes');
    },
    report: {
      succes: 'Fait : 37 lignes placées sous écoute, dont celles de deux syndicalistes de l’ONR et d’un journaliste. Échec : aucun. Incertain : combien de personnes savent que cela s’est fait.',
      partiel: 'Fait : 12 lignes écoutées. Échec : un opérateur télécom a exigé un mandat et prévenu son service juridique. Incertain : ce que fera ce service juridique.',
      echec: 'Fait : rien d’exploitable. Échec : deux opérateurs ont refusé. L’un d’eux a gardé une copie de la demande. Incertain : à qui il la montrera.',
    },
  },
  // --- Défense ---
  {
    id: 'd_logistique', contact: 'dufrasne', label: 'Engager l’armée en soutien logistique (hôpitaux, générateurs)', base: 0.84, legal: true,
    ask: 'Mettez vos génies et vos groupes électrogènes à disposition des hôpitaux et des communes.',
    willing: () => ({ mode: 'oui', text: 'Avec plaisir. C’est exactement pour cela qu’on s’entraîne.' }),
    immediate: (s, E) => E.trust('dufrasne', 5),
    resolve(s, E, o) {
      E.flag('armee', o === 'echec' ? 0.3 : o === 'partiel' ? 0.7 : 1);
      E.stat('population', o === 'echec' ? 0 : 5).stat('institutions', 2).power('wallonie', o === 'succes' ? 7 : 3);
      E.marker({ id: 'armee-hop', type: 'armee', lon: 4.5, lat: 50.36, dx: 20, dy: 10 });
      E.marker({ id: 'armee-lie', type: 'armee', lon: 5.62, lat: 50.66, dx: 18, dy: -6 });
    },
    report: {
      succes: (s) => `Fait : 1 400 militaires engagés, 86 groupes électrogènes installés dans 23 hôpitaux et maisons de repos. Échec : aucun. Incertain : ${s.trust.dufrasne > 68 ? 'le général a aussi déployé des unités devant deux préfectures de police. Vous ne l’aviez pas demandé.' : 'la durée de l’effort sans relève.'}`,
      partiel: 'Fait : les hôpitaux de Charleroi sont sécurisés. Échec : à Liège, une partie du matériel était en maintenance. Incertain : les maisons de repos isolées.',
      echec: 'Fait : quelques convois sont partis. Échec : carburant militaire bloqué par une procédure d’achat. Incertain : la date de livraison.',
    },
  },
  {
    id: 'd_garde', contact: 'dufrasne', label: 'Placer les postes haute tension sous garde militaire', base: 0.8, legal: true,
    ask: 'Je veux des soldats devant chaque poste haute tension du pays.',
    willing: () => ({ mode: 'oui', text: 'Points vitaux, mission classique. Ce sera fait cette nuit.' }),
    resolve(s, E, o) {
      if (o !== 'echec') E.flag('garde');
      E.stat('libertes', -1).stat('population', 1);
    },
    report: {
      succes: 'Fait : 74 postes haute tension gardés jour et nuit. Échec : aucun. Incertain : les postes secondaires, trop nombreux pour être couverts.',
      partiel: 'Fait : les 30 postes principaux sont gardés. Échec : les autres attendront 48 heures. Incertain : si un saboteur connaît la liste.',
      echec: 'Fait : un plan est prêt. Échec : manque d’effectifs, priorité aux hôpitaux. Incertain : tout.',
    },
  },
  {
    id: 'd_patrouilles', contact: 'dufrasne', label: 'Faire patrouiller l’armée dans les rues', base: 0.72, legal: (s) => (s.adopted.includes('pouvoirs_speciaux') || s.adopted.includes('etat_exception') ? true : 'douteux'),
    ask: 'Mettez des patrouilles armées dans les rues de Charleroi, Liège et Bruxelles.',
    willing: (s) => ({ mode: 'oui', text: s.adopted.includes('pouvoirs_speciaux') ? 'Avec les pouvoirs spéciaux, j’ai le cadre. Ce sera fait.' : 'Je le ferai. Mais sans cadre légal, ce sont mes hommes qui seront poursuivis. Je vous demande de vous en souvenir.' }),
    immediate: (s, E) => E.trust('verhaegen', -10).trust('dufrasne', 4),
    resolve(s, E, o) {
      E.flag('patrouilles');
      E.world('unrest', o === 'succes' ? -14 : -8).stat('libertes', -9).stat('cohesion', -4).world('couronne', 4);
      if (!s.adopted.includes('pouvoirs_speciaux')) E.stat('institutions', -4);
      if (o !== 'succes') E.schedule(1, 'tir_seraing');
      E.marker({ id: 'pat-bxl', type: 'armee', lon: 4.3517, lat: 50.8503, dx: 28, dy: 18 });
    },
    report: {
      succes: 'Fait : 900 soldats en patrouille. Les pillages ont cessé à Seraing et Marchienne. Échec : aucun incident. Incertain : l’image, à l’étranger, de soldats armés dans les rues de Bruxelles.',
      partiel: 'Fait : patrouilles en place. Échec : à Seraing, une patrouille a été prise à partie ; tir de sommation. Incertain : la vidéo qui circule déjà.',
      echec: 'Fait : patrouilles déployées. Échec : affrontement à Seraing, un jeune homme blessé par balle. Incertain : la version des faits.',
    },
  },
  {
    id: 'd_renseignement', contact: 'dufrasne', label: 'Mobiliser le renseignement militaire sur l’attaque', base: 0.7, legal: true,
    ask: 'Mettez le renseignement militaire sur l’origine de la panne.',
    willing: () => ({ mode: 'oui', text: 'Le SGRS n’attendait que ça. Rapport demain matin.' }),
    resolve(s, E, o) {
      E.flag('sgrs');
      E.world('enquete', o === 'succes' ? 15 : 6);
      E.dossier('sgrs', { outcome: o });
    },
    report: {
      succes: 'Fait : le SGRS a analysé les automates du poste de Courcelles-Motte. Échec : aucun. Incertain : voir la note jointe, classée confidentiel.',
      partiel: 'Fait : analyse partielle. Échec : l’ONR n’a donné qu’un accès en lecture. Incertain : voir la note jointe.',
      echec: 'Fait : une équipe a été dépêchée. Échec : accès refusé par l’ONR sans réquisition. Incertain : la note jointe repose sur des sources ouvertes.',
    },
  },
  // --- Cabinet ---
  {
    id: 'l_allocution', contact: 'lenoir', label: 'Préparer une allocution télévisée ce soir', base: 0.8, legal: true, reportDelay: 4,
    ask: 'Préparez-moi une allocution pour le journal de 19 h.',
    willing: () => ({ mode: 'oui', text: 'Quel ton ? Je vous écris trois versions et vous choisirez. Réponse dans mon dossier.' }),
    immediate: (s, E) => E.dossier('allocution', {}, 1),
    resolve() {},
    report: {
      succes: 'Fait : trois versions rédigées ; la régie de la RTBF et de la VRT confirme le direct. Incertain : ce que vous direz.',
      partiel: 'Fait : deux versions. La VRT ne garantit que le différé. Incertain : l’audience en Flandre.',
      echec: 'Fait : un texte. Échec : les chaînes n’ont pas de créneau avant 21 h. Incertain : qui regardera encore.',
    },
  },
  {
    id: 'l_majorite', contact: 'lenoir', label: 'Négocier avec les partis de la majorité (10 capital)', base: 0.68, legal: true,
    avail: (s) => s.capital >= 10,
    ask: 'Négociez avec les présidents de parti. Je veux une majorité jeudi.',
    willing: () => ({ mode: 'oui', text: 'Ça coûtera. Des postes, des promesses, un peu de votre dignité. Je m’en occupe.' }),
    immediate: (s, E) => E.capital(-10),
    resolve(s, E, o) {
      E.stat('stabilite', o === 'succes' ? 7 : o === 'partiel' ? 3 : -1);
      E.flag('majorite', o);
    },
    report: {
      succes: 'Fait : accord avec trois présidents de parti sur un « programme d’urgence ». Échec : aucun. Incertain : ce qu’ils vous demanderont après la crise.',
      partiel: 'Fait : deux partis suivent. Échec : les libéraux flamands posent des conditions sur l’énergie. Incertain : leur vote jeudi.',
      echec: 'Fait : réunion tenue. Échec : le compte rendu a fuité dans la presse avant même la fin. Incertain : votre crédit auprès des présidents de parti.',
    },
  },
  {
    id: 'l_sondage', contact: 'lenoir', label: 'Compter les voix pour le vote de confiance', base: 0.9, legal: true, reportDelay: 1,
    ask: 'Faites le compte des voix, groupe par groupe.',
    willing: () => ({ mode: 'oui', text: 'Donnez-moi une heure et quelques coups de fil.' }),
    resolve(s, E) { E.dossier('decompte', {}); },
    report: {
      succes: 'Fait : décompte établi, voir la note jointe. Incertain : une dizaine de députés « réservés ».',
      partiel: 'Fait : décompte partiel, voir la note jointe. Incertain : deux groupes n’ont pas répondu.',
      echec: 'Fait : décompte approximatif, voir la note jointe. Incertain : à peu près tout.',
    },
  },
];

// ---------- Demandes des interlocuteurs ----------
export const REQUESTS = [
  {
    id: 'fonds_communes', contact: 'verhaegen', day: 2,
    text: () => 'Les gouverneurs de Hainaut et de Liège demandent 40 millions d’urgence pour les communes. Chauffage, repas, personnel. Je soutiens leur demande.',
    choices: [
      { key: 'oui', label: 'Accorder les 40 millions', reply: 'Accordé. Faites-le savoir.', answer: 'Merci. Ça se saura, et ça comptera.', logText: 'fonds d’urgence accordés aux communes.', fx: (s, E) => E.stat('economie', -3).stat('population', 4).stat('cohesion', 3).trust('verhaegen', 6).world('victimes', 0).flag('fonds') },
      { key: 'non', label: 'Refuser (le budget est exsangue)', reply: 'Non. Le budget ne le permet pas.', answer: 'Alors ce sont les communes qui annonceront que l’État fédéral les a laissées tomber.', logText: 'fonds d’urgence refusés.', fx: (s, E) => E.trust('verhaegen', -6).stat('cohesion', -3) },
    ],
  },
  {
    id: 'reservistes', contact: 'dufrasne', day: 2,
    text: () => 'Je demande l’autorisation de rappeler 3 000 réservistes. Mes hommes tiennent depuis 48 heures sans relève.',
    choices: [
      { key: 'oui', label: 'Autoriser le rappel', reply: 'Rappelez-les.', answer: 'Merci, mon Général. Vous ne le regretterez pas.', logText: 'rappel de 3 000 réservistes.', fx: (s, E) => E.trust('dufrasne', 8).world('couronne', 3).world('unrest', -3).stat('economie', -1).stat('libertes', -1).flag('reservistes') },
      { key: 'non', label: 'Refuser', reply: 'Pas maintenant. Faites tourner vos effectifs.', answer: 'À vos ordres. (Un temps.) Je le consignerai.', logText: 'rappel des réservistes refusé.', fx: (s, E) => E.trust('dufrasne', -8) },
    ],
  },
  {
    id: 'verts', contact: 'lenoir', day: 3,
    text: () => 'Les écologistes sont prêts à s’abstenir jeudi. En échange : un plan d’investissement public dans le réseau, chiffré, annoncé avant le vote.',
    choices: [
      { key: 'oui', label: 'Accepter (8 capital)', reply: 'Faites-leur cette promesse.', answer: 'C’est noté. Ils vont vous coûter cher, mais ils tiennent parole.', logText: 'accord d’abstention avec les écologistes.', fx: (s, E) => E.capital(-8).stat('stabilite', 4).stat('economie', -2).flag('verts') },
      { key: 'non', label: 'Refuser', reply: 'Je ne négocie pas le réseau électrique dans un couloir.', answer: 'Noble. Et coûteux. Il nous manquera peut-être ces voix.', logText: 'accord avec les écologistes refusé.', fx: (s, E) => E.trust('lenoir', -3) },
    ],
  },
  {
    id: 'cadre_ecrit', contact: 'verhaegen', day: 3, cond: (s) => s.adopted.includes('brigades') || s.flags.patrouilles || s.flags.ecoutes,
    text: () => 'Je veux que vous signiez de votre main chaque ordre qui touche aux libertés. Si quelque chose tourne mal, je ne serai pas seule à en répondre.',
    choices: [
      { key: 'oui', label: 'Signer', reply: 'Je signerai. J’assume.', answer: 'Bien. Au moins, les choses sont claires entre nous.', logText: 'vous signez personnellement les ordres sensibles.', fx: (s, E) => E.trust('verhaegen', 10).stat('institutions', 2).flag('signature') },
      { key: 'non', label: 'Refuser', reply: 'Ce n’est pas le moment de faire du juridisme.', answer: 'Alors je réfléchirai à ma place dans ce gouvernement.', logText: 'vous refusez de signer les ordres sensibles.', fx: (s, E) => E.trust('verhaegen', -14) },
    ],
  },
];
