import { useState, useMemo, useCallback } from 'react';
import { useProducts, useDebounce} from './hooks';
import { useInfiniteScroll } from './hooks/useInfiniteScroll'
import {
  SearchBar,
  SortDropdown,
  FilterPanel,
  ProductGrid,
} from './components';
import { DEFAULT_FILTERS } from './types';
import type { ProductFilters, Product } from './types';
import './styles/catalog.css';

const ITEMS_PER_BATCH = 12;

interface ProductCatalogPageProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

function ProductCatalogPage({ showNotification }: ProductCatalogPageProps) {
  const { products, categories, isLoading, error, refetch } = useProducts();
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_BATCH);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const debouncedSearch = useDebounce(filters.search, 800);
  const isSearching = filters.search !== debouncedSearch;

  // Filter handlers
  const handleFilterChange = useCallback(
    (key: keyof ProductFilters, value: string | number) => {
      setFilters(prev => ({ ...prev, [key]: value }));
      setVisibleCount(ITEMS_PER_BATCH);
      setIsLoadingMore(false);
    },
    []
  );

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setVisibleCount(ITEMS_PER_BATCH);
  }, []);

  const handleSortByChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, sortBy: value as ProductFilters['sortBy'] }));
  }, []);

  const handleSortOrderChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, sortOrder: value as ProductFilters['sortOrder'] }));
  }, []);

  // Filtering + sorting

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter(product =>
        (product.title || '').toLowerCase().includes(searchLower) ||
        (product.description || '').toLowerCase().includes(searchLower) ||
        (product.brand || '').toLowerCase().includes(searchLower) ||
        (product.category || '').toLowerCase().includes(searchLower)
      );
    }

    if (filters.category) {
      result = result.filter(product => product.category === filters.category);
    }

    result = result.filter(
      product =>
        product.price >= filters.minPrice &&
        product.price <= filters.maxPrice
    );

    if (filters.minRating > 0) {
      result = result.filter(product => product.rating >= filters.minRating);
    }

    result.sort((a: Product, b: Product) => {
      const aValue = a[filters.sortBy];
      const bValue = b[filters.sortBy];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return filters.sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return result;
  }, [products, debouncedSearch, filters]);

  // Infinite scroll logic

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const loadMore = useCallback(() => {
    setIsLoadingMore(true);

    setTimeout(() => {
      setVisibleCount(prev => prev + ITEMS_PER_BATCH);
      setIsLoadingMore(false);
    }, 300); // simulate network delay for UX
  }, []);


  const hasMore = visibleCount < filteredProducts.length;

  const loadMoreRef = useInfiniteScroll(loadMore, hasMore);

  // Error state

  if (error) {
    showNotification('Failed to load products', 'error');
    return (
      <div className="catalog-page">
        <h2 className="page-title">Product Catalog</h2>
        <div className="catalog-error">
          <span className="catalog-error-icon">⚠️</span>
          <h3>Failed to load products</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={refetch}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Main render

  return (
    <div className="catalog-page">
      <h2 className="page-title">Product Catalog</h2>

      <div className="catalog-toolbar">
        <SearchBar
          value={filters.search}
          onChange={(value) => handleFilterChange('search', value)}
        />

        <SortDropdown
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onSortByChange={handleSortByChange}
          onSortOrderChange={handleSortOrderChange}
        />
      </div>

      <div className="catalog-layout">
        <FilterPanel
          filters={filters}
          categories={categories}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        <main className="catalog-main">
          {isLoading ? (
            <div className="catalog-loading">
              <div className="loading-spinner"></div>
              <p>Loading products....</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="catalog-empty">
              <span className="catalog-empty-icon">📦</span>
              <h3>No products found</h3>
              <p>Try adjusting your search or filter criteria</p>
              <button className="btn btn-secondary" onClick={handleResetFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="catalog-results-info">
                <span>{filteredProducts.length} products found</span>
                {isSearching && (
                  <span className="catalog-searching">Searching...</span>
                )}
              </div>

              <div className="catalog-products-container">
                {isSearching && (
                  <div className="catalog-overlay-loader">
                    <div className="loading-spinner"></div>
                  </div>
                )}

                <ProductGrid products={visibleProducts} />
              </div>

              {/* Infinite scroll trigger */}
              <div ref={loadMoreRef} style={{ height: 1 }} />

              {isLoadingMore && (
                <div className="catalog-loading-more">
                  <div className="loading-spinner"></div>
                  <p>Loading more products...</p>
                </div>
              )}

            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default ProductCatalogPage;

