import type { Dictionary } from '../dictionary';

/**
 * The French dictionary. Typed as `Dictionary` (= `typeof en`) rather than inferred, so a
 * key added to English and forgotten here fails the build instead of printing an English
 * line on a French invoice.
 *
 * Money vocabulary is the one a French-speaking accountant in Algiers expects on paper:
 * "facture de commission", "relevé des ventes", "remises", "base de commission",
 * "panier moyen". "Restaurant" stays "Restaurant" rather than switch-ops' "Magasin":
 * these documents are addressed to restaurants, and that is what they call themselves.
 */
export const fr: Dictionary = {
  app: {
    name: 'Switch',
    suite: 'Finance',
    title: 'Switch Finance',
    description: 'Tableau de bord financier interne de la plateforme Switch.',
  },

  common: {
    loading: 'Chargement',
    retry: 'Réessayer',
    tryAgain: 'Réessayer',
    cancel: 'Annuler',
    clear: 'Effacer',
    clearFilters: 'Effacer les filtres',
    preparing: 'Préparation…',
    showing: '{start}–{end} affichés',
    showingOf: '{start}–{end} sur {total}',
    delivery: 'Livraison',
    pickup: 'À emporter',
  },

  language: {
    label: 'Langue',
  },

  theme: {
    label: 'Thème',
    light: 'Clair',
    dark: 'Sombre',
    system: 'Système',
  },

  nav: {
    menu: 'Menu',
    dashboard: 'Tableau de bord',
    restaurants: 'Restaurants',
    access: 'Accès',
    logOut: 'Se déconnecter',
    signedIn: 'Connecté',
    finance: 'Finance',
  },

  auth: {
    subtitle: 'Connectez-vous avec votre compte Switch.',
    username: "Nom d'utilisateur",
    usernamePlaceholder: 'votre.identifiant',
    password: 'Mot de passe',
    signIn: 'Se connecter',
    signingIn: 'Connexion…',
    footer: "Outil interne — l'accès est accordé par l'équipe plateforme de Switch.",
  },

  gate: {
    deniedTitle: "Vous n'avez pas accès à Switch Finance",
    deniedBody:
      "Ce compte peut se connecter à Switch, mais la finance est réservée. Un administrateur peut vous donner l'accès depuis la page Accès.",
    checkFailed: 'Impossible de vérifier votre accès',
    signOut: 'Se déconnecter',
    signingOut: 'Déconnexion…',
    adminsOnlyTitle: 'Réservé aux administrateurs',
    adminsOnlyBody:
      "La gestion des accès à Switch Finance est réservée aux comptes administrateur.",
  },

  errors: {
    network: 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.',
    invalidLogin: "Nom d'utilisateur ou mot de passe incorrect.",
    notFound: "Vous n'avez pas l'autorisation de voir ceci, ou cela n'existe plus.",
    loginDenied: "Ce compte n'a pas accès à Switch Finance.",
    grantAdminsOnly: 'Seuls les administrateurs peuvent modifier les accès.',
    forbidden: "Vous n'avez pas l'autorisation de faire cela.",
    grantNotDeployed:
      "La modification des accès n'est pas encore activée sur le serveur — demandez à l'équipe plateforme de déployer `setFinanceAccess`.",
    rejected: 'Le serveur a refusé cette requête.',
    sessionExpired: 'Votre session a expiré. Veuillez vous reconnecter.',
    generic: "Une erreur s'est produite. Veuillez réessayer.",
  },

  roles: {
    admin: 'Admin',
    member: 'A accès',
    none: "Pas d'accès",
  },

  pagination: {
    label: 'Pagination',
    previous: 'Précédent',
    next: 'Suivant',
    previousPage: 'Page précédente',
    nextPage: 'Page suivante',
    page: 'Page {page}',
  },

  range: {
    label: 'Période',
    from: 'Du',
    to: 'Au',
    presets: {
      today: "Aujourd'hui",
      week: 'Cette semaine',
      month: 'Ce mois-ci',
      year: 'Cette année',
      custom: 'Personnalisée',
    },
  },

  dashboard: {
    eyebrow: "Vue d'ensemble",
    title: 'Tableau de bord',
    description: 'Bienvenue sur le tableau de bord financier de Switch.',
    restaurantsCount: 'Restaurants sur la plateforme',
    browse: 'Parcourir',
    comingSoon: 'Bientôt disponible',
    reportsTitle: 'Rapports plateforme',
    reportsBody:
      "La commission de tous les restaurants à la fois. Les commandes, tableurs et factures par restaurant sont déjà disponibles sur la page de chaque restaurant.",
    paymentsTitle: 'Paiements',
    paymentsBody: 'Suivre les factures de commission réglées.',
  },

  restaurants: {
    eyebrow: 'Annuaire',
    title: 'Restaurants',
    description: 'Tous les restaurants de la plateforme Switch, du plus récent au plus ancien.',
    tableLabel: 'Restaurants',
    loadError: 'Impossible de charger les restaurants',
    columns: {
      name: 'Restaurant',
      phone: 'Téléphone',
      rating: 'Note',
      orders: 'Commandes',
      status: 'Statut',
      created: 'Créé le',
      open: 'Ouvrir',
    },
    openRow: 'Ouvrir {name}',
    morePhones: '+{count} autres',
    unrated: 'Non noté',
    emptyTitle: 'Aucun restaurant trouvé',
    emptyBody: 'Aucun restaurant ne correspond à ces filtres.',
    status: {
      live: 'En ligne',
      paused: 'En pause',
      unapproved: 'Non approuvé',
      all: 'Tous les statuts',
    },
    flags: {
      isFeatured: 'À la une',
      isDiscount: 'Remise',
      isPromo: 'Promo',
    },
    filters: {
      searchLabel: 'Rechercher un restaurant par nom',
      searchPlaceholder: 'Rechercher par nom',
      status: 'Statut',
      city: 'Ville',
      allCities: 'Toutes les villes',
    },
  },

  restaurant: {
    loadError: 'Impossible de charger ce restaurant',
    notFoundTitle: 'Restaurant introuvable',
    notFoundBody: 'Il a peut-être été supprimé, ou le lien est incorrect.',
    back: 'Retour aux restaurants',
    openInMaps: 'Ouvrir dans Maps',
    reviews_one: '({count} avis)',
    reviews_other: '({count} avis)',
    provenance: 'Créé le {created} · Mis à jour le {updated}',
  },

  report: {
    scopeLabel: 'Commandes affichées',
    scopes: {
      billable: 'Facturables',
      all: 'Toutes les commandes',
    },
    excel: 'Excel',
    invoice: 'Facture',
    totalError: 'Impossible de calculer les totaux de cette période',
    truncatedTitle: 'Cette période est trop longue pour un total exact',
    truncatedBody:
      "Seules les {count} premières commandes ont été lues : les chiffres ci-dessous sont un minimum, pas un total. Réduisez la période pour obtenir un chiffre exact.",
    ordersTitle: 'Commandes',
    tiles: {
      orders: 'Commandes facturables',
      gross: 'Ventes brutes',
      grossAfterDiscount: 'après {amount} de remises',
      grossHint: 'total des articles, remises déduites',
      commission: 'Commission',
      commissionHint: '{rate} des ventes brutes, due à Switch',
      average: 'Panier moyen',
      averageHint: 'ventes brutes par commande facturable',
    },
  },

  orders: {
    count_one: '{count} commande',
    count_other: '{count} commandes',
    tableLabel: 'Commandes',
    loadError: 'Impossible de charger les commandes',
    columns: {
      id: 'Commande',
      placed: 'Passée le',
      customer: 'Client',
      type: 'Type',
      status: 'Statut',
      items: 'Articles',
      discount: 'Remise',
      total: 'Total',
    },
    emptyTitle: 'Aucune commande sur cette période',
    emptyBillable:
      'Aucune commande facturable sur ces dates. Passez à « Toutes les commandes » pour inclure les commandes annulées et en cours.',
    emptyAll: "Aucune commande n'a été passée sur ces dates.",
    status: {
      placed: 'Passée',
      confirmed: 'Confirmée',
      onTheWay: 'En route',
      delivered: 'Livrée',
      readyForPickup: 'Prête à retirer',
      pickedUp: 'Retirée',
      canceled: 'Annulée',
      unknown: 'Inconnu',
    },
  },

  categories: {
    uncategorised: 'Sans catégorie',
    unnamedMenu: 'Menu n° {id}',
  },

  exportDialog: {
    title: 'Exporter les commandes',
    billable_one: '{count} commande facturable',
    billable_other: '{count} commandes facturables',
    categories: 'Catégories',
    columns: 'Colonnes',
    selectAll: 'Tout sélectionner',
    clearAll: 'Tout désélectionner',
    categoriesError: 'Impossible de charger les catégories du menu de ce restaurant.',
    uncategorisedHint: 'Plats supprimés, ou plats hors menu',
    wholeRestaurant: "Aucune sélection : tout le restaurant est exporté.",
    narrowed:
      "Seuls les plats de ces catégories sont exportés. Une commande qui contient aussi d'autres plats compte pour leur part de son prix, et sa remise et ses frais sont répartis de la même façon.",
    needsColumn: 'Un tableur doit comporter au moins une colonne.',
    export: 'Exporter',
  },

  sheet: {
    name: 'Commandes',
    subtitle: 'Commandes · {period}',
    subtitleCategories: 'Commandes · {categories} · {period}',
    truncated:
      "ATTENTION : cette période dépasse la limite d'export — les lignes ci-dessous n'en sont que le début, pas la période entière.",
    categoryNote:
      "Les commandes contenant aussi des plats d'autres catégories sont comptées pour la part de leur prix que représentent ces plats ; les remises et les frais sont répartis de la même façon.",
    totals: 'Totaux',
    commissionOwed: 'Commission due à Switch',
    commissionOwedValue: 'Commission due à Switch : {amount}',
    noColumns: 'Choisissez au moins une colonne à exporter.',
    fields: {
      date: 'Date',
      time: 'Heure',
      id: 'Commande',
      type: 'Type',
      customer: 'Client',
      status: 'Statut',
      products: 'Produits',
      productsHint: 'Les plats commandés, ex. « Kefta ×2, Coca »',
      items: 'Prix',
      discount: 'Remise',
      net: 'Ventes nettes',
      commission: 'Commission',
      commissionHint:
        'Calculée sur le total de la commande au taux de commission du restaurant — non enregistrée sur la commande.',
      delivery: 'Frais de livraison',
      service: 'Frais de service',
      payment: 'Paiement',
    },
    payment: {
      card: 'Carte',
      cash: 'Espèces',
    },
    file: {
      restaurant: 'restaurant',
      categories: 'categories',
      orders: 'commandes',
      to: 'au',
    },
  },

  invoice: {
    modeLabel: 'Type de document',
    modes: {
      commission: 'Facture de commission',
      statement: 'Relevé des ventes',
    },
    categoriesLabel: 'Catégories',
    wholeRestaurant: 'Tout le restaurant',
    print: 'Imprimer / Enregistrer en PDF',
    incomplete: 'Ce lien de facture est incomplet.',
    buildError: 'Impossible de générer cette facture',
    preparing: 'Préparation de la facture…',
    gone: "Ce restaurant n'existe plus.",
    unsoldTitle: "Certaines catégories de ce lien n'ont rien vendu sur cette période",
    unsoldBody: 'Elles restent mentionnées sur le document, mais sans aucune commande.',
    truncatedTitle: 'Cette période est trop longue pour une facture exacte',
    truncatedBody:
      "Seules les {count} premières commandes ont été lues. Réduisez la période avant d'envoyer ce document.",
    tagline: 'Plateforme de livraison de repas',
    number: 'N° {number}',
    period: 'Période :',
    issued: "Date d'émission :",
    billedTo: 'Facturé à',
    statementFor: 'Relevé pour',
    category_one: 'Catégorie :',
    category_other: 'Catégories :',
    summary: {
      orders: 'Commandes facturables',
      items: 'Total des articles',
      discounts: 'Remises',
      base: 'Base de commission',
      rate: 'Taux de commission',
      average: 'Panier moyen',
      commissionDue: 'Commission due à Switch',
      grossSales: 'Ventes brutes de la période',
    },
    statementCommission: 'Commission due à Switch sur cette période au taux de {rate} :',
    fees:
      'Payés par les clients en plus des repas et exclus de la commission : livraison {delivery}, service {service}.',
    linesTitle: 'Commandes de la période',
    lines: {
      order: 'Commande',
      date: 'Date',
      type: 'Type',
      items: 'Articles',
      discount: 'Remise',
      net: 'Net',
    },
    footnote: {
      billable:
        "Les chiffres portent sur les commandes non annulées ayant atteint au moins l'étape « en route / prête », conformément à ce que le restaurant voit dans sa propre application Switch.",
      settlement:
        "Les commandes sont réglées au restaurant au moment où elles sont passées : le seul solde indiqué ici est donc la commission due à Switch. Elle est calculée au taux actuel du restaurant, {rate}, appliqué au total des articles après remises. Les commandes n'enregistrent pas le taux en vigueur au moment où elles ont été passées : une modification ultérieure du taux changera les chiffres d'une réimpression de cette période.",
      scope:
        "Ce document ne porte que sur les plats de : {categories}, selon la section de menu où se trouve chaque plat aujourd'hui. Une commande contenant aussi d'autres plats est comptée pour la part de son total d'articles que représentent ces plats ; sa remise et ses frais sont répartis de la même façon et arrondis à l'unité.",
    },
    documentTitle: '{document} — {restaurant} — {period}',
  },

  access: {
    eyebrow: 'Administration',
    title: 'Accès',
    description:
      "Les comptes du personnel qui peuvent recevoir l'accès à Switch Finance. Les administrateurs l'ont toujours.",
    tableLabel: 'Comptes du personnel',
    loadError: 'Impossible de charger les comptes du personnel',
    columns: {
      account: 'Compte',
      email: 'E-mail',
      role: 'Rôle',
      access: 'Accès',
    },
    always: 'Toujours',
    alwaysReason: " — les administrateurs ont l'accès par leur rôle",
    toggleLabel: 'Accès finance pour {name}',
    granted: 'Accordé',
    notGranted: 'Non accordé',
    ownAccount: 'Votre propre compte',
    emptyTitle: 'Aucun compte du personnel trouvé',
    emptyBody: 'Seuls les comptes dont le {appType} contient {staff} apparaissent ici.',
    filters: {
      searchLabel: "Rechercher par nom d'utilisateur",
      searchPlaceholder: "Rechercher par nom d'utilisateur",
      access: 'Accès',
      all: 'Tous',
      granted: 'A accès',
      denied: "Pas d'accès",
    },
  },
};
