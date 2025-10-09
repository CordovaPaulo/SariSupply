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
import ExcelJS from 'exceljs';
import PageLoader from '../../components/PageLoader/PageLoader';
import NavBar from '../../components/NavBar/NavBar';
import LogoutConfirmation from '@/components/logoutConfirmation/logout';
import ThemeToggle from '@/components/theme/ThemeToggle';

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

  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

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
      
      // Use display status for filtering
      const displayStatus = determineProductStatus(product.quantity, product.status);
      const matchesStatus = selectedStatus === '' || displayStatus === selectedStatus;
      
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

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedStatus('');
  };

  // Add this function to calculate totals for filtered products
  const calculateFilteredTotals = () => {
    const totalProducts = filteredProducts.length;
    const totalValue = filteredProducts.reduce((sum, product) => sum + (product.price * product.quantity), 0);
    return { totalProducts, totalValue };
  };

  // Replace the handleExport function with this styled version:
  const handleExport = async () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const filename = `inventory_report_${timestamp}`;
    
    const totals = calculateFilteredTotals();
    
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory Report');

    // Set column widths
    worksheet.columns = [
      { width: 50 },   // No.
      { width: 25 },  // Product Name
      { width: 40 },  // Description
      { width: 18 },  // Category
      { width: 12 },  // Quantity
      { width: 15 },  // Unit Price
      { width: 18 },  // Total Value
      { width: 18 },  // Status
      { width: 15 },  // Stock Level
      { width: 18 }   // Created Date
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
    subtitleRow.getCell(1).value = 'PRODUCT INVENTORY REPORT';
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
      ['Total Products:', totals.totalProducts.toString()],
      ['Total Inventory Value:', formatCurrency(totals.totalValue)]
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

    currentRow += 2; // Add space

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
      ['Category Filter:', selectedCategory ? formatCategoryName(selectedCategory as ProductCategory) : 'All Categories'],
      ['Status Filter:', selectedStatus ? formatStatusName(selectedStatus as ProductStatus) : 'All Status']
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

    currentRow += 2; // Add space

    // Add table headers
    const headers = [
      'No.', 'Product Name', 'Description', 'Category', 'Quantity', 
      'Unit Price', 'Total Value', 'Status', 'Stock Level', 'Created Date'
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
      let stockLevel = 'Normal';
      
      if (product.quantity === 0) {
        stockLevel = 'Out of Stock';
      } else if (product.quantity <= 5) {
        stockLevel = 'Critical';
      } else if (product.quantity <= 10) {
        stockLevel = 'Low';
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
        
        // Base style
        let cellStyle: any = {
          fill: { 
            type: 'pattern', 
            pattern: 'solid', 
            fgColor: { argb: isEvenRow ? 'FFF8F9FA' : 'FFFFFFFF' } 
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

        // Currency formatting for price columns
        if (col === 6 || col === 7) {
          cellStyle.numFmt = '"₱"#,##0.00';
        }

        // Highlight critical stock levels (quantity column)
        if (col === 5) {
          if (product.quantity === 0) {
            cellStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
            cellStyle.font = { color: { argb: 'FFC62828' }, bold: true };
          } else if (product.quantity <= 5) {
            cellStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
            cellStyle.font = { color: { argb: 'FFF57C00' }, bold: true };
          }
        }

        // Highlight status column
        if (col === 8) {
          if (displayStatus === ProductStatus.OUT_OF_STOCK) {
            cellStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCDD2' } };
            cellStyle.font = { color: { argb: 'FFD32F2F' }, bold: true };
          } else if (displayStatus === ProductStatus.LOW_STOCK) {
            cellStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };
            cellStyle.font = { color: { argb: 'FFF57C00' }, bold: true };
          } else {
            cellStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8E6C9' } };
            cellStyle.font = { color: { argb: 'FF388E3C' }, bold: true };
          }
        }

        cell.style = cellStyle;
      }
      
      currentRow++;
    });

    currentRow += 2; // Add space before summary

    // Add summary section
    const summaryTitle = worksheet.getRow(currentRow);
    summaryTitle.getCell(1).value = 'INVENTORY SUMMARY:';
    summaryTitle.getCell(1).style = {
      font: { bold: true, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } }
    };
    currentRow++;

    const summaryData = [
      ['Total Number of Products:', totals.totalProducts],
      ['Total Inventory Value:', totals.totalValue],
      ['', ''],
      ['STOCK LEVEL BREAKDOWN:', ''],
      ['In Stock:', filteredProducts.filter(p => p.quantity > 10).length],
      ['Low Stock (6-10):', filteredProducts.filter(p => p.quantity > 5 && p.quantity <= 10).length],
      ['Critical Stock (1-5):', filteredProducts.filter(p => p.quantity > 0 && p.quantity <= 5).length],
      ['Out of Stock:', filteredProducts.filter(p => p.quantity === 0).length]
    ];

    summaryData.forEach(([label, value]) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = label;
      row.getCell(2).value = value;
      
      if (label && label.toString().includes(':')) {
        row.getCell(1).style = {
          font: { bold: true, size: 11 },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } }
        };
        
        if (label === 'Total Inventory Value:') {
          row.getCell(2).style = {
            numFmt: '"₱"#,##0.00',
            font: { bold: true },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } }
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
    router.push('/');
  };

  const handleCancelLogout = () => setShowLogoutConfirmation(false);

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

        {/* Replace inline nav with component */}
        <NavBar
          active="inventory"
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
              Showing {startIndex + 1} - {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} items
              {(searchTerm || selectedCategory || selectedStatus) && (
                <span className={Style.filterInfo}> (filtered from {products.length} total)</span>
              )}
            </div>
          </div>

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
              {/* Wrap table and footer in a section */}
              <div className={Style.tableSection}>
                <div className={Style.tableContainer}>
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
                            <td className={Style.totalPriceCell}>
                              {formatCurrency(product.price)}
                            </td>
                            <td className={Style.priceCell}>
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
                </div>
                
                {/* Footer outside of scrollable container */}
                <div className={Style.tableFooter}>
                  <div className={Style.statisticsSummary}>
                    <div className={Style.statItem}>
                      <span className={Style.statLabel}>Total Products:</span>
                      <span className={Style.statValue}>{stats.totalItems}</span>
                    </div>
                    <div className={Style.statItem}>
                      <span className={Style.statLabel}>Total Value:</span>
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
            </>
          )}
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
      <LogoutConfirmation
        isOpen={showLogoutConfirmation}
        onCancel={handleCancelLogout}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
}