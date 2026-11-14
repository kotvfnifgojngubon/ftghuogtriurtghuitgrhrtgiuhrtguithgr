// Événements scénarisés, événements aléatoires et appels entrants (graphes de dialogue).

// ---------- Événements scénarisés ----------
export const SCRIPTED = [
  { id: 'accueil', day: 1, hour: 8, dossier: 'accueil' },
  { id: 'appel_intro', day: 1, hour: 8, call: 'verhaegen_j1' },
  { id: 'gerard', day: 1, hour: 12, call: 'gerard' },
  { id: 'vdb', day: 2, hour: 10, call: 'vandenbroeck' },
  { id: 'lejeune', day: 2, hour: 12, call: 'lejeune' },
  { id: 'palais2', day: 2, hour: 14, call: 'palais', cond: (s) => s.adopted.includes('conseil_couronne') },
  { id: 'delorge', day: 2, hour: 15, call: 'delorge', cond: (s) => s.world.rempart >= 26 || s.adopted.includes('dialogue_rempart') },
  { id: 'communique', day: 3, hour: 8, dossier: 'communique' },
  { id: 'palais3', day: 3, hour: 9, call: 'palais', cond: (s) => !s.flags.palais_appel },
  { id: 'claes', day: 3, hour: 13, call: 'claes' },
  { id: 'odj', day: 4, hour: 8, dossier: 'ordre_du_jour' },
  { id: 'lenoir4', day: 4, hour: 9, call: 'lenoir_j4', cond: (s) => !s.resigned.lenoir },
];

// ---------- Événements aléatoires (deux par jour, un le dernier jour) ----------
export const RANDOM = [
  { id: 'r_hopital', days: [1, 2], weight: 3, precond: (s) => s.world.power.wallonie < 60, dossier: 'hopital_urgence', fire: (s, E) => E.marker({ id: 'gilly', type: 'hopital', lon: 4.49, lat: 50.43, dx: 10, dy: -12 }) },
  { id: 'r_pillage', days: [1, 2, 3], weight: 2, cond: (s) => s.world.unrest > 40, dossier: 'pillages', fire: (s, E) => { E.world('unrest', 3); E.marker({ id: 'pillage', type: 'emeute', lon: 5.4994, lat: 50.5833, city: 'seraing', dx: 0, dy: 0 }); } },
  { id: 'r_aide_nl', days: [1, 2], weight: 2, dossier: 'aide_nl' },
  { id: 'r_greve', days: [2, 3], weight: 1, cond: (s) => s.stats.economie < 50, dossier: 'greve' },
  { id: 'r_lettre', days: [1, 2, 3], weight: 2, dossier: 'lettre_infirmiere' },
  { id: 'r_rumeur', days: [2, 3], weight: 2, cond: (s) => s.stats.cohesion < 46, dossier: 'rumeur' },
  { id: 'r_manif', days: [2, 3], weight: 2, cond: (s) => s.world.rempart >= 24, dossier: 'manif_rempart' },
  { id: 'r_notation', days: [2, 3, 4], weight: 1, cond: (s) => s.stats.economie < 45, dossier: 'notation', fire: (s, E) => E.stat('economie', -2) },
  { id: 'r_froid', days: [1, 2, 3], weight: 2, dossier: 'meteo', fire: (s, E) => E.flag('froid') },
  { id: 'r_revendication', days: [2, 3], weight: 2, dossier: 'revendication' },
];

