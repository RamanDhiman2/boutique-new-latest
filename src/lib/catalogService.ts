import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import {
  categories as staticCategories,
  products as staticProducts,
  productsIn as staticProductsIn,
  type Category,
  type Product,
} from "./catalog";

/**
 * Fetch all active categories from Supabase with graceful fallback to static catalog
 */
export async function fetchCategoriesFromSupabase(): Promise<Category[]> {
  try {
    const { data, error } = await supabase.from("categories").select("*").eq("is_active", true);

    if (error || !data || data.length === 0) {
      return staticCategories;
    }

    // Map Supabase rows to Category objects, pairing with local high-res imagery if database image is null
    const mapped: Category[] = (data as any[]).map((row) => {
      const localCat = staticCategories.find((c) => c.slug === row.slug);
      return {
        slug: row.slug,
        name: row.name,
        tagline: row.tagline || localCat?.tagline || "",
        description: row.description || localCat?.description || "",
        image: row.image || localCat?.image || staticCategories[0]!.image,
      };
    });

    return mapped;
  } catch (err) {
    console.warn("Falling back to local categories catalog:", err);
    return staticCategories;
  }
}

/**
 * Fetch products from Supabase (the source of truth managed in the admin panel).
 * Built-in photos and copy from the static catalog fill any gaps, and the static
 * catalog is used as a whole only when Supabase cannot be reached.
 */
export async function fetchProductsFromSupabase(
  categorySlug?: string,
  options: { includeInactive?: boolean } = {},
): Promise<Product[]> {
  try {
    const base = supabase.from("products").select("*");
    const { data, error } = options.includeInactive ? await base : await base.eq("is_active", true);

    if (error || !Array.isArray(data)) {
      return categorySlug ? staticProductsIn(categorySlug) : staticProducts;
    }

    const mappedProducts = sortProducts((data as any[]).map(mapProductRow));
    return categorySlug ? filterByCategory(mappedProducts, categorySlug) : mappedProducts;
  } catch (err) {
    console.warn("Falling back to local products catalog:", err);
    return categorySlug ? staticProductsIn(categorySlug) : staticProducts;
  }
}

export function mapProductRow(row: any): Product {
  const localProd = staticProducts.find((p) => p.id === row.id);
  const dbImages = Array.isArray(row.images)
    ? row.images.filter((i: unknown) => typeof i === "string" && i)
    : [];
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    colour: row.colour || localProd?.colour || "",
    category: row.category || localProd?.category || "shop-by-occasion",
    images: dbImages.length > 0 ? dbImages : localProd?.images || [],
    sizes:
      Array.isArray(row.sizes) && row.sizes.length > 0 ? row.sizes : localProd?.sizes || ["Custom"],
    customisable: row.customisable ?? localProd?.customisable ?? true,
    description: row.description || localProd?.description || "",
    soldOut: Boolean(row.is_sold_out),
    isUpcoming: Boolean(row.is_upcoming),
    isActive: row.is_active !== false,
    hasCustomImages: dbImages.length > 0,
  };
}

/** Newest admin-added products first, then the original catalogue order. */
function sortProducts(list: Product[]): Product[] {
  const staticIndex = new Map(staticProducts.map((p, i) => [p.id, i]));
  return [...list].sort((a, b) => (staticIndex.get(a.id) ?? -1) - (staticIndex.get(b.id) ?? -1));
}

export function filterByCategory(list: Product[], categorySlug: string): Product[] {
  if (categorySlug === "sold-out" || categorySlug === "sold-out-products") {
    return list.filter((p) => p.soldOut || p.category === categorySlug);
  }
  return list.filter((p) => p.category === categorySlug);
}

/** Shared cache entry for the public product list (also used by route loaders). */
export const productsQueryOptions = {
  queryKey: ["catalog", "products", "all"] as const,
  queryFn: () => fetchProductsFromSupabase(),
  staleTime: 1000 * 60 * 5,
};

/**
 * React Hook for dynamic categories with Supabase sync and instant static fallback
 */
export function useCategoriesQuery() {
  return useQuery<Category[]>({
    queryKey: ["catalog", "categories"],
    queryFn: fetchCategoriesFromSupabase,
    placeholderData: staticCategories,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * React Hook for dynamic products in a category
 */
export function useCategoryProductsQuery(categorySlug: string) {
  return useQuery({
    ...productsQueryOptions,
    placeholderData: staticProducts,
    select: (list: Product[]) => filterByCategory(list, categorySlug),
  });
}

/**
 * React Hook for all products
 */
export function useAllProductsQuery() {
  return useQuery({
    ...productsQueryOptions,
    placeholderData: staticProducts,
  });
}

/**
 * Looks up a product by id for order history and admin screens: live data first,
 * then the static catalogue (so hidden or old products still show a name/photo).
 */
export function useProductLookup() {
  const { data = staticProducts } = useAllProductsQuery();
  return useCallback(
    (id: string): Product | undefined =>
      data.find((p) => p.id === id) ?? staticProducts.find((p) => p.id === id),
    [data],
  );
}
