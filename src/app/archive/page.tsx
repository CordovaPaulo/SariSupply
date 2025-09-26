'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductResponse, ProductStatus, ProductCategory } from '../../models/product';
import { Store, LayoutDashboard, PackageOpen, Archive, ChevronLeft, ChevronRight, Search, ArchiveRestore } from 'lucide-react';
import AddProductPopup from '../../components/AddProductPopup/AddProductPopup';
import UnarchiveProductPopup from '../../components/UnarchiveProductPopup/UnarchiveProductPopup';
import Style from './page.module.css';
import * as XLSX from 'xlsx';
import PageLoader from '../../components/PageLoader/PageLoader';

interface InventoryStats {
    totalItems: number;
    totalValue: number;
    lowStocks: number;
    archivedProducts: number;
}

export default function ArchivePage() { // Changed function name to ArchivePage
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductResponse[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    totalValue: 0,
    lowStocks: 0,
    archivedProducts: 0,
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Restore popup states
  const [showRestorePopup, setShowRestorePopup] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null);

  // View popup states
  const [showViewPopup, setShowViewPopup] = useState(false);
  const [selectedProductForView, setSelectedProductForView] = useState<ProductResponse | null>(null);

  // Add product popup state
  const [showAddPopup, setShowAddPopup] = useState(false);

  // Calculate pagination values using filtered products
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Reset to page 1 when products change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProducts.length]);

  // Filter products - ONLY show discontinued products
  useEffect(() => {
    let filtered = products.filter(product => {
      // ONLY include discontinued products in the archive table
      if (product.status !== ProductStatus.DISCONTINUED) {
        return false;
      }

      const matchesSearch = searchTerm === '' || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === '' || product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory]);

  const checkAuthentication = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
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
        console.log('API Response:', responseData);
        
        setUser(responseData.user);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('token');
        setLoading(false);
        router.push('/');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      setLoading(false);
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
        console.log('API Response data:', responseData);
        
        const productsArray = Array.isArray(responseData.data) ? responseData.data : [];
        
        setProducts(productsArray);
        calculateStats(productsArray);
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

    const stats = products.reduce((acc, product) => {
      if (product.status !== ProductStatus.DISCONTINUED) {
        acc.totalItems += 1; 
        acc.totalValue += product.price * product.quantity;
      }
      
      if (product.status === ProductStatus.OUT_OF_STOCK) {
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

  // Filter handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
  };

  // Export functionality - only archived products
  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `archived_products_${timestamp}`;
    
    const headers = ['Product Name', 'Description', 'Category', 'Quantity', 'Price', 'Total Value', 'Archived Date'];
    
    const data = [
      headers,
      ...filteredProducts.map(product => [
        product.name,
        product.description,
        formatCategoryName(product.category),
        product.quantity,
        `₱${product.price.toFixed(2)}`,
        `₱${(product.price * product.quantity).toFixed(2)}`,
        formatDate(product.createdAt || new Date())
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    worksheet['!cols'] = [
      { width: 25 }, { width: 35 }, { width: 18 }, { width: 12 }, 
      { width: 15 }, { width: 18 }, { width: 18 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Archived Products');
    
    workbook.Props = {
      Title: "Archived Products Export",
      Subject: "Archived Product Data",
      Author: user?.username || "Inventory System",
      CreatedDate: new Date()
    };
    
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePageClick = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleNavigation = (path: string) => {
    router.push(path);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };
  
  // Restore product handlers
  const handleRestoreClick = (product: any) => {
    console.log('Restore clicked for product:', product);
    
    const productId = product._id;
    
    if (!productId) {
      console.error('Product _id is missing!');
      return;
    }

    setSelectedProduct({ 
      id: productId,
      name: product.name 
    });
    setShowRestorePopup(true);
  };

  const handleCloseRestorePopup = () => {
    setShowRestorePopup(false);
    setSelectedProduct(null);
  };

  const handleProductRestored = () => {
    loadData();
    setShowRestorePopup(false);
    setSelectedProduct(null);
  };

  // View product handlers
  const handleViewClick = (product: any) => {
    console.log('View clicked for product:', product);
    
    if (!product._id) {
      console.error('Product _id is missing!');
      return;
    }

    setSelectedProductForView(product);
    setShowViewPopup(true);
  };

  const handleCloseViewPopup = () => {
    setShowViewPopup(false);
    setSelectedProductForView(null);
  };

  // Add product handlers
  const handleAddProduct = () => {
    setShowAddPopup(true);
  };

  const handleClosePopup = () => {
    setShowAddPopup(false);
  };

  const handleProductAdded = () => {
    // Reload the data to reflect changes
    loadData();
    setShowAddPopup(false);
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

  const formatCategoryName = (category: ProductCategory): string => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return <PageLoader message="Loading archived products..." />;
  }

  return (
    <div className={Style.dashboard}>
      <header className={Style.header}>
        <div className={Style.headerLeft}>
          <Store className={Style.storeIcon} />
          <div className={Style.headerName}>
            <h1 className={Style.logo}>{user?.username || user?.email || 'Loading...'}</h1> 
            <p>Archive Manager</p>
          </div>
        </div>
        <nav className={Style.nav}>
          <button 
            className={Style.navButton}
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
            className={`${Style.navButton} ${Style.active}`}
            onClick={() => handleNavigation('/archive')}
          >
            <Archive className={Style.navIcon} />
            Archive ({stats.archivedProducts})
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
    
      <main className={Style.main}>
        <section className={Style.dataFilters}>
          <div className={Style.searchBar}>
            <input 
              type="text" 
              placeholder="Search archived products..." 
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <div className={Style.categoryFilters}>
            <select
              id="category"
              name="category"
              value={selectedCategory}
              onChange={handleCategoryChange}
            >
              <option value="">All Categories</option>
              <option value={ProductCategory.FOOD}>
                {formatCategoryName(ProductCategory.FOOD)}
              </option>
              <option value={ProductCategory.BEVERAGE}>
                {formatCategoryName(ProductCategory.BEVERAGE)}
              </option>
              <option value={ProductCategory.CLEANING}>
                {formatCategoryName(ProductCategory.CLEANING)}
              </option>
              <option value={ProductCategory.PERSONAL_CARE}>
                {formatCategoryName(ProductCategory.PERSONAL_CARE)}
              </option>
              <option value={ProductCategory.SCHOOL_SUPPLIES}>
                {formatCategoryName(ProductCategory.SCHOOL_SUPPLIES)}
              </option>
              <option value={ProductCategory.OTHER}>
                {formatCategoryName(ProductCategory.OTHER)}
              </option>
            </select>
          </div>
          <button 
            className={Style.clearFiltersButton} 
            onClick={clearFilters}
            disabled={!searchTerm && !selectedCategory}
          >
            Clear Filters
          </button>
          <button className={Style.exportButton} onClick={handleExport}>
            Export Archived
          </button>
        </section>

        <section className={Style.recentSection}>
          <div className={Style.sectionHeader}>
            <div className={Style.paginationInfo}>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} archived items
              {(searchTerm || selectedCategory) && (
                <span className={Style.filterInfo}> (filtered from {stats.archivedProducts} total archived)</span>
              )}
            </div>
          </div>

          <div className={Style.tableContainer}>
            {filteredProducts.length === 0 ? (
              <div className={Style.emptyState}>
                <Archive className={Style.emptyIcon} size={48} />
                <p>
                  {stats.archivedProducts === 0 
                    ? 'No archived products found' 
                    : 'No archived products match your filters'
                  }
                </p>
                {stats.archivedProducts === 0 ? (
                  <p className={Style.emptySubtitle}>
                    Products that are archived will appear here
                  </p>
                ) : (
                  <button 
                    className={Style.clearFiltersButton}
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <table className={Style.table}>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Total Value</th>
                      <th>Archived Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentProducts.map((product) => (
                      <tr key={product._id}>
                        <td>
                          <div className={Style.productCell}>
                            <strong>{product.name}</strong>
                          </div>
                        </td>
                        <td>
                          <div className={Style.descriptionCell}>
                            {product.description}
                          </div>
                        </td>
                        <td>{formatCategoryName(product.category)}</td>
                        <td>{product.quantity}</td>
                        <td className={Style.priceCell}>
                          {formatCurrency(product.price)}
                        </td>
                        <td className={Style.totalPriceCell}>
                          {formatCurrency(product.price * product.quantity)}
                        </td>
                        <td>{formatDate(product.createdAt)}</td>
                        <td className={Style.actionCell}>
                          <button 
                            className={`${Style.viewButton} ${Style.actionButton}`}
                            onClick={() => handleRestoreClick(product)}
                            title={`Restore ${product.name}`}
                          >
                            <ArchiveRestore/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
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
              </>
            )}
          </div>
        </section>
      </main>

       <AddProductPopup
            isOpen={showAddPopup}
            onClose={handleClosePopup}
            onProductAdded={handleProductAdded}
        />

      <UnarchiveProductPopup
        isOpen={showRestorePopup}
        onClose={handleCloseRestorePopup}
        product={selectedProduct}
        onProductRestored={handleProductRestored}
      />

    </div>
  );
}