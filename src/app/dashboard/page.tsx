'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductResponse, ProductStatus } from '../../models/product';
import AddProductPopup from '../../components/AddProductPopup/AddProductPopup';
import Style from './page.module.css';
import { Store, Package, Warehouse, ChartColumnDecreasing, Archive, Clock, LayoutDashboard, PackageOpen } from 'lucide-react';
import PageLoader from '../../components/PageLoader/PageLoader';
import NavBar from '../../components/NavBar/NavBar';
import LogoutConfirmation from '@/components/logoutConfirmation/logout';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { toast } from 'react-toastify';
 
interface DashboardStats {
  totalItems: number;
  totalValue: number;
  lowStocks: number;
  archivedProducts: number;
}

export default function DashboardPage() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [recentProducts, setRecentProducts] = useState<ProductResponse[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    totalValue: 0,
    lowStocks: 0,
    archivedProducts: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);


  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const checkAuthentication = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      toast.error('You need to log in first');
      router.replace('/');
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('API Response:', responseData);
        
        setUser(responseData.user);
        setIsAuthenticated(true);
        // toast.success('Welcome back!');
      } else {
        localStorage.removeItem('token');
        toast.error('Session expired. Please log in again.');
        setLoading(false);
        router.replace('/');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      setLoading(false);
      router.replace('/');
      toast.error('Network error. Please log in again.');
    }
  };

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch('/api/main/view/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('API Response data:', responseData);
        
        const productsArray = Array.isArray(responseData.data) ? responseData.data : [];
        
        setProducts(productsArray);
        calculateStats(productsArray);
        toast.success('Products loaded successfully');
        
        const activeProducts = productsArray.filter((product: ProductResponse) => 
          product.status !== ProductStatus.DISCONTINUED
        );
        
        // Fix: Add explicit typing to sort function parameters
        const sortedActiveProducts = activeProducts
          .sort((a: ProductResponse, b: ProductResponse) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 5);
        
        setRecentProducts(sortedActiveProducts);
      } else {
        setError('Failed to load products');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (products: ProductResponse[]) => {
    if (!Array.isArray(products)) {
      console.error('calculateStats called with non-array:', products);
      return;
    }

    const stats = products.reduce((acc: DashboardStats, product: ProductResponse) => {
      if (product.status !== ProductStatus.DISCONTINUED) {
        acc.totalItems += 1; 
        acc.totalValue += product.price * product.quantity;
      }
      
      if (product.status === ProductStatus.OUT_OF_STOCK || 
          product.status === ProductStatus.LOW_STOCK || 
          (product.quantity > 0 && product.quantity <= 10 && product.status === ProductStatus.IN_STOCK)) {
        acc.lowStocks += 1;
      }
      
      if (product.status === ProductStatus.DISCONTINUED) {
        acc.archivedProducts += 1;
      }
      
      return acc;
    }, {
      totalItems: 0,
      totalValue: 0,
      lowStocks: 0,
      archivedProducts: 0
    });

    setStats(stats);
  };

  // Add the determineProductStatus function (same as inventory page)
  const determineProductStatus = (quantity: number, currentStatus: ProductStatus): ProductStatus => {
    // Don't change status if it's manually set to discontinued
    if (currentStatus === ProductStatus.DISCONTINUED) {
      return ProductStatus.DISCONTINUED;
    }
    
    if (quantity === 0) {
      return ProductStatus.OUT_OF_STOCK;
    } else if (quantity <= 5) {  // Critical low stock
      return ProductStatus.LOW_STOCK;
    } else if (quantity <= 10) { // Warning low stock
      return ProductStatus.LOW_STOCK;
    } else {
      return ProductStatus.IN_STOCK;
    }
  };

  const handleNavigation = (path: string) => {
    router.replace(path);
  };

  const handleAddProduct = () => {
    setShowAddPopup(true);
  };

  const handleClosePopup = () => {
    setShowAddPopup(false);
  };

  const handleProductAdded = () => {
    loadData();
  };

  const handleLogout = () => {
    setShowLogoutConfirmation(true);
  };

  const handleConfirmLogout = () => {
    localStorage.removeItem('token');
    setShowLogoutConfirmation(false);
    router.replace('/');
  };

  const handleCancelLogout = () => setShowLogoutConfirmation(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Add formatStatusName function (same as inventory page)
  const formatStatusName = (status: ProductStatus): string => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return <PageLoader message="Loading dashboard..." />;
  }

  return (
    <div className={Style.dashboard}>
      <header className={Style.header}>
        <div className={Style.headerLeft}>
          <Store className={Style.storeIcon} />
          <div className={Style.headerName}>
            <h1 className={Style.logo}>{user?.username || user?.email || 'Loading...'}</h1> 
            <p>Dashboard</p>
          </div>
        </div>

        {/* Replace inline nav with component */}
        <NavBar
          active="dashboard"
          // archivedCount={stats.archivedProducts}
          classes={{ nav: Style.nav, navButton: Style.navButton, navIcon: Style.navIcon, active: Style.active }}
        />

        <div className={Style.headerRight}>
          <ThemeToggle />
          <button 
            className={Style.addButton}
            onClick={handleAddProduct}
          >
            + Add Product
          </button>
          <div className={Style.userSection}>
            <button 
              className={Style.logoutButton}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className={Style.main}>
        {/* Stats Cards */}
        <section className={Style.statsSection}>
          <div className={Style.statsGrid}>
            <div className={`${Style.statCard} ${Style.totalItems}`}>
              <div className={Style.statContent}>
                <div className={Style.statInfoContainer}>
                  <h3 className={Style.statValue}>{stats.totalItems}</h3>
                  <p className={Style.statLabel}>Total Items</p>
                </div>
                <Package className={Style.statIcon} />
              </div>
            </div>

            <div className={`${Style.statCard} ${Style.totalValue}`}>
              <div className={Style.statContent}>
                <div className={Style.statInfoContainer}>
                  <h3 className={Style.statValue}>{formatCurrency(stats.totalValue)}</h3>
                  <p className={Style.statLabel}>Total Value</p>
                </div>
                <Warehouse className={Style.statIcon} />
              </div>
            </div>

            <div className={`${Style.statCard} ${Style.lowStocks}`}>
              <div className={Style.statContent}>
                <div className={Style.statInfoContainer}>
                  <h3 className={Style.statValue}>{stats.lowStocks}</h3>
                  <p className={Style.statLabel}>Low Stocks</p>
                </div>
                <ChartColumnDecreasing className={Style.statIcon} />
              </div>
            </div>

            <div className={`${Style.statCard} ${Style.archived}`}>
              <div className={Style.statContent}>
                <div className={Style.statInfoContainer}>
                  <h3 className={Style.statValue}>{stats.archivedProducts}</h3>
                  <p className={Style.statLabel}>Archived Products</p>
                </div>
                <Archive className={Style.statIcon} />
              </div>
            </div>
          </div>
        </section>

        <section className={Style.recentSection}>
          <div className={Style.sectionHeader}>
            <Clock className={Style.clockIcon} />
            <h2>Recently Added Active Items</h2>
            <button 
              className={Style.viewAllButton}
              onClick={() => handleNavigation('/inventory')}
            >
              View All
            </button>
          </div>

          <div className={Style.tableContainer}>
            {recentProducts.length === 0 ? (
              <div className={Style.emptyState}>
                <p>No active products found</p>
                <p>
                  Discontinued products are not shown here
                </p>
                <button 
                  className={Style.addFirstButton}
                  onClick={handleAddProduct}
                >
                  Add Your First Product
                </button>
              </div>
            ) : (
              <table className={Style.table}>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Price</th>  
                    <th>Status</th>
                    <th>Date Added</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProducts.map((product) => {
                    // Apply the same status determination logic as inventory page
                    const displayStatus = determineProductStatus(product.quantity, product.status);
                    const isLowStock = displayStatus === ProductStatus.LOW_STOCK;
                    
                    return (
                      <tr key={product._id} className={isLowStock ? Style.lowStockRow : ''}>
                        <td>
                          <div className={Style.productCell}>
                            <strong>{product.name}</strong>
                            <span className={Style.productDescription}>
                              {product.description}
                            </span>
                          </div>
                        </td>
                        <td className={isLowStock ? Style.lowStockQuantity : ''}>
                          {product.quantity}
                          {product.quantity <= 5 && product.quantity > 0 && (
                            <span className={Style.criticalStock}> (Critical!)</span>
                          )}
                        </td>
                        <td className={Style.priceCell}>
                          {formatCurrency(product.price)}
                        </td>
                        <td>
                          <span className={`${Style.statusBadge} ${Style[displayStatus.toLowerCase()]}`}>
                            {formatStatusName(displayStatus)}
                          </span>
                        </td>
                        <td className={Style.dateCell}>
                          {formatDate(product.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      <AddProductPopup
        isOpen={showAddPopup}
        onClose={handleClosePopup}
        onProductAdded={handleProductAdded}
      />
      <LogoutConfirmation
        isOpen={showLogoutConfirmation}
        onCancel={handleCancelLogout}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
}