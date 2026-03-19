import { useState, useEffect, useCallback } from 'react';
import { listProducts, saveProduct, deleteProduct } from '../data/product-db';

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await listProducts();
    setProducts(all);
  }, []);

  useEffect(() => {
    refresh().then(() => setLoading(false));
  }, [refresh]);

  const save = useCallback(async (product) => {
    const saved = await saveProduct(product);
    await refresh();
    return saved;
  }, [refresh]);

  const remove = useCallback(async (id) => {
    await deleteProduct(id);
    await refresh();
  }, [refresh]);

  return { products, loading, save, remove, refresh };
}
