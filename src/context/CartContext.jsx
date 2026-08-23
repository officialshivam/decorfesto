import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { calculateAddOnCost } from '../utils/customizationUtils';

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'decorfesto-cart';

function readInitialCart() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Unable to read cart from storage', error);
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readInitialCart);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items]);

  const addItem = (item) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((entry) => entry.key === item.key);
      if (existingItem) {
        return currentItems.map((entry) =>
          entry.key === item.key
            ? { ...entry, quantity: Math.min(3, entry.quantity + 1) }
            : entry,
        );
      }

      return [...currentItems, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (key, quantity) => {
    const clamped = Math.max(1, Math.min(3, quantity));
    setItems((currentItems) =>
      currentItems.map((item) => (item.key === key ? { ...item, quantity: clamped } : item)),
    );
  };

  const removeAddon = (itemKey, addonName) => {
    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.key !== itemKey) return item;

        const nextCustomization = { ...(item.customization || {}) };
        Object.keys(nextCustomization).forEach((k) => {
          const val = String(nextCustomization[k] || '');
          if (val.includes(addonName) || k === addonName) {
            delete nextCustomization[k];
          }
        });

        const nextAddOnPrice = calculateAddOnCost(nextCustomization);
        const basePrice = item.basePrice || item.price || 0;
        const nextTotalPrice = basePrice + nextAddOnPrice;

        return {
          ...item,
          customization: nextCustomization,
          addOnPrice: nextAddOnPrice,
          totalPrice: nextTotalPrice,
        };
      }),
    );
  };

  const removeItem = (key) => {
    setItems((currentItems) => currentItems.filter((item) => item.key !== key));
  };

  const clearCart = () => {
    setItems([]);
  };

  const value = useMemo(
    () => ({
      items,
      addItem,
      updateQuantity,
      removeAddon,
      removeItem,
      clearCart,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}
