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
    drivers: 'Drivers',
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
    commissionPeriod: 'Commission for this period',
    commissionPeriodValue: 'Commission for this period: {amount}',
    previousBalance: 'Previous balance',
    previousBalanceNoted: 'Previous balance ({note})',
    totalDue: 'Total due to Switch',
    /** Used only on a sheet with no money column to hang a figure under. */
    labelledValue: '{label}: {amount}',
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
      average: 'Average order',
      commissionDue: 'Commission due to Switch',
      /** Replaces commissionDue as a plain row when a previous balance is added below
       * it, so the bold line at the foot is the one figure to pay. */
      commissionPeriod: 'Commission for this period',
      previousBalance: 'Previous balance',
      previousBalanceNoted: 'Previous balance ({note})',
      totalDue: 'Total due to Switch',
      grossSales: 'Gross sales for the period',
    },
    statementCommission: 'Commission owed to Switch on this period at {rate}:',
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
      scope:
        'This document covers only the dishes in {categories}, going by the menu section each dish is in today. An order that also contained other dishes is counted at the share of its items total those dishes make up, with its discount and fees shared out the same way and rounded to the nearest unit.',
    },
    /** The browser offers this as the PDF's filename when saving. It no longer reaches
     * paper — the print stylesheet drops the browser's header and footer. */
    documentTitle: '{document} — {restaurant} — {period}',
  },

  invoiceDialog: {
    /** Keyed by where the dialog was opened from — the restaurant page, or the
     * document itself. */
    title: {
      open: 'Create invoice',
      print: 'Print invoice',
    },
    subtitle: {
      open: 'What goes on the document. It opens in a new tab.',
      print: 'What goes on the document, before it goes to paper.',
    },
    submit: {
      open: 'Open invoice',
      print: 'Print / Save as PDF',
    },
    wholeRestaurant: 'None picked: the whole restaurant is invoiced.',
    narrowed:
      'Only dishes in these categories are invoiced. An order that also has other dishes counts at their share of its price, with its discount and fees shared the same way.',
    noColumns: 'No order table will be printed — only the summary and the total.',
  },

  carryOver: {
    section: 'Previous balance',
    amount: 'Amount still owed',
    note: 'What it is for',
    notePlaceholder: 'e.g. August 2026',
    hint: 'Leave at zero if nothing is outstanding from before this period.',
    included: 'Added after this period’s commission: {amount}. Nothing is charged on it.',
  },

  drivers: {
    eyebrow: 'Prepaid service fees',
    title: 'Drivers',
    description:
      'Every driver’s prepaid orders: the service fees they pay in advance, what their deliveries use, and what would be refunded if they left.',
    tableLabel: 'Drivers',
    loadError: "Couldn't load drivers",
    walletsError: "Couldn't load the wallets",
    noCity: 'No city',
    never: 'Never',
    openRow: 'Open {name}',
    emptyTitle: 'No drivers found',
    emptyBody: 'No driver matches these filters.',
    columns: {
      driver: 'Driver',
      city: 'City',
      wallet: 'Orders left',
      value: 'Value held',
      price: 'Price today',
      lastTopUp: 'Last top-up',
      account: 'Account',
      open: 'Open',
    },
    state: {
      all: 'All wallets',
      ok: 'Enough orders',
      low: 'Running low',
      empty: 'Out of orders',
      none: 'No wallet',
      closed: 'Closed',
    },
    filters: {
      searchLabel: 'Search drivers',
      searchPlaceholder: 'Name, username or phone',
      state: 'Wallet',
      city: 'City',
      allCities: 'All cities',
    },
    account: {
      online: 'Online',
      offline: 'Offline',
      deactivated: 'Deactivated',
    },
    enforcedTitle: 'Wallets are enforced',
    enforcedBody:
      'A driver needs at least {min} to go online, and is warned in the app at {low}.',
    notEnforcedTitle: 'Wallets are not enforced yet',
    notEnforcedBody:
      'Balances are kept, but no driver is refused or warned. An admin turns this on in Wallet settings, once every active driver has their balance.',
    tiles: {
      held: 'Prepaid held',
      heldHint: 'what the orders left would refund',
      low: 'Running low',
      lowHint: 'at {orders} or fewer',
      empty: 'Out of orders',
      emptyHint: "can't go online while enforced",
      none: 'No wallet',
      noneHint: 'active drivers with no top-up yet',
    },
  },

  driver: {
    loadError: "Couldn't load this driver",
    walletError: "Couldn't load this driver’s wallet",
    notFoundTitle: 'Driver not found',
    notFoundBody: 'It may have been removed, or the link is incorrect.',
    back: 'Back to drivers',
    noWalletTitle: 'No wallet yet',
    noWalletBody:
      'Record this driver’s first top-up to open their wallet. Their deliveries count from then on, or from the date you carry a balance over from.',
    firstTopUp: 'Record first top-up',
    since: 'Wallet since {date}',
    closedOn: 'Closed on {date}',
    tiles: {
      left: 'Orders left',
      leftHint: '{amount} if refunded today',
      owes: 'The driver owes {amount}',
      price: 'Price per order today',
      priceHint: 'the service fee in {city}',
      used: 'Used in this period',
      deliveries_one: '{count} delivery · {credited} given back',
      deliveries_other: '{count} deliveries · {credited} given back',
      toppedUp: 'Topped up in this period',
      toppedUpHint: '{received} received · {refunded} refunded',
    },
  },

  wallet: {
    orders_one: '{count} order',
    orders_other: '{count} orders',
    state: {
      ok: 'Enough',
      low: 'Low',
      empty: 'Out',
      none: 'No wallet',
      closed: 'Closed',
    },
    saving: 'Saving…',
    note: 'Note',
    methods: {
      cash: 'Cash',
      transfer: 'Transfer',
      carriedOver: 'Carried over',
    },
    actions: {
      topUp: 'Top up',
      refund: 'Refund',
      adjust: 'Adjust',
      void: 'Void this entry',
    },
    topUp: {
      title: 'Top up {name}',
      subtitle: 'Orders paid for in advance, at today’s price. They keep that price.',
      noPrice: 'This driver’s city has no service fee, so there is nothing to prepay.',
      orders: 'Orders',
      collect: 'Collect',
      collectDetail: '{orders} × {price}, today’s service fee in {city}.',
      method: 'Paid by',
      reference: 'Reference',
      referencePlaceholder: 'e.g. a transfer number',
      startsAt: 'Count deliveries from',
      startsAtHint:
        'Deliveries placed before this day are not counted. Keep today for a new driver; to carry over a balance kept by hand, pick the day it was worked out on.',
      submit: 'Record top-up',
    },
    refund: {
      title: 'Refund {name}',
      subtitle: 'Money handed back to the driver for orders they won’t use.',
      owes: 'Nothing to refund: the driver owes {amount}.',
      modeLabel: 'What to refund',
      all: 'Every order left',
      some: 'Some orders',
      orders: 'Orders to refund',
      payBack: 'Hand back',
      payBackAll: 'The {orders} left, each at what was paid for it.',
      payBackSome: 'The oldest orders go first, each at what was paid for it.',
      close: 'Close the wallet',
      closeHint: 'The driver is leaving. A later top-up opens it again.',
      submit: 'Record refund',
    },
    adjust: {
      title: 'Adjust {name}',
      subtitle: 'A correction, with the reason on the ledger. Admins only.',
      directionLabel: 'Direction',
      add: 'Add orders',
      remove: 'Take orders away',
      orders: 'Orders',
      value: 'Value per order',
      valueHint:
        'Today’s price is {price}. Use 0 for orders given with no cash value: they are never refunded.',
      removeHint: 'The oldest orders go first, like a delivery.',
      reason: 'Reason',
      submit: 'Record adjustment',
    },
    void: {
      title: 'Void this {kind}?',
      subtitle:
        'It stays on the ledger, struck through, and leaves every balance. This can’t be undone.',
      reason: 'Reason',
      submit: 'Void',
    },
    settings: {
      open: 'Wallet settings',
      title: 'Wallet settings',
      subtitle: 'The rules drivers’ wallets are held to. They apply at once, with no app update.',
      enforced: 'Enforce wallets',
      enforcedHint:
        'Drivers without enough orders can’t go online, and are warned once when they run low.',
      minOrders: 'Orders needed to go online',
      lowOrders: 'Warn drivers at',
      summary: 'Going online needs {min}. Drivers get a push and an in-app banner at {low}.',
      invalid: 'Both must be whole numbers, and the warning can’t come before the minimum.',
      affected_one:
        '{count} driver is online now with fewer than {min}. They keep this session, then can’t go online again until they top up.',
      affected_other:
        '{count} drivers are online now with fewer than {min}. They keep this session, then can’t go online again until they top up.',
      submit: 'Save',
    },
    ledger: {
      title: 'Ledger',
      tableLabel: 'Wallet ledger',
      emptyTitle: 'Nothing moved in this period',
      opening: 'Orders held before this period: {orders}',
      truncated: 'only the newest {count} lines are shown',
      freeDeliveryHint: 'Free delivery: the fee Switch owes is given back in orders',
      voidedChip: 'Voided',
      by: 'by {name}',
      voided: 'Voided by {name}: {reason}',
      columns: {
        date: 'Date',
        movement: 'Movement',
        orders: 'Orders',
        price: 'Price',
        amount: 'Amount',
        balance: 'Balance',
        actions: 'Actions',
      },
      kinds: {
        topup: 'Top-up',
        refund: 'Refund',
        adjustment: 'Adjustment',
        orderChange: 'Order #{id} changed',
        order: 'Delivery #{id}',
        credit: 'Free delivery #{id}',
      },
      changes: {
        status: 'Status {from} → {to}',
        canceled: 'Canceled after delivery',
        uncanceled: 'Cancelation taken back',
        reassigned: 'Handed from {from} to {to}',
        money: 'Fees edited',
        deleted: 'Deleted',
        nobody: 'no driver',
      },
      effect: {
        none: 'no change',
        returned: '{orders} returned',
        taken: '{orders} used',
      },
    },
    errors: {
      notDeployed:
        'Driver wallets aren’t on the server yet: they arrive with the new server (switch-server-v2).',
      invalidParams: 'Some of these values aren’t accepted.',
      driverNotFound: 'This driver no longer exists.',
      notStarted: 'This driver has no wallet yet.',
      entryNotFound: 'That entry no longer exists.',
      notADriver: 'This account doesn’t use the driver app.',
      noCity: 'This driver has no city, so there is no price to top up at.',
      noServiceFee: 'This driver’s city has no service fee.',
      nothingToRefund: 'Nothing to refund.',
      refundExceedsBalance: 'That is more orders than the driver has left.',
      requestReused: 'This form was already sent. Close it and start again.',
      entryVoided: 'That entry is already voided.',
      entryNotVoidable: 'Order-change notes can’t be voided.',
      adminOnly: 'Only admins can do this.',
    },
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
