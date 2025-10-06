'use client';

import { useMemo, useState } from 'react';
import { X, Trash2, ShoppingCart, Loader2, Minus, Plus } from 'lucide-react';
import styles from './checkoutPopup.module.css';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxQuantity: number; // used to disable +
}

interface CheckoutPopupProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemoveItem: (productId: string) => void;      // remove entire line
  onDecrementItem: (productId: string) => void;   // -1 quantity
  onIncrementItem: (productId: string) => void;   // +1 quantity (limit enforced in page)
  onClearCart?: () => void;
}

export default function CheckoutPopup({
  isOpen,
  onClose,
  cart,
  onRemoveItem,
  onDecrementItem,
  onIncrementItem,
  onClearCart,
}: CheckoutPopupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toInt = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  };
  const toMoney = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const totals = useMemo(() => {
    const itemCount = cart.reduce((sum, i) => sum + toInt(i.quantity), 0);
    const amount = cart.reduce((sum, i) => sum + toInt(i.quantity) * toMoney(i.price), 0);
    return { itemCount, amount };
  }, [cart]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 2,
    }).format(amount);

  if (!isOpen) return null;

  const checkoutCart = async () => {
    if (cart.length === 0) return;

    setLoading(true);
    setError('');

    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const res = await fetch('/api/main/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ items: cart }),
      });

      if (!res.ok) {
        const msg = await safeErrorMessage(res);
        throw new Error(msg || 'Checkout failed');
      }

      onClearCart?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <ShoppingCart className={styles.titleIcon} />
            <h2 id="checkout-title" className={styles.title}>
              Checkout ({totals.itemCount})
            </h2>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X />
          </button>
        </header>

        <section className={styles.body}>
          {error && <div className={styles.error}>{error}</div>}

          {cart.length === 0 ? (
            <div className={styles.empty}>
              Your cart is empty.
            </div>
          ) : (
            <ul className={styles.list} role="list">
              {cart.map((item) => {
                const qty = toInt(item.quantity);
                const maxQty = toInt(item.maxQuantity);
                const price = toMoney(item.price);
                const lineTotal = price * qty;
                const disableMinus = qty <= 1;
                const disablePlus = qty >= maxQty || maxQty <= 0;

                return (
                  <li key={item.productId} className={styles.itemRow}>
                    <div className={styles.itemInfo}>
                      <div className={styles.itemName}>{item.name}</div>
                      <div className={styles.itemMeta}>
                        {formatCurrency(price)} each
                      </div>
                    </div>

                    <div className={styles.itemRight}>
                      <div className={styles.qtyControls}>
                        <button
                          className={styles.qtyButton}
                          onClick={() => onDecrementItem(item.productId)}
                          disabled={disableMinus}
                          aria-label={`Decrease quantity of ${item.name}`}
                          title="Remove 1"
                        >
                          <Minus />
                        </button>
                        <div className={styles.qtyValue}>{qty}</div>
                        <button
                          className={styles.qtyButton}
                          onClick={() => onIncrementItem(item.productId)}
                          disabled={disablePlus}
                          aria-label={`Increase quantity of ${item.name}`}
                          title={disablePlus ? 'Max quantity reached' : 'Add 1'}
                        >
                          <Plus />
                        </button>
                      </div>

                      <div className={styles.itemTotal}>{formatCurrency(lineTotal)}</div>

                      <button
                        className={styles.removeButton}
                        onClick={() => onRemoveItem(item.productId)}
                        title="Remove item"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <footer className={styles.footer}>
          <div className={styles.summary}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalValue}>{formatCurrency(totals.amount)}</span>
          </div>

          <div className={styles.actions}>
            <button className={styles.secondaryButton} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              className={styles.primaryButton}
              onClick={checkoutCart}
              disabled={loading || cart.length === 0}
            >
              {loading ? <Loader2 className={styles.spinner} /> : <ShoppingCart />}
              {loading ? 'Processing...' : 'Checkout'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

async function safeErrorMessage(res: Response) {
  try {
    const data = await res.json();
    return (data && (data.message || data.error)) || '';
  } catch {
    try {
      return await res.text();
    } catch {
      return '';
    }
  }
}