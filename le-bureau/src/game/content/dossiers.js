// Dossiers reçus sur le bureau. Les dossiers « suivis » (core) reviennent chaque matin, mis à jour.
// Les sources sont parfois incomplètes ou partiales : au joueur de comparer.
import { CONTACTS, ORDERS } from './contacts.js';
import { voteEstimate } from './world.js';

const DATE = ['', 'lundi 13 janvier', 'mardi 14 janvier', 'mercredi 15 janvier', 'jeudi 16 janvier'];
const ATTRIB_TEXT = { cyber: 'une cyberattaque étrangère', interne: 'un sabotage intérieur', negligence: 'des défaillances de l’ONR', attente: 'aucune piste avant la fin de l’enquête' };

export const CORE_DOSSIERS = ['reseau', 'secours', 'enquete', 'presse', 'parlement'];

export const DOSSIERS = {
  // ================= Dossiers suivis =================
  reseau: {
    core: true, kind: 'rapport', title: 'Réseau électrique : point de situation',
    source: 'Opérateur national du réseau (ONR), direction des opérations',
    body(s, c) {
      const p = s.world.power;
      const out = [`Situation au ${DATE[c.day]}, 7 h. Foyers alimentés : Flandre ${p.flandre} %, Bruxelles ${p.bruxelles} %, Wallonie ${p.wallonie} %.`];
      const pr = s.flags.priorite;
      if (pr === 'onr') out.push('Conformément à la consigne, la remise sous tension suit l’ordre technique : nœud d’Anvers-Port, puis dorsale Bruxelles–Namur, puis Hainaut et Liège.');
      else if (pr === 'hopitaux') out.push('Conformément à la consigne gouvernementale, les postes qui alimentent les hôpitaux wallons passent en premier. L’ONR rappelle que cet ordre allonge le délai global de 18 à 24 heures.');
      else if (pr === 'equite') out.push('Délestage tournant national : coupures de deux heures par quartier, Flandre comprise. Le dispositif est complexe ; des erreurs de séquence sont signalées à Gand et à Ostende.');
      else out.push('En l’absence de consigne politique, l’ONR applique son plan technique standard.');
      if (s.flags.sabotage2 && c.day >= 3) out.push('Nouvel incident cette nuit sur un poste secondaire. L’ONR demande une protection militaire de l’ensemble des sites.');
      out.push('L’ONR maintient l’hypothèse d’une intervention extérieure sur les automates du poste de Courcelles-Motte. Aucun défaut de maintenance n’a été identifié à ce stade.');
      const days = Math.max(1, Math.ceil((100 - p.wallonie) / 16));
      out.push(`Rétablissement complet estimé : ${days} jour${days > 1 ? 's' : ''}, sous réserve de nouvel incident.`);
      return out;
    },
  },
  secours: {
    core: true, kind: 'rapport', title: 'Victimes, hôpitaux, personnes vulnérables',
    source: 'Centre de crise national',
    urgent: (s) => s.world.victimesJour >= 4,
    body(s, c) {
      const w = s.world, f = s.flags;
      const out = [];
      out.push(w.victimes ? `Décès liés au froid confirmés depuis lundi : ${w.victimes}, dont ${w.victimesJour} la nuit dernière. Parmi eux, une majorité de personnes âgées vivant seules.` : 'Aucun décès lié au froid n’est confirmé. Température relevée à Charleroi cette nuit : −9 °C.');
      out.push(f.armee ? 'Hôpitaux : les établissements des zones touchées fonctionnent sur groupes électrogènes militaires. Plus aucune évacuation prévue.' : 'Hôpitaux : trois établissements de Charleroi et deux de Liège tournent sur groupes électrogènes. Autonomie restante : 30 à 36 heures.');
      out.push(f.chaleur ? `Centres d’accueil chauffés : ${f.chaleur >= 1 ? 212 : f.chaleur > 0.4 ? 118 : 23} ouverts. La Croix-Rouge demande plus de lits de camp.` : 'Aucun centre d’accueil chauffé n’a été ouvert au niveau fédéral. Les communes improvisent avec des salles de sport.');
      out.push('La Croix-Rouge estime à 40 000 le nombre de personnes âgées isolées sans chauffage. Elle n’a de bénévoles que pour en visiter 6 000.');
      return out;
    },
  },
  enquete: {
    core: true, kind: 'renseignement', title: 'Origine de la panne',
    source: (s, c) => (c.day === 1 ? 'Police judiciaire fédérale' : c.day === 2 ? 'Sûreté de l’État' : 'Synthèse du Centre de crise'),
    stamp: () => 'Confidentiel',
    body(s, c) {
      const t = s.truth, f = s.flags;
      if (c.day === 1) {
        const hint = { interne: 'Une porte de service du poste a été retrouvée déverrouillée. L’ONR affirme qu’il s’agit d’une négligence de l’équipe de nuit.', cyber: 'Les automates du poste ont envoyé des ordres d’ouverture simultanés à 3 h 02, sans intervention humaine visible.', negligence: 'L’un des transformateurs présente des traces de surchauffe qui pourraient être antérieures à la nuit de l’incident.' }[t];
        return ['Constatations préliminaires au poste haute tension de Courcelles-Motte (Hainaut). Deux transformateurs sont hors service. Les enquêteurs n’ont pu accéder au site qu’à 9 h : l’ONR avait déjà commencé à déblayer, ce qui complique les constatations.', hint, 'Hypothèses ouvertes : panne technique, acte malveillant interne, intrusion informatique. Aucune n’est privilégiée à ce stade.'];
      }
      if (c.day === 2) {
        const out = ['Des connexions inhabituelles vers les automates du réseau ont été observées dans les dix jours précédant l’incident. Elles transitent par des serveurs relais situés en Europe de l’Est. Indice de confiance : moyen.'];
        out.push(t === 'cyber' ? 'Un échantillon de code inconnu a été isolé sur un automate de Courcelles-Motte. Analyse en cours avec nos partenaires européens.' : 'Ces connexions présentent des similitudes avec des balayages automatisés que nous observons régulièrement sur toutes les infrastructures du pays.');
        out.push('La Sûreté recommande de ne pas exclure la piste d’une puissance étrangère. Elle rappelle qu’elle ne dispose pas d’accès direct aux systèmes de l’ONR.');
        if (f.pj) out.push(t === 'interne' ? 'Note de la police judiciaire jointe : un badge d’accès a été utilisé à 2 h 58 la nuit de l’incident. Il appartiendrait à un employé licencié en novembre.' : 'Note de la police judiciaire jointe : les journaux d’accès physiques ne montrent aucune entrée suspecte.');
        return out;
      }
      const out = ['Trois pistes, trois sources qui ne se parlent pas.'];
      out.push(`Police judiciaire : ${t === 'interne' ? 'privilégie un sabotage par une personne connaissant le site.' : t === 'negligence' ? 'n’a trouvé aucune trace d’intrusion physique. Elle s’interroge sur l’entretien des installations.' : 'n’a trouvé aucune trace d’intrusion physique.'}`);
      out.push(`Sûreté de l’État : privilégie une intrusion informatique d’origine étrangère${t === 'cyber' ? ', et dispose désormais d’un échantillon du code utilisé' : ', sans élément nouveau depuis mardi'}.`);
      out.push('ONR : maintient la thèse d’une attaque extérieure et refuse de communiquer ses registres de maintenance sans décision judiciaire.');
      if (f.sgrs) out.push(`Renseignement militaire : affirme qu’il s’agit d’une attaque étrangère « sans aucun doute ». ${t === 'cyber' ? 'Ses éléments recoupent ceux de la Sûreté.' : 'Ses éléments reprennent pour l’essentiel ceux de la Sûreté.'}`);
      if (f.arrestation) out.push('Mise à jour : un suspect a été interpellé par la police judiciaire (voir dossier séparé).');
      if (f.verite) out.push('Mise à jour : la commission d’enquête a remis ses premières conclusions (voir dossier séparé).');
      return out;
    },
  },
  presse: {
    core: true, kind: 'presse', title: 'Revue de presse du matin',
    source: 'Service d’information du gouvernement',
    body(s, c) {
      const w = s.world, st = s.stats, f = s.flags;
      const fr = w.victimes >= 5 ? `« ${w.victimes} morts de froid : qui a choisi ? »` : st.population < 35 ? '« Un général dans le noir »' : '« Le pays retient son souffle »';
      const nl = f.priorite === 'equite' || f.solidarite ? '« Vlaanderen betaalt de rekening » (La Flandre paie l’addition)' : f.scission ? '« Eindelijk een eigen net » (Enfin notre propre réseau)' : '« Hoe lang nog? » (Combien de temps encore ?)';
      const pop = w.rempart > 40 ? '« Le Rempart, seul à tenir la rue »' : '« Pillages : la police débordée »';
      const out = [];
      if (st.libertes < 40) out.push('Note du service : plusieurs rédactions dénoncent des « pressions » et des appels du cabinet. De Ochtendpost a paru ce matin avec une une blanche.');
      out.push(`Le Courrier de Bruxelles : ${fr}`);
      out.push(`De Ochtendpost : ${nl}`);
      out.push(`La Sentinelle : ${pop}`);
      out.push(st.population < 40 ? 'Tonalité générale : défiance. Votre âge (22 ans) revient dans presque tous les éditoriaux.' : 'Tonalité générale : prudente. La presse attend des actes.');
      return out;
    },
  },
  parlement: {
    core: true, fromDay: 2, kind: 'note', title: 'Note politique : le vote de jeudi',
    source: 'Margaux Lenoir, cheffe de cabinet',
    body(s) {
      if (s.resigned.lenoir) return ['Note rédigée par l’intérim du cabinet. Décompte des voix non disponible.', 'Le vote de confiance est fixé à jeudi 18 h. Il faut 76 voix sur 150.'];
      const e = voteEstimate(s);
      const out = [`Vote de confiance jeudi à 18 h. Il faut 76 voix sur 150. Estimation à ce jour : ${e.pour} voix pour.`];
      out.push('Les partis de la majorité sortante vous soutiennent « par défaut », pas par conviction. Les régionalistes flamands (22 sièges) voteront contre, sauf geste sur l’autonomie énergétique.');
      out.push(`Le Rempart (14 sièges) ${s.adopted.includes('dialogue_rempart') || s.flags.pacte_rempart ? 'laisse entendre qu’il pourrait vous soutenir.' : 'votera contre « un gouvernement de la faiblesse ».'} Les écologistes (12 sièges) ${s.flags.verts ? 's’abstiendront, comme convenu.' : 'hésitent.'}`);
      out.push('Mon conseil : chaque décision de cette semaine sera relue jeudi, à voix haute, dans l’hémicycle.');
      return out;
    },
  },

  // ================= Dossiers ponctuels =================
  accueil: {
    kind: 'note', title: 'Mot d’accueil', source: 'Margaux Lenoir, cheffe de cabinet',
    body: () => [
      'Mon Général, il y a six jours le gouvernement est tombé. Le Roi vous a nommé à la tête d’un gouvernement d’urgence en attendant une majorité. Vous avez 22 ans. Beaucoup pensent que c’est une erreur. À vous de leur donner tort, ou raison.',
      'Cette nuit à 3 h 02, le réseau électrique s’est effondré. 1,9 million de foyers sans courant, surtout en Wallonie et à Bruxelles. Il fait −9 °C.',
      'Jeudi à 18 h, le Parlement votera la confiance. D’ici là, vous ne quitterez pas ce bureau.',
      'Vos outils : le téléphone (vos ministres, et ceux qui vous appellent), les dossiers (lisez-les, ils ne disent pas tous la même chose), l’ordinateur (les grandes orientations), la carte (l’état du pays). L’agenda clôt la journée.',
    ],
  },
  cr_appel: {
    kind: 'cr', title: (s, c) => `Compte rendu d’appel : ${CONTACTS[c.contact].name}`,
    source: 'Secrétariat du cabinet', body: (s, c) => [c.text],
  },
  cr_ordre: {
    kind: 'cr', title: (s, c) => `Compte rendu : ${ORDERS.find((o) => o.id === c.order).label}`,
    source: (s, c) => `${CONTACTS[c.contact].role}`,
    stamp: (s, c) => ({ succes: 'Exécuté', partiel: 'Exécuté en partie', echec: 'Échec' }[c.outcome]),
    body: (s, c) => c.text.split(/(?=Fait :|Échec :|Incertain :)/).map((x) => x.trim()),
  },
  allocution: {
    kind: 'note', title: 'Allocution de 19 h : trois versions', source: 'Margaux Lenoir, cheffe de cabinet',
    body: () => ['Trois discours, trois pays. Choisissez celui que vous voulez être ce soir.', 'Unité : « Il n’y a ce soir ni Flamands ni Wallons, seulement des Belges qui ont froid. »', 'Fermeté : « Ceux qui profitent du noir pour piller trouveront l’État en face d’eux. »', 'Transparence : « Je vais vous dire ce que nous savons, et surtout ce que nous ne savons pas. »'],
    actions: [
      { label: 'Version « Unité »', hours: 1, logText: 'allocution sur l’unité du pays', fx: (s, E) => E.stat('cohesion', 5).stat('population', 3).world('separatisme', -2) },
      { label: 'Version « Fermeté »', hours: 1, logText: 'allocution de fermeté', fx: (s, E) => E.stat('stabilite', 3).stat('population', 2).world('unrest', -4).stat('libertes', -1).world('rempart', -2) },
      { label: 'Version « Transparence »', hours: 1, logText: 'allocution de transparence', fx: (s, E) => E.stat('population', s.flags.verite ? 7 : 4).stat('institutions', 2).flag('transparence') },
    ],
  },
  decompte: {
    kind: 'note', title: 'Décompte des voix', source: 'Margaux Lenoir, cheffe de cabinet',
    body(s) {
      const e = voteEstimate(s);
      return [`Pour : environ ${e.pour}. Contre : environ ${150 - e.pour - 4}. Abstentions : 4. Majorité requise : 76.`, e.pour >= 80 ? 'C’est jouable. Ne faites rien d’irréparable d’ici jeudi.' : e.pour >= 72 ? 'Ça se jouera à quelques voix. Chaque appel compte.' : 'En l’état, vous tombez jeudi. Il faut un geste fort, ou un accord.'];
    },
  },
  sgrs: {
    kind: 'renseignement', title: 'Note du renseignement militaire (SGRS)', source: 'Service général du renseignement et de la sécurité', stamp: () => 'Secret',
    body(s, c) {
      const strong = s.truth === 'cyber' && c.outcome !== 'echec';
      return [
        'Le SGRS attribue l’incident du 13 janvier à une opération offensive étrangère visant les automates du réseau haute tension.',
        strong ? 'Éléments : un code malveillant baptisé BRABO, des serveurs de commande connus, des horaires d’activité compatibles avec un fuseau situé à l’est.' : 'Éléments : connexions vers des serveurs relais, similitudes avec des opérations passées. Le SGRS n’a pas eu accès aux automates eux-mêmes.',
        'Le SGRS recommande le placement de l’ensemble des infrastructures critiques sous protection militaire et un renforcement des moyens de cyberdéfense.',
      ];
    },
  },
  communique: {
    kind: 'note', title: 'Projet de communiqué : l’origine de la panne', source: 'Margaux Lenoir, cheffe de cabinet', urgent: true,
    body: () => ['La presse exige une réponse avant ce soir : qui est responsable ? Je vous propose quatre lignes. Une seule partira.', 'Relisez les dossiers d’enquête avant de choisir. Ce que vous direz aujourd’hui sera comparé, tôt ou tard, à ce que l’on saura.'],
    actions: [
      { label: 'Attribuer la panne à une cyberattaque étrangère', hours: 1, logText: 'vous attribuez la panne à une cyberattaque étrangère', avail: (s) => !s.flags.attribution, fx: (s, E) => E.flag('attribution', 'cyber').stat('cohesion', 3).stat('population', 2).world('rempart', 3) },
      { label: 'Pointer un sabotage intérieur', hours: 1, logText: 'vous désignez un sabotage intérieur', avail: (s) => !s.flags.attribution, fx: (s, E) => E.flag('attribution', 'interne').world('unrest', 2).stat('population', 2) },
      { label: 'Reconnaître des défaillances de l’ONR', hours: 1, logText: 'vous mettez en cause l’ONR', avail: (s) => !s.flags.attribution, fx: (s, E) => E.flag('attribution', 'negligence').stat('economie', -2).stat('population', 3).stat('institutions', -1) },
      { label: 'Ne rien attribuer avant la fin de l’enquête', hours: 1, logText: 'vous refusez d’attribuer la panne', avail: (s) => !s.flags.attribution, fx: (s, E) => E.flag('attribution', 'attente').stat('population', -2).stat('institutions', 2) },
    ],
  },
  message_royal: {
    kind: 'palais', title: 'Message de Sa Majesté le Roi', source: 'Palais royal', stamp: () => 'Diffusé à 20 h',
    body: () => ['« Mes chers compatriotes, Beste landgenoten, Liebe Mitbürger. Depuis lundi, une partie de notre pays vit dans le froid et dans le noir. »', '« Je pense d’abord à celles et ceux qui ont perdu un proche. Je pense aussi à ceux qui, la nuit, frappent chez un voisin âgé pour s’assurer qu’il va bien. C’est cela, notre pays. »', '« J’ai confiance dans nos institutions et dans le gouvernement pour nous rendre la lumière. »'],
  },
  refus_palais: {
    kind: 'palais', title: 'Lettre du chef de cabinet du Roi', source: 'Palais royal', stamp: () => 'Personnel',
    body: () => ['Mon Général, Sa Majesté a pris connaissance de votre demande de message à la Nation.', 'Le Roi ne s’exprimera pas tant que des milices privées seront reconnues comme auxiliaires de l’État et que des accusations seront portées sans preuve contre des étrangers.', 'Sa Majesté demeure, bien entendu, garante de la Constitution.'],
  },
  exception: {
    kind: 'note', title: 'Arrêté portant proclamation de l’état d’exception', source: 'Moniteur belge, édition spéciale', stamp: () => 'Publié',
    body: () => ['Article 1er. Les séances de la Chambre des représentants sont suspendues jusqu’au rétablissement de l’ordre public.', 'Article 2. Les brigades de vigilance sont placées sous l’autorité directe du chef du gouvernement.', 'Article 3. Toute publication de nature à troubler l’ordre public peut être interdite par simple décision administrative.', 'Le Palais n’a pas contresigné l’arrêté dans les délais habituels. Votre service juridique « étudie la question ».'],
  },
  conseil_etat: {
    kind: 'analyse', title: 'Avis du Conseil d’État sur les pouvoirs spéciaux', source: 'Conseil d’État, section de législation',
    body: (s) => ['Le Conseil d’État rappelle que les pouvoirs spéciaux doivent être limités dans le temps et dans leur objet, et confirmés par une loi.', s.world.couronne >= 40 ? 'L’avis est réservé mais ne s’oppose pas au texte. Le soutien affiché du Palais a pesé.' : 'L’avis est sévère : le texte « confie au gouvernement un blanc-seing incompatible avec l’article 105 de la Constitution ». La presse s’en est emparée.'],
  },
  recentralisation: {
    kind: 'rapport', title: 'Refédéralisation du réseau : premiers effets', source: 'ONR et cabinet',
    body: (s, c) => c.ok
      ? ['L’ONR a repris la main sur les gestionnaires régionaux de distribution. Les remises sous tension sont mieux coordonnées : +6 points dans chaque Région ce matin.', 'Les gouvernements flamand et wallon ont introduit chacun un recours devant la Cour constitutionnelle.']
      : ['Les gestionnaires régionaux traînent des pieds : directives contradictoires, données non transmises. Gain quasi nul ce matin.', 'Les gouvernements flamand et wallon ont introduit chacun un recours devant la Cour constitutionnelle.'],
  },
  agressions: {
    kind: 'rapport', title: 'Agressions après vos déclarations', source: 'Police fédérale, cellule de veille', urgent: true,
    body: () => ['Cette nuit, onze agressions visant des personnes « perçues comme étrangères » ont été signalées à Anvers, Charleroi et Bruxelles. Deux blessés graves.', 'Un camion de livraison immatriculé à l’étranger a été incendié près de Liège. Le chauffeur, polonais, est sain et sauf.', 'Trois ambassades ont demandé des explications. Une entreprise allemande a suspendu un investissement à Anvers.'],
  },
  bavure: {
    kind: 'rapport', title: 'Brigades de vigilance : rapport de nuit', source: 'Zone de police de Seraing–Neupré', urgent: (s, c) => c.grave,
    body: (s, c) => c.grave
      ? ['À 1 h 20, une brigade du Rempart a interpellé un homme de 19 ans soupçonné de pillage. Il a été frappé à terre et hospitalisé avec une fracture du crâne.', 'Il habitait l’immeuble. Il était sorti chercher du bois de chauffage.', 'La vidéo, filmée depuis un balcon, a été vue 2 millions de fois.']
      : ['Nuit calme à Seraing. Les brigades ont signalé trois tentatives de pillage, interrompues sans violence.', 'La police locale note toutefois des « contrôles d’identité » pratiqués par les brigades, sans aucune base légale.'],
  },
  arrestation: {
    kind: 'rapport', title: 'Interpellation d’un suspect', source: 'Police judiciaire fédérale',
    body: () => ['Un ancien technicien de l’ONR, licencié en novembre, a été interpellé à 6 h à Fleurus. Son badge n’avait jamais été désactivé.', 'Les enquêteurs ont saisi du matériel et des écrits hostiles « au système ». Rien, à ce stade, n’indique de complicité étrangère.', 'L’ONR n’a fait aucun commentaire.'],
  },
  fuite_ecoutes: {
    kind: 'presse', title: '« Écoutes sans mandat : le gouvernement espionne »', source: 'De Ochtendpost, édition du matin', urgent: true,
    body: () => ['Le quotidien publie la copie d’une demande d’écoutes adressée à un opérateur télécom, sans mandat de juge. Parmi les numéros visés : deux syndicalistes et un journaliste.', 'L’Ordre des barreaux parle d’un « scandale démocratique ». La commission de la Justice de la Chambre demande votre audition.'],
  },
  tir_seraing: {
    kind: 'rapport', title: 'Incident armé à Seraing', source: 'Défense, état-major', urgent: true,
    body: () => ['À 23 h 40, une patrouille militaire prise à partie par une trentaine de personnes a effectué un tir de sommation. Un jeune homme a été blessé à la jambe par un ricochet.', 'Le parquet de Liège a ouvert une enquête. Le bourgmestre exige le retrait immédiat des militaires de sa commune.'],
  },
  commission: {
    kind: 'analyse', title: 'Commission d’enquête : premières conclusions', source: 'Commission d’enquête indépendante',
    body(s) {
      const t = {
        negligence: ['La commission établit que la révision du transformateur T2 de Courcelles-Motte a été reportée trois fois depuis 2021, pour raisons budgétaires.', 'Elle n’a trouvé aucune trace d’intrusion. Les « connexions suspectes » relevées par la Sûreté sont des balayages courants.', 'L’ONR conteste et parle de « conclusions prématurées ».'],
        cyber: ['La commission confirme la présence d’un code malveillant dans les automates de trois postes haute tension.', 'Ce code, baptisé BRABO, a été installé en décembre. L’ONR n’avait pas appliqué une mise à jour de sécurité publiée en octobre.', 'L’attribution à un État relève des services de renseignement et de la diplomatie, précise la commission.'],
        interne: ['La commission établit qu’un ancien employé a accédé au poste de Courcelles-Motte avec un badge non désactivé, à 2 h 58.', 'Elle souligne les défaillances de l’ONR dans la gestion des accès, mais n’a trouvé aucune trace d’intrusion informatique.', 'Les connexions relevées par la Sûreté sont des balayages courants, sans lien avec l’incident.'],
      };
      return t[s.truth];
    },
  },
  sabotage2: {
    kind: 'rapport', title: 'Nouvel incident sur le réseau', source: 'Opérateur national du réseau (ONR)', urgent: true,
    body: (s, c) => [c.region === 'flandre' ? 'À 4 h 15, le poste de Zandvliet-Est (port d’Anvers) a déclenché. 300 000 foyers flamands ont de nouveau perdu le courant.' : 'À 4 h 15, le poste de Lixhe-Sud (Liège) a déclenché. 250 000 foyers wallons ont de nouveau perdu le courant.', 'Le scénario ressemble à celui de lundi. L’ONR demande la protection militaire de tous ses sites.', 'Ce matin, tout le pays se pose la même question : pourquoi n’a-t-on rien vu venir ?'],
  },
  demission_verhaegen: {
    kind: 'courrier', title: 'Lettre de démission', source: 'Annelies Verhaegen', stamp: () => 'Personnel',
    body: () => ['Mon Général, je vous remets ma démission de mes fonctions de ministre de l’Intérieur, avec effet immédiat.', 'J’ai servi ce gouvernement par devoir. Je ne peux plus en couvrir les décisions sans trahir le serment que j’ai prêté.', 'Je vous souhaite, sincèrement, de vous tromper moins souvent que je ne le crains.'],
  },
  depart_lenoir: {
    kind: 'courrier', title: 'Un mot sur votre bureau', source: 'Margaux Lenoir', stamp: () => 'Manuscrit',
    body: () => ['Je pars. Pas par colère : par lucidité.', 'Vous n’avez plus besoin de quelqu’un qui vous dise non. Vous avez besoin de quelqu’un qui vous dise oui, et ce ne sera pas moi.', 'Le code du coffre est dans le tiroir de gauche. M.'],
  },
  depart_dufrasne: {
    kind: 'courrier', title: 'Demande de mise en disponibilité', source: 'Lt-gén. Raoul Dufrasne',
    body: () => ['Mon Général, je demande à être relevé de mes fonctions de chef de la Défense.', 'L’armée exécute les ordres. Elle ne peut pas exécuter des ordres que son chef ne comprend plus.', 'J’en ai informé le Palais.'],
  },
  ordre_du_jour: {
    kind: 'note', title: 'Ordre du jour de la Chambre', source: 'Chambre des représentants', stamp: () => 'Séance plénière',
    body: (s) => (s.flags.exception ? ['Séance plénière de 18 h : suspendue par arrêté.', 'Les questeurs ont fait savoir qu’ils ne remettraient pas les clés de l’hémicycle.'] : ['18 h 00 : déclaration du chef du gouvernement.', '18 h 30 : débat.', '18 h 50 : vote sur la motion de confiance. Majorité requise : 76 voix.']),
  },

  // ================= Événements aléatoires =================
  hopital_urgence: {
    kind: 'rapport', title: 'Urgence au Grand Hôpital de Charleroi', source: 'Centre de crise national', urgent: true,
    body: () => ['Le groupe électrogène principal du site de Gilly est tombé en panne à 10 h 40. Batterie de secours : 4 heures. 38 patients sous assistance respiratoire.', 'Deux options : faire venir des générateurs militaires, ou transférer les patients vers Namur et Bruxelles, avec les risques du transport.'],
    actions: [
      { label: 'Générateurs militaires (armée)', hours: 1, logText: 'générateurs militaires envoyés à Charleroi', fx: (s, E) => { if (s.resigned.dufrasne) { E.world('victimes', 2).stat('population', -3).log('Sans chef de la Défense, les générateurs sont arrivés trop tard.'); } else { E.stat('population', 3).stat('institutions', 1).trust('dufrasne', 2); } } },
      { label: 'Transférer les 38 patients', hours: 1, logText: 'transfert des patients de Gilly', fx: (s, E) => { const r = E.roll(); if (r < 0.35) E.world('victimes', 1).stat('population', -2); else E.stat('population', 1); } },
    ],
  },
  pillages: {
    kind: 'rapport', title: 'Pillages à Seraing et Marchienne', source: 'Police fédérale', urgent: (s) => s.world.unrest > 60,
    body: () => ['Cette nuit, une vingtaine de commerces pillés à Seraing et à Marchienne-au-Pont. Dans les deux cas, les quartiers sont sans courant depuis lundi.', 'Les habitants interrogés parlent moins de vol que d’abandon : « Ici, il n’y a plus personne. »'],
    actions: [
      { label: 'Envoyer des renforts de police', hours: 1, logText: 'renforts de police à Seraing', fx: (s, E) => E.world('unrest', -5).stat('libertes', -1) },
      { label: 'Envoyer des distributions de repas chauds', hours: 1, logText: 'distribution de repas à Seraing', fx: (s, E) => E.world('unrest', -3).stat('population', 2).stat('economie', -1) },
    ],
  },
  aide_nl: {
    kind: 'courrier', title: 'Offre d’aide des Pays-Bas', source: 'Ambassade du Royaume des Pays-Bas',
    body: () => ['Le gouvernement néerlandais propose 60 générateurs mobiles de forte puissance et 40 techniciens, livrables dans les 24 heures.', 'En retour, La Haye souhaite « une coopération renforcée » sur la sécurité du port d’Anvers.'],
    actions: [
      { label: 'Accepter avec gratitude', hours: 1, logText: 'aide néerlandaise acceptée', fx: (s, E) => E.power('wallonie', 5).power('bruxelles', 3).stat('population', 2).world('rempart', 2) },
      { label: 'Décliner poliment', hours: 1, logText: 'aide néerlandaise déclinée', fx: (s, E) => E.stat('cohesion', -1).world('rempart', -1) },
    ],
  },
  greve: {
    kind: 'courrier', title: 'Préavis de grève dans les chemins de fer', source: 'Front commun syndical',
    body: () => ['Les syndicats des chemins de fer déposent un préavis de grève pour lundi prochain : sécurité des agents dans les gares sans éclairage et primes de crise.', 'Ils se disent « ouverts au dialogue, mais pas éternellement ».'],
    actions: [
      { label: 'Ouvrir une négociation (5 capital)', hours: 1, capital: 5, logText: 'négociation avec les syndicats', fx: (s, E) => E.stat('economie', 1).stat('stabilite', 1) },
      { label: 'Laisser la direction gérer', hours: 1, logText: 'grève laissée à la direction', fx: (s, E) => E.stat('economie', -3) },
    ],
  },
  lettre_infirmiere: {
    kind: 'courrier', title: 'Lettre d’une infirmière de Charleroi', source: 'Courrier des citoyens', stamp: () => 'Manuscrit',
    body: () => ['Monsieur le Général, je travaille aux soins intensifs depuis vingt-deux ans, aussi longtemps que vous êtes en vie.', 'Cette nuit, nous avons ventilé un patient à la main pendant quarante minutes, à la lampe frontale. Il a survécu. Nous ne sommes pas sûrs de pouvoir le refaire demain.', 'Je ne vous demande pas de miracle. Je vous demande de savoir que nous existons. Claire D.'],
  },
  rumeur: {
    kind: 'presse', title: 'Rumeur virale : « la Wallonie coupée exprès »', source: 'Service d’information, veille des réseaux sociaux',
    body: () => ['Une vidéo affirme que l’ONR a « sacrifié la Wallonie pour sauver le port d’Anvers ». 1,4 million de vues en une nuit. Elle mélange des images réelles et un faux document.', 'En Flandre, une autre rumeur circule : « les Wallons volent notre courant ». Les deux se nourrissent l’une de l’autre.'],
    actions: [
      { label: 'Démentir publiquement, chiffres à l’appui', hours: 1, logText: 'démenti public de la rumeur', fx: (s, E) => E.stat('cohesion', 3).stat('population', 1) },
      { label: 'Ignorer', hours: 0, logText: 'rumeur ignorée', fx: (s, E) => E.stat('cohesion', -4).world('separatisme', 2) },
    ],
  },
  manif_rempart: {
    kind: 'courrier', title: 'Demande d’autorisation : marche du Rempart', source: 'Ville de Bruxelles, cabinet du bourgmestre',
    body: () => ['Le Rempart demande à défiler samedi de la gare du Nord jusqu’à la rue de la Loi, « aux flambeaux, en hommage aux victimes du froid ». 8 000 participants annoncés.', 'Le bourgmestre ne veut pas décider seul. Il attend votre avis.'],
    actions: [
      { label: 'Autoriser', hours: 1, logText: 'marche du Rempart autorisée', fx: (s, E) => E.world('rempart', 8).world('unrest', 3).stat('libertes', 1) },
      { label: 'Interdire', hours: 1, logText: 'marche du Rempart interdite', fx: (s, E) => E.world('rempart', 4).stat('libertes', -3).world('unrest', 2) },
      { label: 'Autoriser sans flambeaux, parcours réduit', hours: 1, logText: 'marche du Rempart encadrée', fx: (s, E) => E.world('rempart', 3).world('unrest', 1) },
    ],
  },
  notation: {
    kind: 'analyse', title: 'Note de l’agence de notation', source: 'Trésorerie, cellule des marchés',
    body: () => ['Une grande agence de notation place la dette belge « sous surveillance négative ». Motifs : coût de la crise énergétique et « incertitude politique sur la cohésion de l’État ».', 'Effet immédiat : +0,3 point sur le taux à dix ans.'],
  },
  meteo: {
    kind: 'rapport', title: 'Alerte météo : nouvelle vague de froid', source: 'Institut royal météorologique',
    body: () => ['Températures attendues cette nuit : −14 °C en Ardenne, −11 °C à Charleroi et Liège.', 'Le Centre de crise rappelle que chaque degré en moins augmente fortement le risque pour les personnes isolées.'],
  },
  revendication: {
    kind: 'renseignement', title: 'Revendication en ligne', source: 'Sûreté de l’État, veille numérique', stamp: () => 'Confidentiel',
    body: (s) => ['Un message publié sur un forum anonyme revendique l’attaque au nom de « BRABO », avec une capture d’écran d’une console d’automate.', s.truth === 'cyber' ? 'Analyse : la capture semble authentique ; les identifiants techniques correspondent au poste de Courcelles-Motte.' : 'Analyse : la capture provient d’une documentation publique d’un fabricant. Revendication probablement opportuniste.', 'La Sûreté déconseille de commenter publiquement à ce stade.'],
  },
};
