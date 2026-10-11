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
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true);

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
 * Fetch products from Supabase with graceful fallback to static catalog
 */
export async function fetchProductsFromSupabase(categorySlug?: string): Promise<Product[]> {
  try {
    let query = supabase.from("products").select("*").eq("is_active", true);

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return categorySlug ? staticProductsIn(categorySlug) : staticProducts;
    }

    const mappedProducts: Product[] = (data as any[]).map((row) => {
      const localProd = staticProducts.find((p) => p.id === row.id);
      return {
        id: row.id,
        name: row.name,
        price: Number(row.price),
        colour: row.colour || localProd?.colour || "Custom",
        category: row.category || localProd?.category || "shop-by-occasion",
        images: Array.isArray(row.images) && row.images.length > 0 ? row.images : localProd?.images || [],
        sizes: Array.isArray(row.sizes) && row.sizes.length > 0 ? row.sizes : localProd?.sizes || ["Custom"],
        customisable: row.customisable ?? localProd?.customisable ?? true,
        description: row.description || localProd?.description || "",
        soldOut: Boolean(row.is_sold_out ?? localProd?.soldOut),
        isUpcoming: Boolean(row.is_upcoming ?? localProd?.isUpcoming),
      };
    });

    if (!categorySlug) {
      return mappedProducts;
    }

    if (categorySlug === "sold-out" || categorySlug === "sold-out-products") {
      return mappedProducts.filter((p) => p.soldOut || p.category === categorySlug);
    }

    return mappedProducts.filter((p) => p.category === categorySlug);
  } catch (err) {
    console.warn("Falling back to local products catalog:", err);
    return categorySlug ? staticProductsIn(categorySlug) : staticProducts;
  }
}

/**
 * React Hook for dynamic categories with Supabase sync and instant static fallback
 */
export function useCategoriesQuery() {
  return useQuery<Category[]>({
    queryKey: ["catalog", "categories"],
    queryFn: fetchCategoriesFromSupabase,
    initialData: staticCategories,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * React Hook for dynamic products in a category
 */
export function useCategoryProductsQuery(categorySlug: string) {
  return useQuery<Product[]>({
    queryKey: ["catalog", "products", categorySlug],
    queryFn: () => fetchProductsFromSupabase(categorySlug),
    initialData: staticProductsIn(categorySlug),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * React Hook for all products
 */
export function useAllProductsQuery() {
  return useQuery<Product[]>({
    queryKey: ["catalog", "products", "all"],
    queryFn: () => fetchProductsFromSupabase(),
    initialData: staticProducts,
    staleTime: 1000 * 60 * 5,
  });
}
