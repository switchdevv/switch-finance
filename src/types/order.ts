import type { ParseObjectJSON, ParsePointer } from './parse';

/**
 * Per-line detail, keyed by the Food objectId. The array this lives in is
 * index-aligned with the order's `food` pointer array (see
 * switch-food/src/screens/OrderDetails/OrderDetails.js:385) — the reports here don't
 * expand line items, but the shape is modeled so a future line-level view doesn't have
 * to rediscover it.
 */
export type OrderLine = Record<
  string,
  {
    quantity?: number;
    price?: number;
    variants?: { name?: string; value?: { name?: string } }[];
    instructions?: { name?: string }[];
    note?: string;
  }
>;

/**
 * Every money figure on an order lives in this JSON column — there are no top-level
 * total columns. Written at checkout in switch-food/src/screens/Cart/Checkout.js:215-233:
 *
 *   total = itemsTotal - discount + service + delivery
 *
 * Only `itemsTotal` and `discount` belong to the restaurant; `service` is the platform's
 * per-city fee and `delivery` is the driver's. Commission is charged on
 * `itemsTotal - discount` alone (see lib/finance/totals.ts).
 */
export type OrderOptions = {
  itemsTotal?: number;
  discount?: number;
  /** Platform service fee (City.fees.food.service), 0 under a `freeall` promo. */
  service?: number;
  /** Delivery fee. Absent on pickup orders. */
  delivery?: number;
  /** True when a promo made delivery free — the fee was absorbed, not charged. */
  freeDelivery?: boolean;
  total?: number;
  paymentMethod?: 'cash' | 'creditcards';
  note?: string;
  values?: OrderLine[];
};

export type DeliveryType = 'delivery' | 'pickup';

/**
 * The `Order` class. `objectId` doubles as the order number — the RN apps render it as
 * `'#' + objectId` and no separate reference column exists.
 *
 * `status` runs 0 placed → 1 confirmed → 2 onTheWay/prepared → 3 delivered/picked, with
 * the labels for 2 and 3 depending on `deliveryType`. `canceled` is a separate flag that
 * overrides the status entirely rather than a fifth status value.
 */
export type Order = ParseObjectJSON & {
  status?: number;
  canceled?: boolean;
  isReady?: boolean;
  deliveryType?: DeliveryType;
  /** The vertical. Always 'food' on this backend; every query filters on it anyway,
   * exactly as the RN apps do, so a future vertical can't leak into these totals. */
  type?: string;
  distance?: number;
  duration?: number;
  options?: OrderOptions;

  restaurant?: ParsePointer<'Restaurant'>;
  user?: ParsePointer<'_User'>;
  driver?: ParsePointer<'_User'>;
  userAddress?: ParsePointer<'Address'>;
  promo?: ParsePointer<'Promo'>;
  food?: ParsePointer<'Food'>[];
};

/** An order with `user` resolved by `include` — the customer name the table shows. */
export type OrderWithUser = Omit<Order, 'user'> & {
  user?: ParseObjectJSON & { fullname?: string; phone?: string };
};
