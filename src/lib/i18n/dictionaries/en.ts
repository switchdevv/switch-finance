/**
 * The English dictionary — and, because `Dictionary` is `typeof en`, the schema every
 * other language is checked against. Adding a key here is a type error in fr.ts until it
 * is translated there too.
 *
 * Placeholders are `{name}` and are substituted by `t()`; see lib/i18n/dictionary.ts.
 * Keys ending `_one` / `_other` are plural pairs, read with `tCount()`.
 *
 * Everything that leaves the browser — the spreadsheet (`sheet`) and the printable
 * invoice (`invoice`) — is written from here too, in the language the dashboard is set to
 * when the file is made.
 */
export const en = {
  app: {
    name: 'Switch',
    suite: 'Finance',
    title: 'Switch Finance',
    description: 'Internal finance dashboard for the Switch platform.',
  },

  common: {
    loading: 'Loading',
    retry: 'Retry',
    tryAgain: 'Try again',
    cancel: 'Cancel',
    clear: 'Clear',
    clearFilters: 'Clear filters',
    preparing: 'Preparing…',
    showing: 'Showing {start}–{end}',
    showingOf: 'Showing {start}–{end} of {total}',
    delivery: 'Delivery',
    pickup: 'Pickup',
  },

  language: {
    label: 'Language',
  },

  theme: {
    label: 'Colour theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
  },

  nav: {
    menu: 'Menu',
    dashboard: 'Dashboard',
    restaurants: 'Restaurants',
    access: 'Access',
    logOut: 'Log out',
    signedIn: 'Signed in',
    finance: 'Finance',
  },

  auth: {
    subtitle: 'Sign in with your Switch account.',
    username: 'Username',
    usernamePlaceholder: 'your.username',
    password: 'Password',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    footer: 'Internal tool — access is granted by the Switch platform team.',
  },

  gate: {
    deniedTitle: "You don't have access to Switch Finance",
    deniedBody:
      'This account can sign in to Switch, but finance is restricted. An admin can grant you access from the Access page.',
    checkFailed: "Couldn't verify your access",
    signOut: 'Sign out',
    signingOut: 'Signing out…',
    adminsOnlyTitle: 'Admins only',
    adminsOnlyBody: 'Managing who can use Switch Finance is restricted to admin accounts.',
  },

  errors: {
    network: "Can't reach the server. Check your connection and try again.",
    invalidLogin: 'Invalid username or password.',
    notFound: "You don't have permission to view this, or it no longer exists.",
    loginDenied: "This account doesn't have access to Switch Finance.",
    grantAdminsOnly: 'Only admins can change access.',
    forbidden: "You don't have permission to do that.",
    grantNotDeployed:
      "Access changes aren't enabled on the server yet — ask the platform team to deploy `setFinanceAccess`.",
    rejected: 'The server rejected that request.',
    sessionExpired: 'Your session has expired. Please sign in again.',
    generic: 'Something went wrong. Please try again.',
  },

  roles: {
    admin: 'Admin',
    member: 'Has access',
    none: 'No access',
  },

  pagination: {
    label: 'Pagination',
    previous: 'Previous',
    next: 'Next',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    page: 'Page {page}',
  },

  range: {
    label: 'Date range',
    from: 'From',
    to: 'To',
    presets: {
      today: 'Today',
      week: 'This week',
      month: 'This month',
      year: 'This year',
      custom: 'Custom',
    },
  },

  dashboard: {
    eyebrow: 'Overview',
    title: 'Dashboard',
    description: 'Welcome to the Switch finance dashboard.',
    restaurantsCount: 'Restaurants on the platform',
    browse: 'Browse',
    comingSoon: 'Coming soon',
    reportsTitle: 'Platform reports',
    reportsBody:
      'Commission across every restaurant at once. Per-restaurant orders, spreadsheets and invoices are already on each restaurant page.',
    paymentsTitle: 'Payments',
    paymentsBody: 'Track which commission invoices have been settled.',
  },

  restaurants: {
    eyebrow: 'Directory',
    title: 'Restaurants',
    description: 'Every restaurant on the Switch platform, newest first.',
    tableLabel: 'Restaurants',
    loadError: "Couldn't load restaurants",
    columns: {
      name: 'Restaurant',
      phone: 'Phone',
      rating: 'Rating',
      orders: 'Orders',
      status: 'Status',
      created: 'Created',
      open: 'Open',
    },
    openRow: 'Open {name}',
    morePhones: '+{count} more',
    unrated: 'Unrated',
    emptyTitle: 'No restaurants found',
    emptyBody: 'No restaurant matches these filters.',
    status: {
      live: 'Live',
      paused: 'Paused',
      unapproved: 'Not approved',
      all: 'All statuses',
    },
    flags: {
      isFeatured: 'Featured',
      isDiscount: 'Discount',
      isPromo: 'Promo',
    },
    filters: {
      searchLabel: 'Search restaurants by name',
      searchPlaceholder: 'Search by name',
      status: 'Status',
      city: 'City',
      allCities: 'All cities',
    },
  },

  restaurant: {
    loadError: "Couldn't load this restaurant",
    notFoundTitle: 'Restaurant not found',
    notFoundBody: 'It may have been removed, or the link is incorrect.',
    back: 'Back to restaurants',
    openInMaps: 'Open in Maps',
    reviews_one: '({count} review)',
    reviews_other: '({count} reviews)',
    provenance: 'Created {created} · Updated {updated}',
  },

  report: {
    scopeLabel: 'Which orders',
    scopes: {
      billable: 'Billable',
      all: 'All orders',
    },
    excel: 'Excel',
    invoice: 'Invoice',
    totalError: "Couldn't total this period",
    truncatedTitle: 'This period is too large to total exactly',
    truncatedBody:
      'Only the first {count} orders were read, so the figures below are a floor rather than a total. Narrow the dates to get an exact number.',
    ordersTitle: 'Orders',
    tiles: {
      orders: 'Billable orders',
      gross: 'Gross sales',
      grossAfterDiscount: 'after {amount} of discounts',
      grossHint: 'items total, net of discounts',
      commission: 'Commission',
      commissionHint: '{rate} of gross sales, owed to Switch',
      average: 'Average order',
      averageHint: 'gross sales per billable order',
    },
  },

  orders: {
    count_one: '{count} order',
    count_other: '{count} orders',
    tableLabel: 'Orders',
    loadError: "Couldn't load orders",
    columns: {
      id: 'Order',
      placed: 'Placed',
      customer: 'Customer',
      type: 'Type',
      status: 'Status',
      items: 'Items',
      discount: 'Discount',
      total: 'Total',
    },
    emptyTitle: 'No orders in this period',
    emptyBillable:
      'Nothing billable was placed in the selected dates. Switch to All orders to include canceled and in-progress ones.',
    emptyAll: 'Nothing was placed in the selected dates.',
    status: {
      placed: 'Placed',
      confirmed: 'Confirmed',
      onTheWay: 'On the way',
      delivered: 'Delivered',
      readyForPickup: 'Ready for pickup',
      pickedUp: 'Picked up',
      canceled: 'Canceled',
      unknown: 'Unknown',
    },
  },

  categories: {
    uncategorised: 'Uncategorised',
    unnamedMenu: 'Menu #{id}',
  },

  exportDialog: {
    title: 'Export orders',
    billable_one: '{count} billable order',
    billable_other: '{count} billable orders',
    categories: 'Categories',
    columns: 'Columns',
    selectAll: 'Select all',
    clearAll: 'Clear all',
    categoriesError: "Couldn't load this restaurant's menu categories.",
    uncategorisedHint: 'Deleted dishes, or dishes in no menu',
    wholeRestaurant: 'None picked: the whole restaurant is exported.',
    narrowed:
      'Only dishes in these categories are exported. An order that also has other dishes counts at their share of its price, with its discount and fees shared the same way.',
    needsColumn: 'A spreadsheet needs at least one column.',
    export: 'Export',
  },

  sheet: {
    name: 'Orders',
    subtitle: 'Orders · {period}',
    subtitleCategories: 'Orders · {categories} · {period}',
    truncated:
      'WARNING: this range exceeded the export limit — the rows below are the earliest part of it, not the whole period.',
    categoryNote:
      'Orders that also contained dishes from other categories are counted at the share of their price those dishes make up; discounts and fees are shared out the same way.',
    totals: 'Totals',
    commissionOwed: 'Commission owed to Switch',
    commissionOwedValue: 'Commission owed to Switch: {amount}',
    noColumns: 'Pick at least one column to export.',
    fields: {
      date: 'Date',
      time: 'Time',
      id: 'Order',
      type: 'Type',
      customer: 'Customer',
      status: 'Status',
      products: 'Products',
      productsHint: 'The dishes ordered, e.g. “Kefta ×2, Coke”',
      items: 'Price',
      discount: 'Discount',
      net: 'Net sales',
      commission: 'Commission',
      commissionHint:
        'Calculated from the order total using the restaurant’s commission rate — not stored on the order.',
      delivery: 'Delivery fee',
      service: 'Service fee',
      payment: 'Payment',
    },
    payment: {
      card: 'Card',
      cash: 'Cash',
    },
    /** Filename parts — kept to plain ASCII so no OS mangles them. */
    file: {
      restaurant: 'restaurant',
      categories: 'categories',
      orders: 'orders',
      to: 'to',
    },
  },

  invoice: {
    modeLabel: 'Invoice type',
    modes: {
      commission: 'Commission invoice',
      statement: 'Sales statement',
    },
    categoriesLabel: 'Categories',
    wholeRestaurant: 'Whole restaurant',
    print: 'Print / Save as PDF',
    incomplete: 'This invoice link is incomplete.',
    buildError: "Couldn't build this invoice",
    preparing: 'Preparing the invoice…',
    gone: 'That restaurant no longer exists.',
    unsoldTitle: 'Some categories in this link sold nothing in this period',
    unsoldBody: "They're still named on the document, but contribute no orders to it.",
    truncatedTitle: 'This period is too large to invoice exactly',
    truncatedBody:
      'Only the first {count} orders were read. Narrow the dates before sending this to anyone.',
    tagline: 'Food delivery platform',
    number: 'No. {number}',
    period: 'Period:',
    issued: 'Issued:',
    billedTo: 'Billed to',
    statementFor: 'Statement for',
    category_one: 'Category:',
    category_other: 'Categories:',
    summary: {
      orders: 'Billable orders',
      items: 'Items total',
      discounts: 'Discounts',
      base: 'Commission base',
      rate: 'Commission rate',
      average: 'Average order',
      commissionDue: 'Commission due to Switch',
      grossSales: 'Gross sales for the period',
    },
    statementCommission: 'Commission owed to Switch on this period at {rate}:',
    fees:
      'Charged to customers on top of the food and excluded from commission: delivery {delivery}, service {service}.',
    linesTitle: 'Orders in this period',
    lines: {
      order: 'Order',
      date: 'Date',
      type: 'Type',
      items: 'Items',
      discount: 'Discount',
      net: 'Net',
    },
    footnote: {
      billable:
        'Figures cover orders that were not canceled and reached at least the “on the way / ready” stage, matching what the restaurant sees in its own Switch app.',
      settlement:
        "Orders are settled with the restaurant as they are taken, so the only balance shown here is the commission owed to Switch. It is calculated at the restaurant's current rate of {rate}, applied to items total less discounts. Orders do not store the rate that was in force when they were placed, so a later change to the rate will change the figures on a reprint of this period.",
      scope:
        'This document covers only the dishes in {categories}, going by the menu section each dish is in today. An order that also contained other dishes is counted at the share of its items total those dishes make up, with its discount and fees shared out the same way and rounded to the nearest unit.',
    },
    /** The browser offers this as the PDF's filename when saving. */
    documentTitle: '{document} — {restaurant} — {period}',
  },

  access: {
    eyebrow: 'Administration',
    title: 'Access',
    description:
      'Staff accounts that can be given access to Switch Finance. Admins always have it.',
    tableLabel: 'Staff accounts',
    loadError: "Couldn't load staff accounts",
    columns: {
      account: 'Account',
      email: 'Email',
      role: 'Role',
      access: 'Access',
    },
    always: 'Always',
    alwaysReason: ' — admins have access by role',
    toggleLabel: 'Finance access for {name}',
    granted: 'Granted',
    notGranted: 'Not granted',
    ownAccount: 'Your own account',
    emptyTitle: 'No staff accounts found',
    emptyBody: 'Only accounts whose {appType} includes {staff} appear here.',
    filters: {
      searchLabel: 'Search staff by username',
      searchPlaceholder: 'Search by username',
      access: 'Access',
      all: 'All',
      granted: 'Has access',
      denied: 'No access',
    },
  },
} as const;
