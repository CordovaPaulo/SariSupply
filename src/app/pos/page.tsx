'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductCategory } from '../../models/product';
import {
  Store,
  ShoppingCart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cookie,
  GlassWater,
  Bubbles,
  SquareUser,
  Backpack,
  CircleEllipsis,
  Minus, // added
} from 'lucide-react';
import Style from './page.module.css';
import PageLoader from '@/components/PageLoader/PageLoader';
import NavBar from '@/components/NavBar/NavBar';
import CheckoutPopup from '@/components/checkoutPopup/checkoutPopup';

type Nullable<T> = T | null;

type User = {
  username?: string;
  email?: string;
} | null;

interface BackendProduct {
  _id?: string;
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
  category?: ProductCategory;
  description?: string;
  // ...other possible backend fields...
}

interface ProductCart {
  _id: string;
  name: string;
  price: number;
  category: ProductCategory;
  description?: string;
  stock: number; // max quantity available
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxQuantity: number; // enforce limit in cart too
}

export default function POSPage() {
  const [products, setProducts] = useState<ProductCart[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductCart[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'' | ProductCategory>('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const [user, setUser] = useState<User>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Cart + checkout
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckoutPopup, setShowCheckoutPopup] = useState(false);

  const router = useRouter();

  const itemsPerPage = 7;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    checkAuthentication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(`.${Style.customSelect}`)) {
        setShowCategoryDropdown(false);
      }
    };

    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCategoryDropdown]);

  // Reset pagination when filtered list size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProducts.length]);

  // Filtering (search + category only; no status filtering)
  useEffect(() => {
    const filtered = products.filter(product => {
      const matchesSearch =
        searchTerm === '' ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description ?? '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === '' || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory]);

  const checkAuthentication = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setLoading(false);
      router.push('/');
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const responseData = await response.json();
        setUser(responseData.user ?? null);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('token');
        setLoading(false);
        router.push('/');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('token');
      setLoading(false);
      router.push('/');
    }
  };

  const safeInt = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  };

  // derive stock from multiple possible backend fields
  const deriveStock = (p: BackendProduct): number => {
    const candidates = [
      (p as any).stock,
      p.quantity,
      (p as any).qty,
      (p as any).available,
      (p as any).availableQty,
    ];
    for (const c of candidates) {
      const n = safeInt(c);
      if (n > 0) return n;
    }
    return 0;
  };

  const mapToProductCart = (p: BackendProduct): ProductCart => ({
    _id: String(p._id ?? p.id ?? crypto.randomUUID()),
    name: String(p.name ?? ''),
    price: Number(p.price ?? 0),
    category: (p.category as ProductCategory) ?? ProductCategory.CLEANING, // fallback to a valid enum
    description: p.description ? String(p.description) : undefined,
    stock: deriveStock(p),
  });

  const loadData = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/main/view/', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const responseData = await response.json();
        const productsArray = Array.isArray(responseData.data)
          ? (responseData.data as BackendProduct[]).map(mapToProductCart)
          : [];
        setProducts(productsArray);
        setFilteredProducts(productsArray);
      } else {
        setError('Failed to load products');
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
  };

  const handlePreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const handlePageClick = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  // Add to cart with max limit check (NaN-safe)
  const addToCart = (product: ProductCart, qty = 1) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === product._id);
      const max = safeInt(product.stock);
      const addQty = Math.max(1, safeInt(qty));

      if (idx >= 0) {
        const current = prev[idx];
        const currentQty = safeInt(current.quantity);
        if (currentQty >= max) return prev;
        const nextQty = Math.min(currentQty + addQty, max);
        const next = [...prev];
        next[idx] = { ...current, quantity: nextQty, maxQuantity: safeInt(current.maxQuantity ?? max) };
        return next;
      }

      if (max <= 0) return prev; // no stock available
      const initialQty = Math.min(addQty, max);
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          price: Number(product.price) || 0,
          quantity: initialQty,
          maxQuantity: max,
        },
      ];
    });
  };

  // Decrement 1 from cart (NaN-safe)
  const decrementCartItem = (productId: string) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === productId);
      if (idx === -1) return prev;
      const next = [...prev];
      const qty = safeInt(next[idx].quantity) - 1;
      if (qty <= 0) next.splice(idx, 1);
      else next[idx] = { ...next[idx], quantity: qty };
      return next;
    });
  };

  // Increment 1 with max limit check (NaN-safe)
  const incrementCartItem = (productId: string) => {
    setCart(prev =>
      prev.map(i => {
        if (i.productId !== productId) return i;
        const current = safeInt(i.quantity);
        const max = safeInt(i.maxQuantity);
        return { ...i, quantity: Math.min(current + 1, max) };
      })
    );
  };

  const removeCartItem = (productId: string) =>
    setCart(prev => prev.filter(i => i.productId !== productId));

  const clearCart = () => setCart([]);

  const openCheckout = () => setShowCheckoutPopup(true);
  const closeCheckout = () => setShowCheckoutPopup(false);

  const formatCategoryName = (category: ProductCategory): string =>
    category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const getCategoryIcon = (category: ProductCategory | string) => {
    switch (category) {
      case ProductCategory.FOOD:
        return <Cookie className={Style.categoryIcon} />;
      case ProductCategory.BEVERAGE:
        return <GlassWater className={Style.categoryIcon} />;
      case ProductCategory.CLEANING:
        return <Bubbles className={Style.categoryIcon} />;
      case ProductCategory.PERSONAL_CARE:
        return <SquareUser className={Style.categoryIcon} />;
      case ProductCategory.SCHOOL_SUPPLIES:
        return <Backpack className={Style.categoryIcon} />;
      case ProductCategory.OTHER:
        return <CircleEllipsis className={Style.categoryIcon} />;
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 2,
    }).format(amount);

  if (loading) {
    return <PageLoader message="Loading inventory..." />;
  }

  if (error) {
    return (
      <div className={Style.errorContainer}>
        <div className={Style.error}>
          <h2>Error Loading Inventory</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={Style.dashboard}>
        <header className={Style.header}>
          <div className={Style.headerLeft}>
            <Store className={Style.storeIcon} />
            <div className={Style.headerName}>
              <h1 className={Style.logo}>{user?.username || user?.email || 'Loading...'}</h1>
              <p>Point of Sale</p>
            </div>
          </div>

          <NavBar
            active="pos"
            classes={{ nav: Style.nav, navButton: Style.navButton, navIcon: Style.navIcon, active: Style.active }}
          />

          <div className={Style.headerRight}>
            <button className={Style.checkoutButton} onClick={openCheckout} disabled={cart.length === 0}>
              <ShoppingCart />
              Checkout {cartCount > 0 ? `(${cartCount})` : ''}
            </button>
            <button className={Style.logoutButton} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className={Style.main}>
          <section className={Style.dataFilters}>
            <div className={Style.searchBar}>
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>

            <div className={Style.categoryFilters}>
              <div className={Style.customSelect}>
                <button
                  className={Style.selectButton}
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  type="button"
                >
                  <div className={Style.selectButtonContent}>
                    {selectedCategory ? (
                      <>
                        {getCategoryIcon(selectedCategory)}
                        {formatCategoryName(selectedCategory)}
                      </>
                    ) : (
                      'All Categories'
                    )}
                  </div>
                  <ChevronDown className={`${Style.dropdownArrow} ${showCategoryDropdown ? Style.open : ''}`} />
                </button>

                {showCategoryDropdown && (
                  <div className={Style.dropdownList}>
                    <div
                      className={`${Style.dropdownOption} ${!selectedCategory ? Style.selected : ''}`}
                      onClick={() => {
                        setSelectedCategory('');
                        setShowCategoryDropdown(false);
                      }}
                    >
                      All Categories
                    </div>

                    {(Object.values(ProductCategory) as ProductCategory[]).map(category => (
                      <div
                        key={category}
                        className={`${Style.dropdownOption} ${selectedCategory === category ? Style.selected : ''}`}
                        onClick={() => {
                          setSelectedCategory(category);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        {getCategoryIcon(category)}
                        {formatCategoryName(category)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              className={Style.clearFiltersButton}
              onClick={clearFilters}
              disabled={!searchTerm && !selectedCategory}
            >
              Clear Filters
            </button>
          </section>

          <section className={Style.tableSection}>
            <div className={Style.tableContainer}>
              <table className={Style.table}>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th style={{ width: 220 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={Style.emptyCell}>
                        No products found
                      </td>
                    </tr>
                  ) : (
                    currentProducts.map(product => {
                      const qtyInCart = cart.find(i => i.productId === product._id)?.quantity ?? 0;
                      return (
                        <tr key={product._id}>
                          <td>
                            <div className={Style.productCell}>
                              <strong>{product.name}</strong>
                              {product.description && (
                                <p className={Style.productDescription}>{product.description}</p>
                              )}
                            </div>
                          </td>
                          <td>{formatCategoryName(product.category)}</td>
                          <td>{formatCurrency(product.price)}</td>
                          <td className={Style.actionCell}>
                            {(() => {
                              const inCart = cart.find(i => i.productId === product._id);
                              const qtyInCart = safeInt(inCart?.quantity ?? 0);
                              const maxQty = safeInt(inCart?.maxQuantity ?? product.stock);
                              const atMax = qtyInCart >= maxQty || maxQty <= 0;

                              return (
                                <>
                                  <button
                                    className={Style.removeFromCartButton}
                                    onClick={() => decrementCartItem(product._id)}
                                    disabled={qtyInCart === 0}
                                    title={qtyInCart === 0 ? 'Not in cart' : `Remove 1 ${product.name}`}
                                  >
                                    <Minus />
                                    Remove 1
                                  </button>
                                  <button
                                    className={Style.addToCartButton}
                                    onClick={() => addToCart(product, 1)}
                                    disabled={atMax}
                                    title={atMax ? 'Max quantity reached' : `Add ${product.name} to cart`}
                                  >
                                    <ShoppingCart />
                                    Add to Cart
                                  </button>
                                </>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={Style.paginationContainer}>
                <button
                  className={Style.paginationButton}
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className={Style.paginationIcon} />
                  Previous
                </button>

                <div className={Style.pageNumbers}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNumber}
                        className={`${Style.pageNumber} ${currentPage === pageNumber ? Style.activePage : ''}`}
                        onClick={() => handlePageClick(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>

                <button
                  className={Style.paginationButton}
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className={Style.paginationIcon} />
                </button>
              </div>
            )}
          </section>
        </main>

        <CheckoutPopup
          isOpen={showCheckoutPopup}
          onClose={closeCheckout}
          cart={cart}
          onRemoveItem={removeCartItem}
          onDecrementItem={decrementCartItem}
          onIncrementItem={incrementCartItem}
          onClearCart={clearCart}
        />
      </div>
    </>
  );
}