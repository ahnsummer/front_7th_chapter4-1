import { getContext } from "../lib/asyncContext.js";

export async function getProducts(params = {}) {
  const { limit = 20, search = "", category1 = "", category2 = "", sort = "price_asc" } = params;
  const page = params.current ?? params.page ?? 1;

  const searchParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(category1 && { category1 }),
    ...(category2 && { category2 }),
    sort,
  });

  const context = getContext();

  const response = await fetch(`${context.origin ?? ""}/api/products?${searchParams}`);

  return await response.json();
}

export async function getProduct(productId) {
  const context = getContext();
  const response = await fetch(`${context.origin ?? ""}/api/products/${productId}`);
  return await response.json();
}

export async function getCategories() {
  const context = getContext();
  const response = await fetch(`${context.origin ?? ""}/api/categories`);
  return await response.json();
}