// ---------- Appels entrants ----------
export const CALLS = {
  verhaegen_j1: {
    contact: 'verhaegen', start: 'a', hours: 0.5,
    onDecline: (s, E) => { E.flag('priorite', 'onr').log('Sans consigne de votre part, l’ONR applique son plan technique.'); },
    nodes: {
      a: { text: 'Mon Général, Verhaegen, Intérieur. Pardon de commencer si tôt. Vous avez lu les chiffres : 1,9 million de foyers sans courant, surtout en Wallonie et à Bruxelles. Il fait −9.', next: 'b' },
      b: {
        text: 'L’ONR peut tout remettre sous tension, mais pas tout en même temps. Il me faut une consigne de priorité dans l’heure. C’est votre décision, pas la mienne.',
        choices: [
          { label: 'Les hôpitaux et les quartiers wallons d’abord', hint: 'Moins de victimes probables. Réseau rétabli plus lentement, coût économique.', say: 'Les hôpitaux et les quartiers résidentiels wallons d’abord. Les gens avant les machines.', fx: (s, E) => { E.flag('priorite', 'hopitaux').stat('economie', -3).stat('cohesion', 2).trust('verhaegen', 3).power('wallonie', 4); }, log: 'Consigne de priorité : hôpitaux et quartiers wallons d’abord.', to: 'c' },
          { label: 'Suivre l’ONR : stabiliser le réseau depuis Anvers', hint: 'Réseau plus solide et plus vite rétabli au total. La Wallonie attendra plus longtemps.', say: 'Suivez le plan technique de l’ONR. Un réseau stable d’abord, sinon tout retombera.', fx: (s, E) => { E.flag('priorite', 'onr').stat('economie', 3).stat('cohesion', -3).trust('verhaegen', -2).power('flandre', 6); }, log: 'Consigne de priorité : plan technique de l’ONR.', to: 'c' },
          { label: 'Délestage tournant : chacun sa part, Flandre comprise', hint: 'Plus juste entre Régions. Complexe, et la Flandre perdra du courant qu’elle avait.', say: 'Délestage tournant dans tout le pays. Chacun prend sa part, Flandre comprise.', fx: (s, E) => { E.flag('priorite', 'equite').stat('cohesion', 5).stat('stabilite', -2).power('flandre', -12).power('wallonie', 8).trust('verhaegen', 2); }, log: 'Consigne de priorité : délestage tournant national.', to: 'c' },
        ],
      },
      c: {
        text: (s) => ({ hopitaux: 'Bien. Le port d’Anvers va hurler, mais je préfère ça. Je transmets.', onr: 'Compris. Techniquement, c’est défendable. Politiquement, préparez-vous à un appel de Namur.', equite: 'Courageux. Je transmets. Le ministre-président flamand va découvrir ce que « solidarité » veut dire ; il ne va pas aimer.' }[s.flags.priorite]),
        next: 'd',
      },
      d: { text: 'Les premiers rapports arrivent sur votre bureau. Et, mon Général : ce soir, la presse voudra savoir qui a décidé quoi.', end: true },
    },
  },

  gerard: {
    contact: 'gerard', start: 'a', hours: 0.5,
    onDecline: (s, E) => E.stat('cohesion', -3).world('separatisme', 2),
    nodes: {
      a: {
        text: (s) => ({
          onr: 'Isabelle Gérard. Vous avez choisi le port d’Anvers contre les hôpitaux de Charleroi. Je voulais l’entendre de votre bouche avant de le dire à la télévision.',
          hopitaux: 'Isabelle Gérard. Je voulais vous remercier : vous avez mis les Wallons en premier. On ne l’oubliera pas. Mais nos communes sont à sec.',
          equite: 'Isabelle Gérard. Partager les coupures avec la Flandre, c’est courageux. Ça ne tiendra pas : Van den Broeck est déjà sur tous les plateaux.',
        }[s.flags.priorite] || 'Isabelle Gérard. La Wallonie attend des réponses.'),
        choices: [
          { cond: (s) => s.flags.priorite === 'onr', label: 'Vous avez raison. Je corrige la priorité.', hint: 'Bascule vers les hôpitaux wallons. La Flandre le verra comme un recul.', say: 'Vous avez raison. Je corrige : priorité aux hôpitaux wallons.', fx: (s, E) => E.flag('priorite', 'hopitaux').stat('cohesion', 4).stat('economie', -2).stat('stabilite', -1).flag('vdb_fache'), log: 'Vous corrigez la priorité en faveur de la Wallonie.', to: 'merci' },
          { cond: (s) => s.flags.priorite === 'onr', label: 'Sans réseau stable, pas d’hôpitaux. Je maintiens.', hint: 'Cohérent techniquement. La Wallonie le prendra mal.', say: 'Sans réseau stable, il n’y a pas d’hôpitaux. Je maintiens.', fx: (s, E) => E.stat('cohesion', -4).stat('population', -2).world('separatisme', 3).flag('gerard_fachee'), log: 'Vous maintenez la priorité technique face à la Wallonie.', to: 'fache' },
          { cond: (s) => s.flags.priorite === 'hopitaux', label: 'Le fédéral avancera l’argent.', hint: 'Coût budgétaire, gain de cohésion.', say: 'Le fédéral avancera l’argent. On réglera les comptes après.', fx: (s, E) => E.stat('economie', -3).stat('cohesion', 3).flag('fonds'), log: 'Vous promettez une avance fédérale aux communes wallonnes.', to: 'merci' },
          { cond: (s) => s.flags.priorite === 'hopitaux', label: 'Nous verrons après la crise.', say: 'Nous verrons après la crise. Une chose à la fois.', fx: (s, E) => E.stat('cohesion', -1), to: 'neutre' },
          { cond: (s) => s.flags.priorite === 'equite', label: 'Je tiendrai, quoi qu’il dise.', hint: 'Vous vous engagez sur la solidarité. La Flandre fera pression.', say: 'Je tiendrai, quoi qu’il dise.', fx: (s, E) => E.flag('tenir_equite').stat('cohesion', 2).stat('stabilite', -1), to: 'merci' },
          { cond: (s) => s.flags.priorite === 'equite', label: 'Je reverrai la copie si nécessaire.', say: 'Je reverrai la copie si c’est nécessaire.', fx: (s, E) => E.trust('lenoir', 1), to: 'neutre' },
          { cond: (s) => !s.adopted.includes('cellule_interfederale'), label: 'Je vous propose une place à la table de crise.', hint: 'Geste d’ouverture. Engage la suite.', say: 'Je vous propose une place permanente à la table de crise.', fx: (s, E) => E.stat('cohesion', 2).flag('gerard_table'), to: 'table' },
        ],
      },
      merci: { text: 'Bien. Je le dirai ce soir. Vous venez de vous faire une alliée, pour l’instant.', end: true },
      fache: { text: 'Alors je dirai ce soir que le fédéral a choisi. Les Wallons sauront qui remercier.', end: true },
      neutre: { text: 'Je prends note. Je n’ai pas le luxe d’attendre « après ».', end: true },
      table: { text: 'Une table, c’est bien. Ce qui compte, c’est ce qu’on y décide. J’y serai.', end: true },
    },
  },

  vandenbroeck: {
    contact: 'vandenbroeck', start: 'a', hours: 0.5,
    onDecline: (s, E) => E.world('separatisme', 3),
    nodes: {
      a: {
        text: (s) => (s.flags.priorite === 'equite' || s.adopted.includes('solidarite') || s.flags.vdb_fache
          ? 'Pieter Van den Broeck. Des familles flamandes ont passé la nuit sans chauffage pour compenser des années de sous-investissement wallon. Je ne peux pas l’expliquer à mes électeurs.'
          : 'Pieter Van den Broeck. Notre réseau est presque rétabli. Nous pourrions gérer la suite nous-mêmes, plus vite, si le fédéral nous laissait faire.'),
        choices: [
          { cond: (s) => s.flags.priorite === 'equite' || s.adopted.includes('solidarite') || s.flags.vdb_fache, label: 'La solidarité est la règle. Elle reste.', hint: 'Cohésion préservée. La Flandre se crispe.', say: 'La solidarité est la règle de ce pays. Elle reste.', fx: (s, E) => E.stat('cohesion', 3).stat('stabilite', -3).world('separatisme', 3), log: 'Vous maintenez la solidarité face à la Flandre.', to: 'froid' },
          { cond: (s) => s.flags.priorite === 'equite' || s.adopted.includes('solidarite') || s.flags.vdb_fache, label: 'J’allège la part de la Flandre.', hint: 'Apaise la Flandre. La Wallonie y perd.', say: 'J’allège la part de la Flandre dans les coupures.', fx: (s, E) => E.power('flandre', 6).power('wallonie', -4).stat('cohesion', -4).stat('stabilite', 2), log: 'Vous allégez les coupures en Flandre.', to: 'content' },
          { cond: (s) => !(s.flags.priorite === 'equite' || s.adopted.includes('solidarite') || s.flags.vdb_fache), label: 'C’est une crise nationale. Le fédéral garde la main.', hint: 'Unité de commandement. La Flandre s’agace.', say: 'C’est une crise nationale. Le fédéral garde la main.', fx: (s, E) => E.world('separatisme', -2).stat('stabilite', -2).stat('cohesion', 1), to: 'froid' },
          { cond: (s) => !(s.flags.priorite === 'equite' || s.adopted.includes('solidarite') || s.flags.vdb_fache), label: 'Faites. Je vous couvre.', hint: 'Plus rapide en Flandre. Les écarts entre Régions se creusent.', say: 'Faites. Je vous couvre.', fx: (s, E) => E.power('flandre', 5).stat('cohesion', -5).world('separatisme', 6).flag('vdb_autonomie'), log: 'Vous laissez la Flandre gérer seule son réseau.', to: 'content' },
          { label: 'J’y réfléchis.', say: 'J’y réfléchis. Rappelez-moi demain.', fx: (s, E) => E.world('separatisme', 2), to: 'attente' },
        ],
      },
      froid: { text: 'Alors nous ferons savoir que la Flandre n’a pas été entendue. Bonne journée, Général.', end: true },
      content: { text: 'Voilà enfin une décision raisonnable. Mes collègues s’en souviendront jeudi.', fx: (s, E) => E.flag('vdb_soutien'), end: true },
      attente: { text: 'Ne réfléchissez pas trop longtemps. La patience flamande a des limites, et je les connais.', end: true },
    },
  },

  lejeune: {
    contact: 'lejeune', start: 'a', hours: 0.5,
    nodes: {
      a: {
        text: 'Marc Lejeune, ONR. Mon Général, l’attaque de lundi était d’une sophistication rare. Pour protéger le réseau, il me faut 120 millions et des soldats devant chaque poste.',
        choices: [
          { label: 'Vous aurez l’argent.', hint: 'Réparations accélérées. Coût budgétaire.', say: 'Vous aurez l’argent.', fx: (s, E) => E.stat('economie', -3).power('wallonie', 3).power('bruxelles', 3).flag('onr_finance'), log: 'Vous accordez 120 millions à l’ONR.', to: 'merci' },
          { label: 'Pas avant les conclusions de l’enquête.', say: 'Pas avant les conclusions de l’enquête.', fx: (s, E) => E.stat('economie', 1), to: 'insiste' },
          { label: 'Votre maintenance est-elle en cause ?', hint: 'Une question directe. Écoutez la réponse.', say: 'Soyons francs. Votre maintenance est-elle en cause ?', to: 'question' },
        ],
      },
      merci: { text: 'Merci. Vous ne le regretterez pas. Et, mon Général : moins on parlera de l’ONR dans la presse, plus vite on travaillera.', end: true },
      insiste: { text: 'L’enquête prendra des mois. Le prochain incident, lui, n’attendra pas.', end: true },
      question: {
        text: (s) => (s.truth === 'negligence' ? '(Un silence de plusieurs secondes.) Je… je ne vois pas de quoi vous parlez. Nos installations sont aux normes. Qui vous a dit ça ?' : 'Absolument pas. Nos registres sont à jour et je les tiens à la disposition de la justice. Cherchez du côté des automates.'),
        choices: [
          { label: 'Je veux vos registres de maintenance sur mon bureau.', say: 'Je veux vos registres de maintenance sur mon bureau demain.', fx: (s, E) => E.world('enquete', 10).flag('registres'), log: 'Vous exigez les registres de maintenance de l’ONR.', to: 'registres' },
          { label: 'Bien. Merci.', say: 'Bien. Merci, monsieur Lejeune.', to: 'fin' },
        ],
      },
      registres: { text: (s) => (s.truth === 'negligence' ? 'Je… je vais voir ce qui est possible. Il faut l’accord de notre conseil d’administration.' : 'Ils seront chez vous ce soir.'), end: true },
      fin: { text: 'À votre service.', end: true },
    },
  },

  palais: {
    contact: 'palais', start: 'a', hours: 0.5,
    nodes: {
      a: {
        fx: (s, E) => E.flag('palais_appel'),
        text: (s) => {
          if (['boucs_emissaires', 'brigades', 'etat_exception'].some((x) => s.adopted.includes(x))) return 'Baron Desmet, cabinet du Roi. Mon Général, je serai bref : Sa Majesté est préoccupée. Elle ne signera aucun arrêté qui reconnaît des milices privées.';
          if (s.adopted.includes('conseil_couronne')) return 'Baron Desmet, cabinet du Roi. Sa Majesté vous sait gré d’avoir réuni le Conseil. Si vous le demandez, Elle est disposée à s’adresser à la Nation.';
          return 'Baron Desmet, cabinet du Roi. Sa Majesté s’inquiète de la fracture entre les Régions. Elle propose de recevoir demain les deux ministres-présidents.';
        },
        choices: [
          { cond: (s) => ['boucs_emissaires', 'brigades', 'etat_exception'].some((x) => s.adopted.includes(x)), label: 'Je comprends. Assurez Sa Majesté de mon respect.', say: 'Je comprends. Assurez Sa Majesté de mon profond respect.', fx: (s, E) => E.world('couronne', -3).flag('roi_avertit'), to: 'fin' },
          { cond: (s) => ['boucs_emissaires', 'brigades', 'etat_exception'].some((x) => s.adopted.includes(x)), label: 'Le Roi n’a pas à juger mes décisions.', hint: 'Conflit ouvert avec le Palais.', say: 'Le Roi règne. Il ne gouverne pas. Il n’a pas à juger mes décisions.', fx: (s, E) => E.world('couronne', -10).stat('institutions', -4).stat('stabilite', -3).flag('conflit_palais'), log: 'Vous entrez en conflit ouvert avec le Palais.', to: 'glacial' },
          { cond: (s) => !['boucs_emissaires', 'brigades', 'etat_exception'].some((x) => s.adopted.includes(x)) && s.adopted.includes('conseil_couronne'), label: 'Remerciez Sa Majesté.', say: 'Remerciez Sa Majesté. Je reviendrai vers vous.', fx: (s, E) => E.world('couronne', 3), to: 'fin' },
          { cond: (s) => !['boucs_emissaires', 'brigades', 'etat_exception'].some((x) => s.adopted.includes(x)) && !s.adopted.includes('conseil_couronne'), label: 'C’est une excellente idée.', hint: 'Le Palais joue les médiateurs.', say: 'C’est une excellente idée. Le pays a besoin de voir ces deux-là ensemble.', fx: (s, E) => E.stat('cohesion', 3).world('couronne', 4), log: 'Le Roi recevra les deux ministres-présidents.', to: 'fin' },
          { label: 'Je préfère que le Palais reste discret.', hint: 'Le Roi au-dessus de la mêlée.', say: 'Je préfère que le Palais reste au-dessus de la mêlée, pour l’instant.', fx: (s, E) => E.world('couronne', -4).stat('institutions', 1), to: 'fin' },
        ],
      },
      fin: { text: 'Je transmets. Bonne journée, mon Général.', end: true },
      glacial: { text: '(Un silence.) Je transmettrai vos paroles exactes, mon Général. Exactes.', end: true },
    },
  },

  claes: {
    contact: 'claes', start: 'a', hours: 0.5,
    onDecline: (s, E) => E.stat('population', -1),
    nodes: {
      a: {
        text: (s) => {
          if (s.flags.ecoutes && !s.flags.ecoutes_revelees) return 'Sofie Claes, De Ochtendpost. Une source me parle d’écoutes téléphoniques sans mandat, ordonnées depuis votre cabinet. Vous confirmez ?';
          if (s.truth === 'negligence') return 'Sofie Claes, De Ochtendpost. J’ai un mémo interne de l’ONR : la révision d’un transformateur de Courcelles a été reportée trois fois. Vous confirmez ?';
          if (s.truth === 'cyber') return 'Sofie Claes, De Ochtendpost. Un groupe revendique l’attaque sous le nom de BRABO. Le gouvernement confirme-t-il une cyberattaque ?';
          return 'Sofie Claes, De Ochtendpost. La police judiciaire aurait identifié un ancien employé de l’ONR. Vous confirmez ?';
        },
        choices: [
          { cond: (s) => s.flags.ecoutes && !s.flags.ecoutes_revelees, label: 'Démentir catégoriquement.', hint: 'Si c’est prouvé un jour, le mensonge pèsera plus lourd que les écoutes.', say: 'C’est faux. Catégoriquement.', fx: (s, E) => E.flag('dementi'), log: 'Vous démentez les écoutes auprès de la presse.', to: 'note' },
          { cond: (s) => s.flags.ecoutes && !s.flags.ecoutes_revelees, label: 'Reconnaître et assumer.', hint: 'Le scandale éclate, mais à vos conditions.', say: 'C’est exact. Je l’ai décidé, en période d’urgence. J’en répondrai devant le Parlement.', fx: (s, E) => E.flag('ecoutes_revelees').stat('population', -3).stat('institutions', -2).stat('libertes', 2).trust('verhaegen', 4), log: 'Vous reconnaissez publiquement les écoutes.', to: 'note' },
          { cond: (s) => !(s.flags.ecoutes && !s.flags.ecoutes_revelees), label: 'Je ne commente pas une enquête en cours.', say: 'Je ne commente pas une enquête en cours.', to: 'note' },
          { cond: (s) => !(s.flags.ecoutes && !s.flags.ecoutes_revelees), label: 'Si c’est vrai, les responsables rendront des comptes.', hint: 'Engagement public de transparence.', say: 'Si c’est vrai, les responsables rendront des comptes. Tous.', fx: (s, E) => E.stat('population', 3).flag('engagement_verite'), log: 'Vous promettez publiquement des comptes.', to: 'note' },
          { cond: (s) => !(s.flags.ecoutes && !s.flags.ecoutes_revelees), label: 'C’est une rumeur. N’écrivez pas ça.', hint: 'Pression sur la presse.', say: 'C’est une rumeur. Je vous déconseille de l’écrire.', fx: (s, E) => E.stat('libertes', -2).flag('pression_presse'), log: 'Vous faites pression sur une journaliste.', to: 'pression' },
        ],
      },
      note: { text: 'C’est noté. Ce sera dans l’édition de demain, avec votre réponse mot pour mot.', end: true },
      pression: { text: 'Je note aussi ça, mon Général. Mot pour mot.', end: true },
    },
  },

  lenoir_j4: {
    contact: 'lenoir', start: 'a', hours: 0.5,
    nodes: {
      a: {
        text: (s) => {
          const e = s.flags.exception ? null : (s.stats.stabilite * 0.42 + s.stats.institutions * 0.2 + s.stats.population * 0.18);
          return e === null ? 'Il n’y aura pas de vote. Vous le savez. Je voulais juste entendre votre voix avant de décider ce que je fais de la mienne.' : 'Dernier décompte avant le vote. Voulez-vous la vérité ou la version qui fait du bien ?';
        },
        choices: [
          { cond: (s) => !s.flags.exception, label: 'La vérité.', say: 'La vérité, Margaux.', to: 'verite' },
          { cond: (s) => !s.flags.exception, label: 'La version qui fait du bien.', say: 'Celle qui fait du bien. J’ai une longue journée.', to: 'douce' },
          { cond: (s) => s.flags.exception, label: 'Restez. J’ai besoin de vous.', say: 'Restez. J’ai besoin de vous.', fx: (s, E) => E.trust('lenoir', 5), to: 'reste' },
        ],
      },
      verite: {
        text: (s) => {
          const g = s.stats.stabilite * 0.42 + s.stats.institutions * 0.2 + s.stats.population * 0.18 + s.stats.cohesion * 0.12 + s.stats.economie * 0.08;
          return g > 44 ? 'Ça passe probablement. De peu. Ne faites rien d’irréparable avant 18 heures.' : g > 38 ? 'C’est à quelques voix. Un geste ce matin pourrait tout changer, dans un sens ou dans l’autre.' : 'En l’état, vous tombez ce soir. Il faudrait un accord, ou un miracle. Je cherche les deux.';
        },
        end: true,
      },
      douce: { text: 'Vous avez été formidable cette semaine. (Un temps.) Je vous rappelle à 17 heures.', end: true },
      reste: { text: '(Un long silence.) Je reste aujourd’hui. Demain, on verra.', end: true },
    },
  },

  delorge: {
    contact: 'delorge', start: 'a', hours: 0.5,
    nodes: {
      a: {
        text: (s) => (s.adopted.includes('dialogue_rempart') ? 'Maxime Delorge. Merci de m’avoir reçu, mon Général. Mes gars tiennent Seraing mieux que vos policiers. Allons plus loin.' : 'Maxime Delorge, du Rempart. Vous ne m’avez pas appelé, alors je vous appelle. Mes gars tiennent Seraing mieux que vos policiers.'),
        next: 'offre',
      },
      offre: {
        text: 'Reconnaissez nos brigades. En échange : le calme dans la rue, et nos 14 députés jeudi soir. Vous en aurez besoin.',
        choices: [
          { label: 'Marché conclu.', hint: 'Des voix pour jeudi, du capital politique, un calme relatif. Une dette envers le Rempart, et une rupture avec une partie de votre camp.', say: 'Marché conclu.', fx: (s, E) => E.flag('pacte_rempart').capital(12).world('rempart', 8).world('unrest', -4).stat('libertes', -3).stat('institutions', -5).trust('lenoir', -8).trust('verhaegen', -8), log: 'Vous concluez un pacte avec le Rempart.', to: 'pacte' },
          { label: 'Nous en reparlerons.', say: 'Nous en reparlerons.', fx: (s, E) => E.world('rempart', 3), to: 'attente' },
          { label: 'Je ne négocie pas avec une milice.', hint: 'Clair. Le Rempart s’en servira pour se poser en victime.', say: 'Je ne négocie pas avec une milice. Ne me rappelez pas.', fx: (s, E) => E.world('rempart', 2).stat('institutions', 2).trust('verhaegen', 4), log: 'Vous refusez tout accord avec le Rempart.', to: 'refus' },
        ],
      },
      pacte: { text: 'Vous ne le regretterez pas. Enfin… vous verrez bien.', end: true },
      attente: { text: 'Le temps joue pour moi, mon Général. Pas pour vous.', end: true },
      refus: { text: 'Très bien. Samedi, nous serons 20 000 rue de la Loi. Sous vos fenêtres.', end: true },
    },
  },
};

for (const [id, c] of Object.entries(CALLS)) c.id = id;
