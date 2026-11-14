// Arbre des orientations politiques (l'ordinateur du bureau). Quatre voies, aucune n'est « la bonne ».
// col / row : position dans la grille d'affichage. icon : nom d'un pictogramme dessiné par l'interface.
export const TREE = {
  branches: [
    { id: 'couronne', title: 'La Couronne', subtitle: 'Renforcer le pouvoir royal, centraliser l’État', color: '#c9a45c', cols: [0, 2] },
    { id: 'rempart', title: 'Le Rempart', subtitle: 'Laisser monter un mouvement d’ordre et transformer le régime', color: '#b3202c', cols: [3, 5] },
    { id: 'regions', title: 'Les Régions', subtitle: 'Diviser le pouvoir, pousser vers la séparation', color: '#4f8f8a', cols: [6, 8] },
    { id: 'compromis', title: 'Le Compromis', subtitle: 'Préserver la démocratie, réparer le lien entre communautés', color: '#d8d0bc', cols: [9, 11] },
  ],
  nodes: {
    // ---------------- La Couronne ----------------
    conseil_couronne: {
      branch: 'couronne', col: 1, row: 0, icon: 'crown', cost: 20, hours: 2,
      title: 'Réunir le Conseil de la Couronne',
      desc: 'Convoquer au Palais les anciens Premiers ministres et les chefs militaires, sous l’autorité morale du Roi.',
      known: 'Rassure l’armée et les institutions. Les partis nationalistes flamands y verront une manœuvre unitariste.',
      effect(s, E) {
        E.stat('institutions', 4).stat('stabilite', 3).stat('cohesion', -2).world('couronne', 15).trust('dufrasne', 8).trust('lenoir', -2);
        E.flag('conseil');
      },
    },
    pouvoirs_speciaux: {
      branch: 'couronne', col: 0, row: 1, icon: 'seal', cost: 25, hours: 2, requires: ['conseil_couronne'], excludes: ['elections'],
      title: 'Demander des pouvoirs spéciaux',
      desc: 'Faire voter une loi qui permet de gouverner par arrêtés pendant trois mois.',
      known: 'Vous gagnerez du temps chaque jour. Le Parlement se sentira dessaisi ; les libertés reculent d’un cran.',
      effect(s, E) {
        E.flag('heuresBonus', 2).stat('libertes', -6).stat('stabilite', 3).world('couronne', 6);
        E.schedule(1, 'pouvoirs_reaction');
      },
    },
    recentraliser: {
      branch: 'couronne', col: 2, row: 1, icon: 'pylon', cost: 25, hours: 2, requires: ['conseil_couronne'], excludes: ['scinder_reseau'],
      title: 'Refédéraliser la gestion du réseau',
      desc: 'Retirer aux Régions leurs compétences sur la distribution d’électricité, le temps de la crise.',
      known: 'Réparations mieux coordonnées. Les deux gouvernements régionaux crieront au coup de force.',
      effect(s, E) {
        E.flag('recentralise').stat('economie', 3).stat('cohesion', -6).world('separatisme', 6).stat('institutions', 2);
        E.schedule(1, 'recentralisation');
      },
    },
    message_royal: {
      branch: 'couronne', col: 1, row: 2, icon: 'speech', cost: 20, hours: 1, requires: ['conseil_couronne'], minDay: 2,
      title: 'Demander un message du Roi à la Nation',
      desc: 'Le Roi s’adresse au pays, dans les trois langues.',
      known: 'Le Palais n’accepte que s’il juge votre action conforme à la Constitution.',
      effect(s, E) {
        const tainted = ['boucs_emissaires', 'brigades', 'etat_exception'].some((x) => s.adopted.includes(x));
        if (tainted) {
          E.flag('roi_refuse').world('couronne', -10).stat('stabilite', -5).stat('institutions', -3);
          E.dossier('refus_palais', {});
        } else {
          E.flag('message_royal').stat('population', 8).stat('cohesion', 6).world('couronne', 10).stat('stabilite', 3);
          E.dossier('message_royal', {});
        }
      },
    },
    regence: {
      branch: 'couronne', col: 1, row: 3, icon: 'crown', future: true, requires: [['pouvoirs_speciaux', 'message_royal']],
      title: 'Gouvernement de la Couronne', desc: 'Un exécutif resserré autour du Palais.', known: 'Après la crise.',
    },

    // ---------------- Le Rempart ----------------
    dialogue_rempart: {
      branch: 'rempart', col: 4, row: 0, icon: 'shield', cost: 10, hours: 1,
      title: 'Ouvrir un canal avec Le Rempart',
      desc: 'Recevoir discrètement Maxime Delorge, dont le mouvement promet de « tenir la rue ».',
      known: 'Le calme revient dans certains quartiers, et le Rempart met ses relais à votre service (capital politique chaque nuit). Votre ministre de l’Intérieur et une partie de la presse ne vous le pardonneront pas.',
      effect(s, E) {
        E.world('rempart', 10).world('unrest', -5).stat('institutions', -4).trust('verhaegen', -8).trust('lenoir', -4);
        E.flag('rempart_canal');
      },
    },
    boucs_emissaires: {
      branch: 'rempart', col: 3, row: 1, icon: 'finger', cost: 15, hours: 1, requires: ['dialogue_rempart'], excludes: ['commission_enquete'],
      title: 'Désigner l’ennemi',
      desc: 'Accuser publiquement « des saboteurs étrangers et leurs complices » avant la fin de l’enquête.',
      known: 'Un pays effrayé aime qu’on lui désigne un coupable. Les coupables désignés, eux, ne sont pas toujours les bons.',
      effect(s, E) {
        E.stat('population', 6).stat('cohesion', -5).stat('libertes', -5).world('rempart', 12);
        E.flag('attribution', 'cyber').flag('accusation');
        E.schedule(1, 'agressions');
      },
    },
    brigades: {
      branch: 'rempart', col: 5, row: 1, icon: 'band', cost: 20, hours: 2, requires: ['dialogue_rempart'],
      title: 'Légaliser les « brigades de vigilance »',
      desc: 'Reconnaître les patrouilles citoyennes du Rempart comme auxiliaires de sécurité.',
      known: 'Moins de pillages, tout de suite. Des milices, ensuite. L’Intérieur pourrait ne pas suivre.',
      effect(s, E) {
        E.world('unrest', -10).stat('libertes', -10).stat('institutions', -8).world('rempart', 15).trust('verhaegen', -15);
        E.flag('brigades');
        E.marker({ id: 'brig-ser', type: 'brigade', lon: 5.4994, lat: 50.5833, city: 'seraing', dx: 22, dy: 16 });
        E.marker({ id: 'brig-cha', type: 'brigade', lon: 4.4446, lat: 50.4108, dx: 22, dy: 16 });
        E.schedule(1, 'bavure');
      },
    },
    etat_exception: {
      branch: 'rempart', col: 4, row: 2, icon: 'gate', cost: 30, hours: 2, requires: [['boucs_emissaires', 'brigades']], excludes: ['elections'], minDay: 3,
      title: 'Proclamer l’état d’exception',
      desc: 'Suspendre le Parlement « jusqu’au retour de l’ordre » et gouverner par décret.',
      known: 'Le vote de confiance n’aura pas lieu. Les libertés s’effondrent. Rien ne garantit qu’on puisse revenir en arrière.',
      effect(s, E) {
        E.flag('exception').stat('libertes', -20).stat('stabilite', 10).stat('institutions', -14).stat('economie', -5).stat('population', -4).world('rempart', 10).trust('lenoir', -15).trust('verhaegen', -30);
        E.dossier('exception', {});
      },
    },
    regime: {
      branch: 'rempart', col: 4, row: 3, icon: 'shield', future: true, requires: ['etat_exception'],
      title: 'Le régime du Rempart', desc: 'Un nouvel ordre constitutionnel.', known: 'Après la crise.',
    },

    // ---------------- Les Régions ----------------
    regions_crise: {
      branch: 'regions', col: 7, row: 0, icon: 'split', cost: 15, hours: 1,
      title: 'Confier la crise aux Régions',
      desc: 'Laisser la Flandre, la Wallonie et Bruxelles gérer chacune la crise avec leurs propres moyens.',
      known: 'Le fédéral partage les reproches. Mais les Régions n’ont pas les mêmes moyens : les écarts vont se creuser.',
      effect(s, E) {
        E.flag('regions').stat('stabilite', 3).stat('cohesion', -4).world('separatisme', 8).trust('lenoir', -2);
      },
    },
    scinder_reseau: {
      branch: 'regions', col: 7, row: 1, icon: 'pylon', cost: 25, hours: 2, requires: ['regions_crise'], excludes: ['recentraliser'],
      title: 'Préparer la scission du réseau électrique',
      desc: 'Deux gestionnaires régionaux, deux réseaux, une frontière électrique sur la frontière linguistique.',
      known: 'Les partis flamands applaudiront. La Wallonie, plus dépendante des interconnexions, y perdra.',
      effect(s, E) {
        E.flag('scission').world('separatisme', 15).stat('cohesion', -10).stat('economie', -5).stat('stabilite', 3).world('unrest', 5);
      },
    },
    conference_confederale: {
      branch: 'regions', col: 7, row: 2, icon: 'table', cost: 30, hours: 2, requires: ['scinder_reseau'], minDay: 3,
      title: 'Convoquer une conférence confédérale',
      desc: 'Ouvrir officiellement la négociation d’une Belgique à deux (ou trois) États.',
      known: 'Les partis régionalistes vous soutiendront jeudi. Le pays entre dans une négociation sans retour garanti.',
      effect(s, E) {
        E.flag('confederal').world('separatisme', 20).stat('stabilite', 5).stat('cohesion', -8).stat('institutions', -5);
      },
    },
    referendum: {
      branch: 'regions', col: 7, row: 3, icon: 'ballot', future: true, requires: ['conference_confederale'],
      title: 'Référendums d’autodétermination', desc: 'Chaque Région décide.', known: 'Après la crise.',
    },

    // ---------------- Le Compromis ----------------
    cellule_interfederale: {
      branch: 'compromis', col: 10, row: 0, icon: 'circle', cost: 15, hours: 3,
      title: 'Cellule de crise interfédérale',
      desc: 'Réunir chaque jour les trois Régions, les Communautés et le fédéral autour d’une seule table.',
      known: 'Plus lent, plus juste. Les Régions se sentiront écoutées.',
      effect(s, E) {
        E.flag('interfederal').stat('cohesion', 8).stat('institutions', 4).stat('stabilite', 1).trust('verhaegen', 8);
      },
    },
    commission_enquete: {
      branch: 'compromis', col: 9, row: 1, icon: 'lens', cost: 20, hours: 1, requires: ['cellule_interfederale'], excludes: ['boucs_emissaires'],
      title: 'Commission d’enquête indépendante',
      desc: 'Magistrats, ingénieurs et un expert étranger, avec accès à tout, y compris à l’ONR.',
      known: 'La vérité sortira. Vous ne savez pas laquelle, ni pour qui elle sera embarrassante.',
      effect(s, E) {
        E.flag('commission').stat('libertes', 4).stat('population', 3).stat('institutions', 3);
        E.schedule(1, 'commission_conclusions');
      },
    },
    solidarite: {
      branch: 'compromis', col: 11, row: 1, icon: 'hands', cost: 20, hours: 1, requires: ['cellule_interfederale'],
      title: 'Pacte de solidarité énergétique',
      desc: 'Partager équitablement les coupures et le courant disponible entre toutes les Régions.',
      known: 'La Flandre acceptera des coupures pour la Wallonie. Certains le lui reprocheront.',
      effect(s, E) {
        E.flag('solidarite').stat('cohesion', 10).stat('economie', -4).stat('stabilite', -2).power('flandre', -6).power('wallonie', 8);
      },
    },
    elections: {
      branch: 'compromis', col: 10, row: 2, icon: 'ballot', cost: 30, hours: 1, requires: ['cellule_interfederale', ['commission_enquete', 'solidarite']], minDay: 3,
      title: 'Rendre la parole aux électeurs',
      desc: 'Annoncer des élections anticipées dans quarante jours, une fois le courant rétabli.',
      known: 'Vous redevenez un gouvernement de transition. Le pays reprend la main, quelle que soit sa réponse.',
      effect(s, E) {
        E.flag('elections').stat('institutions', 10).stat('population', 6).stat('libertes', 5).stat('stabilite', -4).world('separatisme', -4);
      },
    },
    reforme: {
      branch: 'compromis', col: 10, row: 3, icon: 'scroll', future: true, requires: ['elections'],
      title: 'Réforme de l’État négociée', desc: 'Une nouvelle répartition des pouvoirs, votée.', known: 'Après la crise.',
    },
  },
};
for (const [id, n] of Object.entries(TREE.nodes)) n.id = id;
