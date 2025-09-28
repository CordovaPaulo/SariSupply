'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductResponse, ProductStatus } from '../../models/product';
import AddProductPopup from '../../components/AddProductPopup/AddProductPopup';
import Style from './page.module.css';
import { Store, Package, Warehouse, ChartColumnDecreasing, Archive, Clock, LayoutDashboard, PackageOpen } from 'lucide-react';
import PageLoader from '../../components/PageLoader/PageLoader';
 
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
      setLoading(false); // Add this line
      router.push('/');
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
        console.log('API Response:', responseData); // Debug log
        
        // Access the user data from the nested structure
        setUser(responseData.user); // Changed from responseData to responseData.user
        setIsAuthenticated(true); // Add this line
      } else {
        localStorage.removeItem('token');
        setLoading(false); // Add this line
        router.push('/');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      setLoading(false); // Add this line
      router.push('/');
    }
  };

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/main/view/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('API Response data:', responseData); // Add this to debug
        
        const productsArray = Array.isArray(responseData.data) ? responseData.data : [];
        
        setProducts(productsArray);
        calculateStats(productsArray);
        setRecentProducts(productsArray.slice(0, 5));
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
    // Add safety check
    if (!Array.isArray(products)) {
      console.error('calculateStats called with non-array:', products);
      return;
    }

    const stats = products.reduce((acc, product) => {
      // Total items (count of active products, not quantity sum)
      if (product.status !== ProductStatus.DISCONTINUED) {
        acc.totalItems += 1; 
      }
      
      // Total value (price * quantity for each product)
      if (product.status !== ProductStatus.DISCONTINUED) {
        acc.totalValue += product.price * product.quantity;
      }
      
      // Low stocks (products with OUT_OF_STOCK status)
      if (product.status === ProductStatus.OUT_OF_STOCK) {
        acc.lowStocks += 1;
      }
      
      // Archived products (discontinued)
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

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleAddProduct = () => {
    setShowAddPopup(true);
  };

  const handleClosePopup = () => {
    setShowAddPopup(false);
  };

  const handleProductAdded = () => {
    loadData(); // Refresh data
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

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
            <p>Inventory Manager</p>
          </div>
        </div>
        <nav className={Style.nav}>
          <button 
            className={`${Style.navButton} ${Style.active}`}
            onClick={() => handleNavigation('/dashboard')}
          >
            <LayoutDashboard className={Style.navIcon} />
            Dashboard
          </button>
          <button 
            className={Style.navButton}
            onClick={() => handleNavigation('/inventory')}
          >
            <PackageOpen className={Style.navIcon} />
            Inventory
          </button>
          <button 
            className={Style.navButton}
            onClick={() => handleNavigation('/archive')}
          >
            <Archive className={Style.navIcon} />
            Archive
          </button>
        </nav>
        <div className={Style.headerRight}>
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

      {/* Main Content */}
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

        {/* Recent Items Table */}
        <section className={Style.recentSection}>
          <div className={Style.sectionHeader}>
            <Clock className={Style.clockIcon} />
            <h2>Recently Added Items</h2>
            {/* {error && (
              <div className={Style.errorMessage}>
                {error}
              </div>
            )} */}
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
                <p>No products found</p>
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
                  {recentProducts.map((product) => (
                    <tr key={product._id}>
                      <td>
                        <div className={Style.productCell}>
                          <strong>{product.name}</strong>
                          <span className={Style.productDescription}>
                            {product.description}
                          </span>
                        </div>
                      </td>
                      <td>{product.quantity}</td>
                      <td className={Style.priceCell}>
                        {formatCurrency(product.price)}
                      </td>
                      <td>
                        <span className={`${Style.statusBadge} ${Style[product.status.toLowerCase()]}`}>
                          {product.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {formatDate(product.createdAt)}
                      </td>
                    </tr>
                  ))}
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
    </div>
  );
}