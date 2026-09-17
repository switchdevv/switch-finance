'use client';

import { useMemo } from 'react';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { listOrderCategories, type MenuNames, type OrderCategory } from '@/lib/finance/categories';
import { collectDishIds } from '@/lib/finance/order-lines';
import { useI18n } from '@/lib/i18n/provider';
import { queryKeys } from '@/lib/query/keys';
import { fetchDishes, type DishCatalogue } from '@/lib/services/foods';
import { fetchMenus } from '@/lib/services/menus';
import type { Order } from '@/types/order';

type WithLines = Pick<Order, 'options' | 'food'>;

export type OrderCatalogue = { dishes: DishCatalogue; menuNames: MenuNames };

/**
 * The lookup behind both the Products column and the category split, as query options so
 * a component can subscribe to it (useOrderCategories) and a click handler can await the
 * very same cache entry (`queryClient.fetchQuery`).
 */
export function orderCatalogueQuery(restaurantId: string, orders: WithLines[]) {
  const dishIds = collectDishIds(orders).sort();

  return queryOptions({
    queryKey: queryKeys.foods.catalogue(restaurantId, dishIds),
    queryFn: async (): Promise<OrderCatalogue> => {
      const dishes = await fetchDishes(dishIds);
      const menuIds = new Set<string>();
      for (const dish of dishes.values()) if (dish.menuId) menuIds.add(dish.menuId);

      const menus = await fetchMenus([...menuIds]);
      const menuNames: MenuNames = new Map();
      for (const menu of menus) if (menu.name) menuNames.set(menu.objectId, menu.name);

      return { dishes, menuNames };
    },
    // Matches the range fetch it's derived from.
    staleTime: 60_000,
  });
}

/**
 * The categories a range's orders fall into, with the catalogue that decided it. Waits
 * for the orders, and for `enabled` — the export dialog only pays for the lookup once
 * it's opened.
 */
export function useOrderCategories(
  restaurantId: string,
  orders: WithLines[] | undefined,
  { enabled }: { enabled: boolean },
) {
  const { t } = useI18n();
  const options = useMemo(
    () => orderCatalogueQuery(restaurantId, orders ?? []),
    [restaurantId, orders],
  );
  const query = useQuery({
    ...options,
    enabled: enabled && orders !== undefined && restaurantId.length > 0,
  });

  const categories = useMemo<OrderCategory[]>(() => {
    if (!query.data || !orders) return [];
    return listOrderCategories(orders, query.data.dishes, query.data.menuNames, t);
    // `t` changes identity when the language does, which is exactly when these names
    // have to be rebuilt.
  }, [query.data, orders, t]);

  // Returned alongside rather than spread into the result: React Query only re-renders for
  // the fields a component reads, and a spread reads them all.
  return { query, categories };
}
