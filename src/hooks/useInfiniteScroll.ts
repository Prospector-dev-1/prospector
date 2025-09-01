import { useState, useCallback, useRef, useEffect } from 'react';

export interface InfiniteScrollOptions<T> {
  fetchData: (page: number, limit: number) => Promise<{ data: T[]; hasMore: boolean }>;
  initialPage?: number;
  pageSize?: number;
  threshold?: number;
}

export const useInfiniteScroll = <T>({
  fetchData,
  initialPage = 1,
  pageSize = 10,
  threshold = 100,
}: InfiniteScrollOptions<T>) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentPage = useRef(initialPage);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchData(currentPage.current, pageSize);
      
      setData(prev => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      currentPage.current += 1;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchData, pageSize, loading, hasMore]);

  const reset = useCallback(() => {
    setData([]);
    setLoading(false);
    setHasMore(true);
    setError(null);
    currentPage.current = initialPage;
  }, [initialPage]);

  const refresh = useCallback(async () => {
    reset();
    await loadMore();
  }, [reset, loadMore]);

  // Intersection observer for automatic loading
  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMore();
      }
    }, { 
      threshold: 0.1,
      rootMargin: `${threshold}px`
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, loadMore, threshold]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    data,
    loading,
    hasMore,
    error,
    loadMore,
    reset,
    refresh,
    lastElementRef,
  };
};