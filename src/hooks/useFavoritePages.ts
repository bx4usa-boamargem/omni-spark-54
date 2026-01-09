import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'favorite_pages';

export const useFavoritePages = () => {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = useCallback((route: string) => {
    setFavorites(prev => {
      if (prev.includes(route)) return prev;
      return [...prev, route];
    });
  }, []);

  const removeFavorite = useCallback((route: string) => {
    setFavorites(prev => prev.filter(r => r !== route));
  }, []);

  const isFavorite = useCallback((route: string) => {
    return favorites.includes(route);
  }, [favorites]);

  const toggleFavorite = useCallback((route: string) => {
    if (favorites.includes(route)) {
      removeFavorite(route);
    } else {
      addFavorite(route);
    }
  }, [favorites, addFavorite, removeFavorite]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
  };
};
