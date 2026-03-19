import { getDB } from './project-db';

export async function listProducts() {
  const db = await getDB();
  return db.getAll('products');
}

export async function saveProduct(product) {
  const db = await getDB();
  if (!product.id) {
    product.id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    product.created_at = new Date().toISOString();
  }
  await db.put('products', product);
  return product;
}

export async function deleteProduct(id) {
  const db = await getDB();
  await db.delete('products', id);
}
