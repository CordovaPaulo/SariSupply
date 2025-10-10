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
  const [amountPaid, setAmountPaid] = useState<string>(''); // added
  const [receipt, setReceipt] = useState<null | {
    transactionId: string;
    items: { name: string; unitPrice: number; quantity: number; subtotal: number }[];
    totals: { quantity: number; amount: number };
    payment: { amountPaid: number; change: number; currency?: string };
    createdAt?: string;
  }>(null); // added

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
        body: JSON.stringify({
          items: cart.map(i => ({ productId: i.productId, quantity: toInt(i.quantity) })),
          amountPaid: toMoney(amountPaid),
        }),
      });

      if (!res.ok) {
        const msg = await safeErrorMessage(res);
        throw new Error(msg || 'Checkout failed');
      }

      const data = await res.json();
      const receiptData = data?.data;
      onClearCart?.();
      setReceipt(receiptData || null); // show receipt
      // do not close immediately; let user view receipt
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const paidNum = toMoney(amountPaid);
  const changePreview = Math.max(0, paidNum - totals.amount);
  const canCheckout = cart.length > 0 && !loading && paidNum >= totals.amount;

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
            <>
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

              <div className={styles.paymentSection} style={{ marginTop: 12 }}>
                <label htmlFor="amountPaid" style={{ display: 'block', fontWeight: 600 }}>
                  Amount Paid
                </label>
                <input
                  id="amountPaid"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className={styles.input}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0.00"
                  onWheel={(e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLInputElement).blur(); // prevent scroll increment
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); // prevent arrow inc/dec
                  }}
                />
                <div style={{ marginTop: 6 }}>
                  Change: <strong>{formatCurrency(changePreview)}</strong>
                </div>
                {paidNum < totals.amount && (
                  <div className={styles.error} style={{ marginTop: 6 }}>
                    Amount paid must be at least {formatCurrency(totals.amount)}
                  </div>
                )}
              </div>
            </>
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
              disabled={!canCheckout}
              title={!canCheckout ? 'Enter sufficient payment amount' : 'Checkout'}
            >
              {loading ? <Loader2 className={styles.spinner} /> : <ShoppingCart />}
              {loading ? 'Processing...' : 'Checkout'}
            </button>
          </div>
        </footer>
      </div>

      {receipt && (
        <div className={styles.overlay} onClick={() => { setReceipt(null); onClose(); }}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className={styles.header}>
              <h2 id="receipt-title" className={styles.title}>Receipt</h2>
              <button className={styles.closeButton} onClick={() => { setReceipt(null); onClose(); }} aria-label="Close">
                <X />
              </button>
            </header>

            <section className={styles.body}>
              <div className={styles.receiptSection}>
                <div className={styles.receiptInfo}>
                  <div><strong>Transaction ID:</strong> {receipt.transactionId}</div>
                  {receipt.createdAt && (
                    <div><strong>Date:</strong> {new Date(receipt.createdAt).toLocaleString()}</div>
                  )}
                </div>

                <ul className={styles.receiptList} role="list">
                  {receipt.items.map((l, idx) => (
                    <li key={idx} className={styles.receiptItemRow}>
                      <div className={styles.receiptItemInfo}>
                        <div className={styles.receiptItemName}>{l.name}</div>
                        <div className={styles.receiptItemMeta}>
                          {l.quantity} x {formatCurrency(l.unitPrice)}
                        </div>
                      </div>
                      <div className={styles.receiptItemTotal}>{formatCurrency(l.subtotal)}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.receiptTotals}>
                <div className={styles.receiptTotalsRow}>
                  <span>Total</span>
                  <strong>{formatCurrency(receipt.totals.amount)}</strong>
                </div>
                <div className={styles.receiptTotalsRow}>
                  <span>Amount Paid</span>
                  <span>{formatCurrency(receipt.payment.amountPaid)}</span>
                </div>
                <div className={styles.receiptTotalsRow}>
                  <span>Change</span>
                  <span>{formatCurrency(receipt.payment.change)}</span>
                </div>
              </div>
            </section>

            <footer className={styles.footer}>
              <button className={styles.primaryButton} onClick={() => window.print()}>
                Print
              </button>
              <button className={styles.secondaryButton} onClick={() => { setReceipt(null); onClose(); }}>
                Close
              </button>
            </footer>
          </div>
        </div>
      )}
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