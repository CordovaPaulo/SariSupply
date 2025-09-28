'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductResponse, ProductStatus, ProductCategory } from '../../models/product';
import { Store, LayoutDashboard, PackageOpen, Archive, ChevronLeft, ChevronRight, ArchiveRestore, ChevronDown, Cookie, GlassWater, Bubbles, SquareUser, Backpack, CircleEllipsis } from 'lucide-react';
import AddProductPopup from '../../components/AddProductPopup/AddProductPopup';
import UnarchiveProductPopup from '../../components/UnarchiveProductPopup/UnarchiveProductPopup';
import Style from './page.module.css';
import ExcelJS from 'exceljs';
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

  // Custom dropdown state
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

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
      if (product.status === ProductStatus.DISCONTINUED) {
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

  // Calculate totals for filtered products
  const calculateFilteredTotals = () => {
    const totalProducts = filteredProducts.length;
    const totalValue = filteredProducts.reduce((sum, product) => sum + (product.price * product.quantity), 0);
    return { totalProducts, totalValue };
  };

  // Format currency function
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date function
  const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  };

  // Format category name function
  const formatCategoryName = (category: ProductCategory): string => {
    switch (category) {
      case ProductCategory.FOOD:
        return 'Food Products';
      case ProductCategory.BEVERAGE:
        return 'Beverages';
      case ProductCategory.CLEANING:
        return 'Cleaning Products';
      case ProductCategory.PERSONAL_CARE:
        return 'Personal Care';
      case ProductCategory.SCHOOL_SUPPLIES:
        return 'School Supplies';
      case ProductCategory.OTHER:
        return 'Other';
      default:
        return 'Unknown';
    }
  };

  // Format status name function
  const formatStatusName = (status: ProductStatus): string => {
    switch (status) {
      case ProductStatus.IN_STOCK:
        return 'In Stock';
      case ProductStatus.LOW_STOCK:
        return 'Low Stock';
      case ProductStatus.OUT_OF_STOCK:
        return 'Out of Stock';
      default:
        return 'Unknown';
    }
  };

  // Determine product status function
  const determineProductStatus = (quantity: number, status?: ProductStatus): ProductStatus => {
    if (quantity === 0) {
      return ProductStatus.OUT_OF_STOCK;
    } else if (quantity <= 10) {
      return ProductStatus.LOW_STOCK;
    } else {
      return ProductStatus.IN_STOCK;
    }
  };

  // Export functionality - only archived products
  const handleExport = async () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const filename = `archive_report_${timestamp}`;
    
    const totals = calculateFilteredTotals();
    
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Archive Report');

    // Set column widths
    worksheet.columns = [
      { width: 50 },  // No.
      { width: 25 },  // Product Name
      { width: 40 },  // Description
      { width: 18 },  // Category
      { width: 12 },  // Quantity
      { width: 15 },  // Unit Price
      { width: 18 },  // Total Value
      { width: 18 },  // Status
      { width: 15 },  // Stock Level
      { width: 18 }   // Archived Date
    ];

    let currentRow = 1;

    // Add title
    const titleRow = worksheet.getRow(currentRow);
    titleRow.getCell(1).value = 'INVENTORY MANAGEMENT SYSTEM';
    titleRow.getCell(1).style = {
      font: { bold: true, size: 16, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E4057' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thick', color: { argb: 'FF000000' } },
        left: { style: 'thick', color: { argb: 'FF000000' } },
        bottom: { style: 'thick', color: { argb: 'FF000000' } },
        right: { style: 'thick', color: { argb: 'FF000000' } }
      }
    };
    worksheet.mergeCells(currentRow, 1, currentRow, 10);
    titleRow.height = 30;
    currentRow++;

    // Add subtitle
    const subtitleRow = worksheet.getRow(currentRow);
    subtitleRow.getCell(1).value = 'ARCHIVED PRODUCTS REPORT';
    subtitleRow.getCell(1).style = {
      font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90A4' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'medium', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'medium', color: { argb: 'FF000000' } }
      }
    };
    worksheet.mergeCells(currentRow, 1, currentRow, 10);
    subtitleRow.height = 25;
    currentRow += 2;

    // Add report info
    const reportInfo = [
      ['Generated on:', currentTime],
      ['Generated by:', user?.username || user?.email || 'System'],
      ['Total Archived Products:', totals.totalProducts.toString()],
      ['Total Archived Value:', formatCurrency(totals.totalValue)]
    ];

    reportInfo.forEach(([label, value]) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = label;
      row.getCell(2).value = value;
      
      // Style the info rows
      row.getCell(1).style = {
        font: { bold: true, size: 11 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4F8' } },
        border: {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        }
      };
      row.getCell(2).style = {
        font: { size: 11 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4F8' } },
        border: {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        }
      };
      currentRow++;
    });

    currentRow += 2;

    // Filter criteria
    const filterRow = worksheet.getRow(currentRow);
    filterRow.getCell(1).value = 'FILTER CRITERIA:';
    filterRow.getCell(1).style = {
      font: { bold: true, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
    };
    currentRow++;

    const filterInfo = [
      ['Search Term:', searchTerm || 'None'],
      ['Category Filter:', selectedCategory ? formatCategoryName(selectedCategory as ProductCategory) : 'All Categories']
    ];

    filterInfo.forEach(([label, value]) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = label;
      row.getCell(2).value = value;
      row.getCell(1).style = {
        font: { italic: true, size: 10 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      };
      row.getCell(2).style = {
        font: { size: 10 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      };
      currentRow++;
    });

    currentRow += 2;

    // Add table headers
    const headers = [
      'No.', 'Product Name', 'Description', 'Category', 'Quantity', 
      'Unit Price', 'Total Value', 'Last Status', 'Stock Level', 'Archived Date'
    ];

    const headerRow = worksheet.getRow(currentRow);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.style = {
        font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thick', color: { argb: 'FF000000' } },
          left: { style: 'medium', color: { argb: 'FF000000' } },
          bottom: { style: 'thick', color: { argb: 'FF000000' } },
          right: { style: 'medium', color: { argb: 'FF000000' } }
        }
      };
    });
    headerRow.height = 20;
    currentRow++;

    // Add product data
    filteredProducts.forEach((product, index) => {
      const displayStatus = determineProductStatus(product.quantity, product.status);
      let stockLevel = 'Archived';
      
      if (product.quantity === 0) {
        stockLevel = 'Was Out of Stock';
      } else if (product.quantity <= 5) {
        stockLevel = 'Was Critical';
      } else if (product.quantity <= 10) {
        stockLevel = 'Was Low Stock';
      } else {
        stockLevel = 'Was Normal';
      }

      const row = worksheet.getRow(currentRow);
      const isEvenRow = index % 2 === 0;
      
      // Set cell values
      row.getCell(1).value = index + 1;
      row.getCell(2).value = product.name;
      row.getCell(3).value = product.description;
      row.getCell(4).value = formatCategoryName(product.category);
      row.getCell(5).value = product.quantity;
      row.getCell(6).value = product.price;
      row.getCell(7).value = product.price * product.quantity;
      row.getCell(8).value = formatStatusName(displayStatus);
      row.getCell(9).value = stockLevel;
      row.getCell(10).value = formatDate(product.createdAt || new Date());

      // Apply styles to each cell
      for (let col = 1; col <= 10; col++) {
        const cell = row.getCell(col);
        
        let cellStyle: any = {
          fill: { 
            type: 'pattern', 
            pattern: 'solid', 
            fgColor: { argb: isEvenRow ? 'FFFAF8F3' : 'FFFFF9F0' }
          },
          alignment: { 
            horizontal: col === 2 || col === 3 ? 'left' : 'center',
            vertical: 'middle'
          },
          border: {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
          }
        };

        if (col === 6 || col === 7) {
          cellStyle.numFmt = '"₱"#,##0.00';
        }

        if (col === 5) {
          if (product.quantity === 0) {
            cellStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E1' } };
            cellStyle.font = { color: { argb: 'FFA0522D' }, italic: true };
          } else if (product.quantity <= 5) {
            cellStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8DC' } };
            cellStyle.font = { color: { argb: 'FFB8860B' }, italic: true };
          }
        }

        if (col === 8) {
          cellStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
          cellStyle.font = { color: { argb: 'FF696969' }, italic: true };
        }

        if (col === 9) {
          cellStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE7F6' } };
          cellStyle.font = { color: { argb: 'FF7B1FA2' }, italic: true };
        }

        cell.style = cellStyle;
      }
      
      currentRow++;
    });

    currentRow += 2;

    // Add summary section
    const summaryTitle = worksheet.getRow(currentRow);
    summaryTitle.getCell(1).value = 'ARCHIVE SUMMARY:';
    summaryTitle.getCell(1).style = {
      font: { bold: true, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE7F6' } }
    };
    currentRow++;

    const summaryData = [
      ['Total Archived Products:', totals.totalProducts],
      ['Total Archived Value:', totals.totalValue],
      ['', ''],
      ['ARCHIVED STOCK LEVELS:', ''],
      ['Normal Stock When Archived:', filteredProducts.filter(p => p.quantity > 10).length],
      ['Low Stock When Archived (6-10):', filteredProducts.filter(p => p.quantity > 5 && p.quantity <= 10).length],
      ['Critical Stock When Archived (1-5):', filteredProducts.filter(p => p.quantity > 0 && p.quantity <= 5).length],
      ['Out of Stock When Archived:', filteredProducts.filter(p => p.quantity === 0).length]
    ];

    summaryData.forEach(([label, value]) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = label;
      row.getCell(2).value = value;
      
      if (label && label.toString().includes(':')) {
        row.getCell(1).style = {
          font: { bold: true, size: 11 },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE7F6' } }
        };
        
        if (label === 'Total Archived Value:') {
          row.getCell(2).style = {
            numFmt: '"₱"#,##0.00',
            font: { bold: true },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE7F6' } }
          };
        }
      }
      currentRow++;
    });

    // Save the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.xlsx`;
    link.click();
    
    window.URL.revokeObjectURL(url);
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

  // Add click outside handler
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

          {/* Custom Category Dropdown */}
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

          <button 
            className={Style.clearFiltersButton} 
            onClick={clearFilters}
            disabled={!searchTerm && !selectedCategory}
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
              Showing {startIndex + 1} - {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} archived items
              {(searchTerm || selectedCategory) && (
                <span className={Style.filterInfo}> (filtered from {stats.archivedProducts} total archived)</span>
              )}
            </div>
          </div>

          {/* Wrap table and footer in a section */}
          <div className={Style.tableSection}>
            <div className={Style.tableContainer}>
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
                      <td className={Style.totalPriceCell}>
                        {formatCurrency(product.price)}
                      </td>
                      <td className={Style.priceCell}>
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
            </div>
            
            {/* Footer outside of scrollable container */}
            <div className={Style.tableFooter}>
              <div className={Style.statisticsSummary}>
                <div className={Style.statItem}>
                  <span className={Style.statLabel}>Total Archived Products:</span>
                  <span className={Style.statValue}>{stats.archivedProducts}</span>
                </div>
                <div className={Style.statItem}>
                  <span className={Style.statLabel}>Total Archived Value:</span>
                  <span className={Style.statValue}>{formatCurrency(stats.totalValue)}</span>
                </div>
                {(searchTerm || selectedCategory) && (
                  <div className={Style.statNote}>
                    * Statistics based on filtered results
                  </div>
                )}
              </div>
            </div>
          </div>

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