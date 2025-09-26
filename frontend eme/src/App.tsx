import React, { useState } from 'react';
import { Plus, Package, Home, Archive, Search, Edit, Trash2, RotateCcw, Download, Clock, Store } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Textarea } from './components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { toast } from 'sonner@2.0.3';

interface Item {
  id: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
  category: string;
  isArchived: boolean;
  createdAt: Date;
}

const CATEGORIES = [
  'Snacks',
  'Beverages', 
  'Household',
  'Personal Care',
  'Condiments',
  'Instant Foods',
  'School/Office Supplies',
  'Others'
];

const STATUS_OPTIONS = ['All', 'In Stock', 'Low Stock'] as const;

const INITIAL_ITEMS: Item[] = [
  { id: '1', name: 'Lucky Me Pancit Canton', description: 'Original flavor instant noodles', quantity: 25, price: 15, category: 'Instant Foods', isArchived: false, createdAt: new Date() },
  { id: '2', name: 'Coca Cola 355ml', description: 'Canned soft drink', quantity: 12, price: 25, category: 'Beverages', isArchived: false, createdAt: new Date() },
  { id: '3', name: 'Detergent Powder', description: 'Tide powder sachet', quantity: 8, price: 12, category: 'Household', isArchived: false, createdAt: new Date() },
  { id: '4', name: 'Piattos Cheese', description: 'Cheese flavored potato chips', quantity: 18, price: 20, category: 'Snacks', isArchived: false, createdAt: new Date() },
  { id: '5', name: 'Kopiko Coffee', description: 'Black coffee 3-in-1 sachet', quantity: 30, price: 8, category: 'Beverages', isArchived: false, createdAt: new Date() },
];

