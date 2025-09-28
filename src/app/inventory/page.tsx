'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductResponse, ProductStatus, ProductCategory } from '../../models/product';
import AddProductPopup from '../../components/AddProductPopup/AddProductPopup';
import ArchiveProductPopup from '../../components/ArchiveProductPopup/ArchiveProductPopup';
import EditProductPopup from '../../components/EditProductPopup/EditProductPopup';
import ViewProductPopup from '../../components/ViewProductPopup/ViewProductPopup';
import { CircleCheck, CircleAlert, CircleMinus, ChevronDown, Cookie, GlassWater, Bubbles, SquareUser, Backpack, CircleEllipsis, Store, LayoutDashboard, PackageOpen, Archive, ChevronLeft, ChevronRight, Pencil, Eye, Search } from 'lucide-react';
import Style from './page.module.css';
import * as XLSX from 'xlsx';
import PageLoader from '../../components/PageLoader/PageLoader';

interface InventoryStats {
    totalItems: number;
    totalValue: number;
    lowStocks: number;
    archivedProducts: number;
}

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductResponse[]>([]);
  const [recentProducts, setRecentProducts] = useState<ProductResponse[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    totalValue: 0,
    lowStocks: 0,
    archivedProducts: 0,
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Archive popup states
  const [showArchivePopup, setShowArchivePopup] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null);

  // Edit popup states
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<ProductResponse | null>(null);

  // View popup states
  const [showViewPopup, setShowViewPopup] = useState(false);
  const [selectedProductForView, setSelectedProductForView] = useState<ProductResponse | null>(null);

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

  // Filter products whenever search term, category, or status changes
  useEffect(() => {
    let filtered = products.filter(product => {
      // Exclude discontinued products from the main table
      if (product.status === ProductStatus.DISCONTINUED) {
        return false;
      }

      const matchesSearch = searchTerm === '' || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === '' || product.category === selectedCategory;
      
      const matchesStatus = selectedStatus === '' || product.status === selectedStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory, selectedStatus]);

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
        setFilteredProducts(productsArray);
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
      
      // Count products with different statuses
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
    setRecentProducts(products.slice(0, 5));
  };

  // Filter handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedStatus('');
  };

  // Export functionality
  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `inventory_${timestamp}`;
    
    const headers = ['Product Name', 'Description', 'Category', 'Quantity', 'Price', 'Total Value', 'Status', 'Created Date'];
    
    const data = [
      headers,
      ...filteredProducts.map(product => [
        product.name,
        product.description,
        formatCategoryName(product.category),
        product.quantity,
        `₱${product.price.toFixed(2)}`, // Format as currency
        `₱${(product.price * product.quantity).toFixed(2)}`, // Format as currency
        formatStatusName(product.status),
        formatDate(product.createdAt || new Date())
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths for better readability
    worksheet['!cols'] = [
      { width: 25 }, // Product Name
      { width: 35 }, // Description
      { width: 18 }, // Category
      { width: 12 }, // Quantity
      { width: 15 }, // Price
      { width: 18 }, // Total Value
      { width: 18 }, // Status
      { width: 18 }  // Created Date
    ];

    // Style the header row
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:H1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellRef]) continue;
      worksheet[cellRef].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "D4E6F1" } },
        alignment: { horizontal: "center" }
      };
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    
    // Add metadata to the workbook
    workbook.Props = {
      Title: "Inventory Export",
      Subject: "Product Inventory Data",
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
    localStorage.removeItem('token');
    router.push('/');
  };
  
  // Archive product handlers
  const handleArchiveClick = (product: any) => { // Changed to any since it has _id instead of id
    console.log('Archive clicked for product:', product);
    
    // Use _id instead of id
    const productId = product._id;
    
    if (!productId) {
      console.error('Product _id is missing!');
      return;
    }

    setSelectedProduct({ 
      id: productId, // Pass _id as id
      name: product.name 
    });
    setShowArchivePopup(true);
  };

  const handleCloseArchivePopup = () => {
    setShowArchivePopup(false);
    setSelectedProduct(null);
  };

  const handleProductArchived = () => {
    // Reload the data to reflect changes
    loadData(); // Make sure this function exists
    setShowArchivePopup(false);
    setSelectedProduct(null);
  };

  // Edit product handlers
  const handleEditClick = (product: any) => {
    console.log('Edit clicked for product:', product);
    
    if (!product._id) {
      console.error('Product _id is missing!');
      return;
    }

    setSelectedProductForEdit(product);
    setShowEditPopup(true);
  };

  const handleCloseEditPopup = () => {
    setShowEditPopup(false);
    setSelectedProductForEdit(null);
  };

  const handleProductUpdated = () => {
    // Reload the data to reflect changes
    loadData();
    setShowEditPopup(false);
    setSelectedProductForEdit(null);
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

  const formatStatusName = (status: ProductStatus): string => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Add this function after your state declarations (around line 60):
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

  // Add this state for the custom dropdown
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Add this function to get category icon
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

  // Add this function to get status icon
  const getStatusIcon = (status: ProductStatus | string) => {
    switch (status) {
      case ProductStatus.IN_STOCK:
        return <CircleCheck className={`${Style.statusIcon} ${Style.inStock}`} />;
      case ProductStatus.LOW_STOCK:
        return <CircleAlert className={`${Style.statusIcon} ${Style.lowStock}`} />;
      case ProductStatus.OUT_OF_STOCK:
        return <CircleMinus className={`${Style.statusIcon} ${Style.outOfStock}`} />;
      default:
        return null;
    }
  };

  // Update the click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(`.${Style.customSelect}`)) {
        setShowCategoryDropdown(false);
        setShowStatusDropdown(false);
      }
    };

    if (showCategoryDropdown || showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCategoryDropdown, showStatusDropdown]);

  if (loading) {
    return <PageLoader message="Loading inventory..." />;
  }

  if (error) {
    return (
      <div className={Style.errorContainer}>
        <div className={Style.error}>
          <h2>Error Loading Inventory</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
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
            className={Style.navButton}
            onClick={() => handleNavigation('/dashboard')}
          >
            <LayoutDashboard className={Style.navIcon} />
            Dashboard
          </button>
          <button 
            className={`${Style.navButton} ${Style.active}`}
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

          {/* Custom Category Dropdown */}
          <div className={Style.categoryFilters}>
            <div className={Style.customSelect}>
              <button
                className={Style.selectButton}
                onClick={() => {
                  setShowCategoryDropdown(!showCategoryDropdown);
                  setShowStatusDropdown(false);
                }}
                type="button"
              >
                <div className={Style.selectButtonContent}>
                  {selectedCategory ? (
                    <>
                      {getCategoryIcon(selectedCategory as ProductCategory)}
                      {formatCategoryName(selectedCategory as ProductCategory)}
                    </>
                  ) : (
                    'All Categories'
                  )}
                </div>
                <ChevronDown 
                  className={`${Style.dropdownArrow} ${showCategoryDropdown ? Style.open : ''}`} 
                />
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
                  
                  {Object.values(ProductCategory).map((category) => (
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

          {/* Custom Status Dropdown */}
          <div className={Style.statusFilters}>
            <div className={Style.customSelect}>
              <button
                className={Style.selectButton}
                onClick={() => {
                  setShowStatusDropdown(!showStatusDropdown);
                  setShowCategoryDropdown(false);
                }}
                type="button"
              >
                <div className={Style.selectButtonContent}>
                  {selectedStatus ? (
                    <>
                      {getStatusIcon(selectedStatus as ProductStatus)}
                      {formatStatusName(selectedStatus as ProductStatus)}
                    </>
                  ) : (
                    'All Status'
                  )}
                </div>
                <ChevronDown 
                  className={`${Style.dropdownArrow} ${showStatusDropdown ? Style.open : ''}`} 
                />
              </button>
              
              {showStatusDropdown && (
                <div className={Style.dropdownList}>
                  <div
                    className={`${Style.dropdownOption} ${!selectedStatus ? Style.selected : ''}`}
                    onClick={() => {
                      setSelectedStatus('');
                      setShowStatusDropdown(false);
                    }}
                  >
                    All Status
                  </div>
                  
                  <div
                    className={`${Style.dropdownOption} ${selectedStatus === ProductStatus.IN_STOCK ? Style.selected : ''}`}
                    onClick={() => {
                      setSelectedStatus(ProductStatus.IN_STOCK);
                      setShowStatusDropdown(false);
                    }}
                  >
                    {getStatusIcon(ProductStatus.IN_STOCK)}
                    In Stock
                  </div>
                  
                  <div
                    className={`${Style.dropdownOption} ${selectedStatus === ProductStatus.LOW_STOCK ? Style.selected : ''}`}
                    onClick={() => {
                      setSelectedStatus(ProductStatus.LOW_STOCK);
                      setShowStatusDropdown(false);
                    }}
                  >
                    {getStatusIcon(ProductStatus.LOW_STOCK)}
                    Low Stock
                  </div>
                  
                  <div
                    className={`${Style.dropdownOption} ${selectedStatus === ProductStatus.OUT_OF_STOCK ? Style.selected : ''}`}
                    onClick={() => {
                      setSelectedStatus(ProductStatus.OUT_OF_STOCK);
                      setShowStatusDropdown(false);
                    }}
                  >
                    {getStatusIcon(ProductStatus.OUT_OF_STOCK)}
                    Out of Stock
                  </div>
                </div>
              )}
            </div>
          </div>

          <button 
            className={Style.clearFiltersButton} 
            onClick={clearFilters}
            disabled={!searchTerm && !selectedCategory && !selectedStatus}
          >
            Clear Filters
          </button>

          <button className={Style.exportButton} onClick={handleExport}>
            Export Data
          </button>
        </section>

        <section className={Style.recentSection}>
          <div className={Style.sectionHeader}>
            <div className={Style.paginationInfo}>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} items
              {(searchTerm || selectedCategory || selectedStatus) && (
                <span className={Style.filterInfo}> (filtered from {products.length} total)</span>
              )}
            </div>
          </div>

          <div className={Style.tableContainer}>
            {filteredProducts.length === 0 ? (
              <div className={Style.emptyState}>
                <p>
                  {products.length === 0 
                    ? 'No products found' 
                    : 'No products match your filters'
                  }
                </p>
                {(products.length === 0 || selectedCategory && !selectedStatus) ? (
                  <button 
                    className={Style.addFirstButton}
                    onClick={handleAddProduct}
                  >
                    {products.length === 0 ? 'Add Your First Product' : 'Add Product'}
                  </button>
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
                      <th>Category</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Total Value</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentProducts.map((product) => {
                      // Determine the actual status to display
                      const displayStatus = determineProductStatus(product.quantity, product.status);
                      const isLowStock = displayStatus === ProductStatus.LOW_STOCK;
                      
                      return (
                        <tr key={product._id} className={isLowStock ? Style.lowStockRow : ''}>
                          <td>
                            <div className={Style.productCell}>
                              <strong>{product.name}</strong>
                              <p className={Style.productDescription}>
                                {product.description}
                              </p>
                            </div>
                          </td>
                          <td>{formatCategoryName(product.category)}</td>
                          <td className={isLowStock ? Style.lowStockQuantity : ''}>
                            {product.quantity}
                            {product.quantity <= 5 && product.quantity > 0 && (
                              <span className={Style.criticalStock}> (Critical!)</span>
                            )}
                          </td>
                          <td className={Style.priceCell}>
                            {formatCurrency(product.price)}
                          </td>
                          <td className={Style.totalPriceCell}>
                            {formatCurrency(product.price * product.quantity)}
                          </td>
                          <td>
                            <span className={`${Style.statusBadge} ${Style[displayStatus.toLowerCase()]}`}>
                              {formatStatusName(displayStatus)}
                            </span>
                          </td>
                          <td className={Style.actionCell}>
                            <button className={`${Style.viewButton} ${Style.actionButton}`}
                              onClick={() => {
                                console.log('View button clicked, product:', product);
                                handleViewClick(product);
                              }}
                            >

                              <Eye/>
                            </button>
                            <button 
                              className={`${Style.editButton} ${Style.actionButton}`}
                              onClick={() => {
                                console.log('Edit button clicked, product:', product);
                                handleEditClick(product);
                              }}
                              title={`Edit ${product.name}`}
                            >
                              <Pencil/>
                            </button>
                            <button 
                              className={`${Style.archiveButton} ${Style.actionButton}`}
                              onClick={() => {
                                console.log('Button clicked, product:', product); // Debug log
                                handleArchiveClick(product);
                              }}
                              title={`Archive ${product.name}`}
                            >
                              <Archive/>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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

      {showArchivePopup && (
        <ArchiveProductPopup
          isOpen={showArchivePopup}
          onClose={handleCloseArchivePopup}
          product={selectedProduct}
          onProductArchived={handleProductArchived}
        />
      )}

      <EditProductPopup
        isOpen={showEditPopup}
        onClose={handleCloseEditPopup}
        onProductUpdated={handleProductUpdated}
        product={selectedProductForEdit}
      />

      <ViewProductPopup
        isOpen={showViewPopup}
        onClose={handleCloseViewPopup}
        product={selectedProductForView}
      />


    </div>
  );
}