export default function App() {
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<typeof STATUS_OPTIONS[number]>('All');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Form state for adding/editing items
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: 0,
    price: 0,
    category: 'Snacks'
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      quantity: 0,
      price: 0,
      category: 'Snacks'
    });
  };

  const handleAddItem = () => {
    if (!formData.name || formData.quantity < 0) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }

    const newItem: Item = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      quantity: formData.quantity,
      price: formData.price,
      category: formData.category,
      isArchived: false,
      createdAt: new Date()
    };

    setItems(prev => [...prev, newItem]);
    resetForm();
    setIsAddDialogOpen(false);
    toast.success('Item added successfully!');
  };

  const handleEditItem = () => {
    if (!editingItem || !formData.name || formData.quantity < 0) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }

    setItems(prev => prev.map(item => 
      item.id === editingItem.id 
        ? { ...item, ...formData }
        : item
    ));
    
    setEditingItem(null);
    resetForm();
    setIsEditDialogOpen(false);
    toast.success('Item updated successfully!');
  };

  const handleArchiveItem = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isArchived: true } : item
    ));
    toast.success('Item archived successfully!');
  };

  const handleRestoreItem = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isArchived: false } : item
    ));
    toast.success('Item restored successfully!');
  };

  const openEditDialog = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      category: item.category
    });
    setIsEditDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const exportToCSV = (itemsToExport: Item[], filename: string) => {
    const headers = ['ID', 'Product Name', 'Description', 'Category', 'Quantity', 'Price (₱)', 'Total Value (₱)', 'Created Date'];
    const csvContent = [
      headers.join(','),
      ...itemsToExport.map(item => [
        item.id,
        `"${item.name}"`,
        `"${item.description}"`,
        item.category,
        item.quantity,
        item.price.toFixed(2),
        (item.quantity * item.price).toFixed(2),
        item.createdAt.toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${filename} exported successfully!`);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || 
                         (selectedStatus === 'Low Stock' && item.quantity <= 5) ||
                         (selectedStatus === 'In Stock' && item.quantity > 5);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const activeItems = filteredItems.filter(item => !item.isArchived);
  const archivedItems = filteredItems.filter(item => item.isArchived);
  
  const lowStockItems = activeItems.filter(item => item.quantity <= 5);
  const totalValue = activeItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  
  // Get recent items (last 5 items sorted by creation date)
  const recentItems = [...items]
    .filter(item => !item.isArchived)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);



  const SearchAndFilter = ({ showExport = false, itemsToExport = [], exportFilename = 'inventory.csv' }: { 
    showExport?: boolean; 
    itemsToExport?: Item[]; 
    exportFilename?: string;
  }) => (
    <div className="filter">
      <div className="filter-row">
        <div className="search">
          <Search className="search-icon" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="select-trigger">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="select-trigger">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showExport && itemsToExport.length > 0 && (
          <Button
            onClick={() => exportToCSV(itemsToExport, exportFilename)}
            className="btn-export"
          >
            <Download className="icon-sm mr-2" />
            Export CSV
          </Button>
        )}
      </div>
    </div>
  );

  const RecentItemsTable = () => {
    if (recentItems.length === 0) {
      return (
        <Card className="card-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 title-accent">
              <Clock className="icon-lg" />
              Recent Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Package className="icon-xl text-gray-400 mx-auto mb-2" />
              <p className="cell-muted">No recent items found.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="card-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="icon-lg text-orange-800" />
            Recent Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="table-wrap">
            <Table>
              <TableHeader>
                <TableRow className="thead">
                  <TableHead className="th">Product</TableHead>
                  <TableHead className="th">Category</TableHead>
                  <TableHead className="th">Qty</TableHead>
                  <TableHead className="th">Price</TableHead>
                  <TableHead className="th">Status</TableHead>
                  <TableHead className="th">Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentItems.map((item, index) => {
                  const stockColor = item.quantity <= 5 ? 'stock-low' : item.quantity <= 10 ? 'text-yellow-600' : 'stock-ok';
                  const timeAgo = getTimeAgo(item.createdAt);
                  
                  return (
                    <TableRow 
                      key={item.id} 
                      className={`trow trow-alt`}
                    >
                      <TableCell className="cell-strong">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-32" title={item.name}>
                            {item.name}
                          </span>
                          {item.quantity <= 5 && (
                            <Badge variant="destructive" className="tag-xs">
                              Low
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className="badge-cat tag-xs"
                        >
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className={`cell-strong ${stockColor}`}>
                        {item.quantity}
                      </TableCell>
                      <TableCell className="cell-money">
                        ₱{item.price.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {item.quantity <= 5 ? (
                          <Badge variant="destructive" className="tag-xs">
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="badge-ok tag-xs">
                            In Stock
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm cell-muted">
                        {timeAgo}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const Dashboard = () => (
    <div>
      <div className="cards">
        <Card className="stat stat-blue">
          <CardContent className="inner">
            <div className="row">
              <div>
                <p className="hint">Total Items</p>
                <p className="value">{activeItems.length}</p>
              </div>
              <Package className="icon-xl text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="stat stat-green">
          <CardContent className="inner">
            <div className="row">
              <div>
                <p className="hint">Total Value</p>
                <p className="value">₱{totalValue.toFixed(2)}</p>
              </div>
              <Package className="icon-xl text-green-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="stat stat-red">
          <CardContent className="inner">
            <div className="row">
              <div>
                <p className="hint">Low Stock</p>
                <p className="value">{lowStockItems.length}</p>
              </div>
              <Package className="icon-xl text-red-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="stat stat-orange">
          <CardContent className="inner">
            <div className="row">
              <div>
                <p className="hint">Archived</p>
                <p className="value">{archivedItems.length}</p>
              </div>
              <Archive className="icon-xl text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        {lowStockItems.length > 0 && (
          <Card className="alert">
            <CardHeader>
              <CardTitle className="alert-title">Low Stock Alert</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="alert-list">
                {lowStockItems.map(item => (
                  <div key={item.id} className="alert-item">
                    <div>
                      <p className="name">{item.name}</p>
                      <p className="info">Only {item.quantity} left</p>
                    </div>
                    <Badge variant="destructive">{item.quantity}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        <div>
          <RecentItemsTable />
        </div>
      </div>
    </div>
  );

  const InventoryTable = ({ items, showArchived = false }: { items: Item[]; showArchived?: boolean }) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {showArchived ? 'No archived items found.' : 'No items found. Add some items to get started!'}
          </p>
        </div>
      );
    }

    return (
      <div className="table-wrap shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="thead">
                <TableHead className="th">Product Name</TableHead>
                <TableHead className="th">Description</TableHead>
                <TableHead className="th">Category</TableHead>
                <TableHead className="th">Quantity</TableHead>
                <TableHead className="th">Price (₱)</TableHead>
                <TableHead className="th">Total Value (₱)</TableHead>
                <TableHead className="th">Status</TableHead>
                <TableHead className="th">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const stockColor = item.quantity <= 5 ? 'stock-low' : 'stock-ok';
                const totalValue = item.quantity * item.price;
                
                return (
                  <TableRow 
                    key={item.id} 
                    className={`trow trow-alt`}
                  >
                    <TableCell className="cell-strong">
                      <div className="flex items-center gap-2">
                        {item.name}
                        {item.quantity <= 5 && (
                          <Badge variant="destructive" className="tag-xs">
                            Low Stock
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="cell-muted max-w-xs">
                      <div className="truncate" title={item.description}>
                        {item.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className="badge-cat tag-xs"
                      >
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className={`cell-strong ${stockColor}`}>
                      {item.quantity}
                    </TableCell>
                    <TableCell className="cell-money">
                      ₱{item.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-medium text-green-700">
                      ₱{totalValue.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.quantity <= 5 ? (
                        <Badge variant="destructive" className="tag-xs">
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="badge-ok tag-xs">
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!showArchived ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(item)}
                              className="btn-icon btn-edit"
                            >
                              <Edit className="icon-xs" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleArchiveItem(item.id)}
                              className="btn-icon btn-archive"
                            >
                              <Archive className="icon-xs" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestoreItem(item.id)}
                            className="btn-icon btn-restore"
                          >
                            <RotateCcw className="icon-xs" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="foot">
          <div className="foot-row">
            <span>Total Items: {items.length}</span>
            <span>Total Inventory Value: ₱{items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  const ItemForm = ({ onSubmit }: { onSubmit: () => void }) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Product Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter product name"
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter product description"
          rows={3}
        />
      </div>
      
      <div className="form-grid">
        <div>
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            value={formData.quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
            placeholder="0"
          />
        </div>
        
        <div>
          <Label htmlFor="price">Price (₱)</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Button onClick={onSubmit} className="btn-submit">
        {editingItem ? 'Update Item' : 'Add Item'}
      </Button>
    </div>
  );

  return (
    <div className="page">
      <div className="header">
        <div className="header-inner">
          <div className="header-bar">
            <div className="brand">
              <div className="brand-logo">
                <Store className="icon-xl text-orange-600" />
              </div>
              <div className="brand-title">
                <h1>Cath's Sari - Sari Store</h1>
                <p className="brand-subtitle">Inventory Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={openAddDialog}
                className="header-btn"
              >
                <Plus className="icon-lg mr-2" />
                Add Item
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="tabs-wrap">
          <div className="tabs-inner">
            <TabsList className="tabs-list">
              <TabsTrigger 
                value="dashboard" 
                className="tabs-trigger"
              >
                <Home className="icon-sm mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="inventory" 
                className="tabs-trigger"
              >
                <Package className="icon-sm mr-2" />
                Inventory
              </TabsTrigger>
              <TabsTrigger 
                value="archived" 
                className="tabs-trigger"
              >
                <Archive className="icon-sm mr-2" />
                Archived
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
        
        <div className="container">
          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>
          
          <TabsContent value="inventory">
            <SearchAndFilter 
              showExport={true} 
              itemsToExport={activeItems} 
              exportFilename="sari-sari-inventory.csv" 
            />
            <InventoryTable items={activeItems} />
          </TabsContent>
          
          <TabsContent value="archived">
            <SearchAndFilter 
              showExport={true} 
              itemsToExport={archivedItems} 
              exportFilename="sari-sari-archived-items.csv" 
            />
            <InventoryTable items={archivedItems} showArchived />
          </TabsContent>
        </div>
      </Tabs>

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="dialog-title">Add New Item</DialogTitle>
            <DialogDescription className="dialog-desc">
              Add a new product to your sari-sari store inventory. Fill in the product details below.
            </DialogDescription>
          </DialogHeader>
          <ItemForm onSubmit={handleAddItem} />
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="dialog-title">Edit Item</DialogTitle>
            <DialogDescription className="dialog-desc">
              Update the details of this inventory item. Make changes to the product information below.
            </DialogDescription>
          </DialogHeader>
          <ItemForm onSubmit={handleEditItem} />
        </DialogContent>
      </Dialog>
    </div>
  );
}