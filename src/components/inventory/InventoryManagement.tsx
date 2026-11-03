import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  Layers,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  CheckCircle,
  Truck,
  UserCheck,
  ShieldAlert,
  Building2,
  RefreshCw,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  SlidersHorizontal,
  ChevronDown,
  Info,
  DollarSign,
  PieChart,
  History,
  Boxes,
  Barcode,
  Lock,
  Unlock,
  Wrench,
  Store,
  FileBox,
} from 'lucide-react';
import {
  InventoryItem,
  InventoryCategory,
  InventoryStatus,
  StockMovement,
  StockMovementType,
  Supplier,
  Customer,
  Dealer,
  UserProfile,
  isCEO,
  isManagerOrHigher,
  isStaffOrHigher,
  isTechnician,
  isDealer,
} from '../../types/erp';
import { formatNPR, formatDate } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { createDocument, updateDocument, deleteDocument } from '../../services/dbService';
import { exportToExcel, exportTableToPDF } from '../../utils/exportUtils';

export const ALL_INVENTORY_CATEGORIES: InventoryCategory[] = [
  '4G WiFi Router',
  'WiFi 6 PCB',
  'Router Antenna',
  'External Antenna',
  'SIM Card',
  'CCTV Camera',
  'Memory Card',
  'DC Converter',
  'LM2596',
  'Fuse',
  'DC Jack',
  'Switch',
  'RCA Jack',
  'LED',
  'Resistor',
  'Router Enclosure',
  'Cables',
  'GPS Device',
  'Other Spare Parts',
];

interface InventoryManagementProps {
  inventory: InventoryItem[];
  stockMovements?: StockMovement[];
  suppliers?: Supplier[];
  customers?: Customer[];
  dealers?: Dealer[];
  users?: UserProfile[];
}

type InventoryTab = 'catalog' | 'movements' | 'operations' | 'allocations' | 'suppliers' | 'valuation';

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  inventory = [],
  stockMovements = [],
  suppliers = [],
  customers = [],
  dealers = [],
  users = [],
}) => {
  const { activeRole, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<InventoryTab>('catalog');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'allocated'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  // Telecom SIM restricted access toggle (CEO / Ops Manager only)
  const [revealSimVault, setRevealSimVault] = useState(false);

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementActionType, setMovementActionType] = useState<StockMovementType>('purchase_entry');
  const [selectedItemForAction, setSelectedItemForAction] = useState<InventoryItem | null>(null);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [serialViewItem, setSerialViewItem] = useState<InventoryItem | null>(null);

  // Form State for Inventory Item
  const [itemFormData, setItemFormData] = useState({
    productId: '',
    itemName: '',
    sku: '',
    category: '4G WiFi Router' as InventoryCategory,
    brand: 'Teltonika',
    model: 'RUTX11',
    costNpr: 28500,
    sellingNpr: 36000,
    currentStock: 10,
    minimumStockLevel: 3,
    supplierId: suppliers[0]?.id || 'sup-001',
    location: 'Kathmandu Central Warehouse, Bay A-1',
    serialNumbersText: '',
    simNumbersText: '',
    imsiNumbersText: '',
    simOperator: 'NTC' as 'NTC' | 'Ncell' | 'Dual SIM' | 'Smart Cell',
    notes: '',
  });

  // Form State for Stock Movement (Strict Negative Stock Guarded)
  const [movementFormData, setMovementFormData] = useState({
    itemId: '',
    quantity: 1,
    unitCostNpr: 0,
    fromLocation: '',
    toLocation: '',
    allocatedToId: '',
    allocatedToType: 'bus_fleet' as 'dealer' | 'technician' | 'bus_fleet' | 'warehouse',
    serialNumbersText: '',
    simNumbersText: '',
    reason: '',
    negativeStockOverride: false,
    overrideJustification: '',
  });

  // Form State for Supplier
  const [supplierFormData, setSupplierFormData] = useState({
    supplierCode: '',
    name: '',
    contactPerson: '',
    phone: '+977-',
    email: '',
    address: 'Kathmandu, Nepal',
    suppliedCategories: ['4G WiFi Router'] as string[],
    taxPanNumber: '',
    paymentTerms: 'Net 30 Days',
    rating: 5,
    notes: '',
  });

  // Filtered Inventory based on Role & Search
  // Strict rule: Dealers and technicians only see their allocated stock or relevant items
  const accessibleInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (isCEO(activeRole) || activeRole === 'OPERATIONS_MANAGER' || activeRole === 'OFFICE_STAFF') {
        return true;
      }
      if (isTechnician(activeRole)) {
        // Technician sees items allocated to them OR items in technician/workshop pool
        return (
          item.allocatedToId === userProfile?.userId ||
          item.allocatedToRole === 'FIELD_TECHNICIAN' ||
          item.status === 'allocated_technician' ||
          item.location.toLowerCase().includes('workshop') ||
          item.location.toLowerCase().includes('van')
        );
      }
      if (isDealer(activeRole)) {
        // Dealer sees items allocated to their dealer code or dealership
        return (
          item.allocatedToId === userProfile?.assignedDealerId ||
          item.allocatedToRole === 'DEALER' ||
          item.status === 'allocated_dealer'
        );
      }
      return true;
    });
  }, [inventory, activeRole, userProfile]);

  // Derived filtered items for the catalog tab
  const filteredCatalog = useMemo(() => {
    return accessibleInventory.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        item.itemName.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.productId && item.productId.toLowerCase().includes(q)) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.model && item.model.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        (item.serialNumbers && item.serialNumbers.some((s) => s.toLowerCase().includes(q))) ||
        (item.simNumbers && item.simNumbers.some((s) => s.toLowerCase().includes(q)));

      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

      let matchesStock = true;
      const stock = item.currentStock ?? 0;
      const minStock = item.minimumStockLevel ?? 5;
      if (stockStatusFilter === 'in_stock') matchesStock = stock > minStock;
      else if (stockStatusFilter === 'low_stock') matchesStock = stock > 0 && stock <= minStock;
      else if (stockStatusFilter === 'out_of_stock') matchesStock = stock <= 0;
      else if (stockStatusFilter === 'allocated') {
        matchesStock = !!item.allocatedToId || item.status === 'allocated_technician' || item.status === 'allocated_dealer';
      }

      const matchesLocation = locationFilter === 'all' || (item.location && item.location.includes(locationFilter));

      return matchesSearch && matchesCategory && matchesStock && matchesLocation;
    });
  }, [accessibleInventory, searchTerm, categoryFilter, stockStatusFilter, locationFilter]);

  // Low Stock Items for Alert Radar
  const lowStockItems = useMemo(() => {
    return accessibleInventory.filter((item) => (item.currentStock ?? 0) <= (item.minimumStockLevel ?? 5));
  }, [accessibleInventory]);

  // Locations list for filter dropdown
  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    accessibleInventory.forEach((i) => {
      if (i.location) {
        const prefix = i.location.split(',')[0].trim();
        set.add(prefix);
      }
    });
    return Array.from(set);
  }, [accessibleInventory]);

  // Valuation Metrics (Total asset value at cost & retail potential)
  const valuation = useMemo(() => {
    let totalItems = 0;
    let totalStockUnits = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;

    accessibleInventory.forEach((item) => {
      const stock = Math.max(0, item.currentStock ?? 0);
      const unitCost = item.purchasePriceNpr ?? item.costNpr ?? 0;
      const unitSelling = item.sellingPriceNpr ?? item.sellingNpr ?? 0;

      totalItems += 1;
      totalStockUnits += stock;
      totalCostValuation += stock * unitCost;
      totalRetailValuation += stock * unitSelling;
    });

    const potentialMargin = totalRetailValuation - totalCostValuation;
    const marginPercent = totalRetailValuation > 0 ? (potentialMargin / totalRetailValuation) * 100 : 0;

    // Category breakdown
    const byCategory: Record<
      string,
      { count: number; stock: number; costVal: number; retailVal: number; lowStockCount: number }
    > = {};

    accessibleInventory.forEach((item) => {
      const cat = item.category || 'Other Spare Parts';
      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, stock: 0, costVal: 0, retailVal: 0, lowStockCount: 0 };
      }
      const stock = Math.max(0, item.currentStock ?? 0);
      const unitCost = item.purchasePriceNpr ?? item.costNpr ?? 0;
      const unitSelling = item.sellingPriceNpr ?? item.sellingNpr ?? 0;

      byCategory[cat].count += 1;
      byCategory[cat].stock += stock;
      byCategory[cat].costVal += stock * unitCost;
      byCategory[cat].retailVal += stock * unitSelling;
      if (stock <= (item.minimumStockLevel ?? 5)) {
        byCategory[cat].lowStockCount += 1;
      }
    });

    return {
      totalItems,
      totalStockUnits,
      totalCostValuation,
      totalRetailValuation,
      potentialMargin,
      marginPercent,
      byCategory,
    };
  }, [accessibleInventory]);

  // Filtered Stock Movements for audit ledger
  const filteredMovements = useMemo(() => {
    return stockMovements.filter((mov) => {
      if (isTechnician(activeRole)) {
        return mov.allocatedToId === userProfile?.userId || mov.actorId === userProfile?.userId;
      }
      if (isDealer(activeRole)) {
        return mov.allocatedToId === userProfile?.assignedDealerId || mov.actorId === userProfile?.userId;
      }
      return true;
    });
  }, [stockMovements, activeRole, userProfile]);

  // Open Create Item Modal
  const handleOpenCreateItem = () => {
    setEditingItem(null);
    const catCode = 'RTR';
    const num = Math.floor(100 + Math.random() * 900);
    setItemFormData({
      productId: `PRD-${catCode}-${num}`,
      itemName: '',
      sku: `SKU-${num}`,
      category: '4G WiFi Router',
      brand: 'Teltonika',
      model: 'RUTX11',
      costNpr: 28500,
      sellingNpr: 36000,
      currentStock: 10,
      minimumStockLevel: 3,
      supplierId: suppliers[0]?.id || 'sup-001',
      location: 'Kathmandu Central Warehouse, Bay A-1',
      serialNumbersText: '',
      simNumbersText: '',
      imsiNumbersText: '',
      simOperator: 'NTC',
      notes: '',
    });
    setIsItemModalOpen(true);
  };

  // Open Edit Item Modal
  const handleOpenEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemFormData({
      productId: item.productId || `PRD-${item.id}`,
      itemName: item.itemName,
      sku: item.sku || '',
      category: item.category,
      brand: item.brand || item.brandModel.split(' ')[0] || '',
      model: item.model || item.brandModel || '',
      costNpr: item.purchasePriceNpr ?? item.costNpr ?? 0,
      sellingNpr: item.sellingPriceNpr ?? item.sellingNpr ?? 0,
      currentStock: item.currentStock ?? 0,
      minimumStockLevel: item.minimumStockLevel ?? 5,
      supplierId: item.supplierId || suppliers[0]?.id || '',
      location: item.location || item.warehouseLocation || 'Kathmandu Central Warehouse',
      serialNumbersText: (item.serialNumbers || (item.serialNumber ? [item.serialNumber] : [])).join(', '),
      simNumbersText: (item.simNumbers || []).join(', '),
      imsiNumbersText: (item.imsiNumbers || []).join(', '),
      simOperator: item.simOperator || 'NTC',
      notes: item.notes || '',
    });
    setIsItemModalOpen(true);
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const serials = itemFormData.serialNumbersText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const sims = itemFormData.simNumbersText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const imsis = itemFormData.imsiNumbersText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const supplierObj = suppliers.find((s) => s.id === itemFormData.supplierId);

    const itemPayload: Partial<InventoryItem> = {
      productId: itemFormData.productId || `PRD-${Date.now().toString().slice(-4)}`,
      itemName: itemFormData.itemName,
      sku: itemFormData.sku,
      category: itemFormData.category,
      brand: itemFormData.brand,
      model: itemFormData.model,
      brandModel: `${itemFormData.brand} ${itemFormData.model}`.trim(),
      costNpr: Number(itemFormData.costNpr),
      purchasePriceNpr: Number(itemFormData.costNpr),
      sellingNpr: Number(itemFormData.sellingNpr),
      sellingPriceNpr: Number(itemFormData.sellingNpr),
      currentStock: Number(itemFormData.currentStock),
      minimumStockLevel: Number(itemFormData.minimumStockLevel),
      supplierId: itemFormData.supplierId,
      supplierName: supplierObj?.name || 'Authorized Supplier',
      location: itemFormData.location,
      warehouseLocation: itemFormData.location,
      serialNumbers: serials,
      serialNumber: serials[0] || '',
      simNumbers: sims,
      imsiNumbers: imsis,
      simOperator: itemFormData.simOperator,
      notes: itemFormData.notes,
      status: (Number(itemFormData.currentStock) > 0 ? 'in_stock' : 'decommissioned') as InventoryStatus,
      updatedAt: new Date().toISOString(),
    };

    if (editingItem) {
      await updateDocument('inventory', editingItem.id, itemPayload, 'Inventory', 'INVENTORY_CATALOG_UPDATE', {
        id: userProfile?.userId,
        name: userProfile?.fullName,
        role: activeRole,
      });
    } else {
      const newItem: InventoryItem = {
        ...itemPayload,
        id: `inv-${Date.now()}`,
        createdAt: new Date().toISOString(),
      } as InventoryItem;

      await createDocument('inventory', newItem, 'Inventory', 'INVENTORY_ITEM_CREATE', {
        id: userProfile?.userId,
        name: userProfile?.fullName,
        role: activeRole,
      });

      // Record initial creation as permanent stock movement
      if (newItem.currentStock > 0) {
        const movementNumber = `MOV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const initialMovement: StockMovement = {
          id: `mov-${Date.now()}`,
          movementNumber,
          movementType: 'purchase_entry',
          itemId: newItem.id,
          itemName: newItem.itemName,
          sku: newItem.sku,
          category: newItem.category,
          quantity: newItem.currentStock,
          previousStock: 0,
          newStock: newItem.currentStock,
          unitCostNpr: newItem.purchasePriceNpr || newItem.costNpr,
          totalCostNpr: newItem.currentStock * (newItem.purchasePriceNpr || newItem.costNpr),
          fromLocation: supplierObj ? `Supplier: ${supplierObj.name}` : 'Initial Stock Inward',
          toLocation: newItem.location,
          reason: 'Initial item catalog creation and opening balance entry.',
          authorizedBy: `${userProfile?.fullName || 'CEO'} (${activeRole})`,
          actorId: userProfile?.userId || 'usr-system',
          actorName: userProfile?.fullName || 'System',
          actorRole: activeRole,
          timestamp: new Date().toISOString(),
        };
        await createDocument('stockMovements', initialMovement, 'Inventory', 'STOCK_MOVEMENT_INITIAL_BALANCE');
      }
    }

    setIsItemModalOpen(false);
  };

  // Delete Item
  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!isCEO(activeRole)) {
      alert('Security Alert: Only the CEO can permanently delete an inventory SKU from Cloud Firestore.');
      return;
    }
    if (confirm(`Confirm permanent deletion of "${itemName}"? This action is non-reversible and will be recorded in the audit trail.`)) {
      await deleteDocument('inventory', itemId, 'Inventory', 'INVENTORY_ITEM_DELETE', {
        id: userProfile?.userId,
        name: userProfile?.fullName,
        role: activeRole,
      });
    }
  };

  // Open Quick Action Movement Modal
  const handleOpenMovementModal = (type: StockMovementType, preselectedItem?: InventoryItem) => {
    const item = preselectedItem || accessibleInventory[0];
    setMovementActionType(type);
    setSelectedItemForAction(item || null);

    const defaultFrom =
      type === 'purchase_entry' || type === 'stock_received'
        ? suppliers[0]?.name ? `Vendor: ${suppliers[0].name}` : 'Supplier Port'
        : item?.location || 'Kathmandu Central Warehouse';

    const defaultTo =
      type === 'stock_issued'
        ? customers[0]?.companyName ? `Bus ${customers[0].busRegistrationNumber} (${customers[0].companyName})` : 'Customer Fleet'
        : type === 'dealer_allocation'
        ? dealers[0]?.dealerName ? `Dealer Depot: ${dealers[0].dealerName}` : 'Regional Partner'
        : type === 'technician_allocation'
        ? users.find((u) => u.role === 'FIELD_TECHNICIAN')?.fullName ? `Technician Van (${users.find((u) => u.role === 'FIELD_TECHNICIAN')?.fullName})` : 'Field Tool Van'
        : type === 'stock_transfer'
        ? 'Pokhara Regional Hub Warehouse'
        : type === 'damaged_returned'
        ? 'Gongabu Workshop (RMA Repair Bin)'
        : item?.location || 'Kathmandu Central Warehouse';

    setMovementFormData({
      itemId: item?.id || '',
      quantity: 1,
      unitCostNpr: item?.purchasePriceNpr || item?.costNpr || 0,
      fromLocation: defaultFrom,
      toLocation: defaultTo,
      allocatedToId:
        type === 'dealer_allocation'
          ? dealers[0]?.id || ''
          : type === 'technician_allocation'
          ? users.find((u) => u.role === 'FIELD_TECHNICIAN')?.userId || ''
          : customers[0]?.id || '',
      allocatedToType:
        type === 'dealer_allocation'
          ? 'dealer'
          : type === 'technician_allocation'
          ? 'technician'
          : 'bus_fleet',
      serialNumbersText: '',
      simNumbersText: '',
      reason:
        type === 'purchase_entry'
          ? 'Procurement batch purchase entry from verified distributor.'
          : type === 'stock_received'
          ? 'Stock shipment received, inspected, and placed into warehouse storage.'
          : type === 'stock_issued'
          ? 'Issued for scheduled bus installation work order.'
          : type === 'stock_adjustment'
          ? 'Physical audit cycle count adjustment.'
          : type === 'stock_transfer'
          ? 'Inter-depot transfer for regional installation demand.'
          : type === 'dealer_allocation'
          ? 'Consignment stock allocation for regional bus fleet installations.'
          : type === 'technician_allocation'
          ? 'Material kit issued to field engineer for on-site highway maintenance.'
          : 'De-installed from bus due to hardware fault; routed to workshop for testing.',
      negativeStockOverride: false,
      overrideJustification: '',
    });

    setIsMovementModalOpen(true);
  };

  // Submit Stock Movement with Strict Negative Stock Guard
  const handleExecuteMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = accessibleInventory.find((i) => i.id === movementFormData.itemId);
    if (!item) {
      alert('Error: Please select a valid inventory product.');
      return;
    }

    const qty = Math.max(1, Number(movementFormData.quantity));
    const currentStock = item.currentStock ?? 0;

    // Movement calculation
    // Does this movement decrease central warehouse stock?
    const isDecreasing = [
      'stock_issued',
      'dealer_allocation',
      'technician_allocation',
      'stock_transfer',
      'damaged_returned',
    ].includes(movementActionType);

    // Or negative adjustment
    const isAdjustment = movementActionType === 'stock_adjustment';
    let newStock = currentStock;

    if (movementActionType === 'purchase_entry' || movementActionType === 'stock_received') {
      newStock = currentStock + qty;
    } else if (isDecreasing) {
      newStock = currentStock - qty;
    } else if (isAdjustment) {
      // In adjustment, user quantity represents the new counted stock or offset
      newStock = Number(movementFormData.quantity);
    }

    // STRICT NEGATIVE STOCK GUARD
    if (newStock < 0) {
      const canAuthorize = isCEO(activeRole) || activeRole === 'OPERATIONS_MANAGER';
      if (!canAuthorize) {
        alert(
          `TRANSACTION BLOCKED (Negative Stock Violation):\n` +
          `Current stock is ${currentStock} units, but attempting to deduct ${qty} units.\n` +
          `Negative stock is strictly forbidden without CEO or Operations Manager emergency clearance.`
        );
        return;
      }

      if (!movementFormData.negativeStockOverride) {
        alert(
          `TRANSACTION BLOCKED (Negative Stock Clearance Required):\n` +
          `This action will result in a negative stock of ${newStock} units.\n` +
          `As an authorized officer (${activeRole}), you must check "Authorized Negative Stock Emergency Override" and provide an explicit justification reason.`
        );
        return;
      }

      if (!movementFormData.overrideJustification.trim()) {
        alert('Please enter a detailed justification reason for the negative stock override.');
        return;
      }
    }

    const unitCost = Number(movementFormData.unitCostNpr) || item.purchasePriceNpr || item.costNpr || 0;
    const totalCost = qty * unitCost;

    const serials = movementFormData.serialNumbersText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const sims = movementFormData.simNumbersText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Determine target allocation name
    let allocatedName = '';
    if (movementFormData.allocatedToType === 'dealer') {
      const d = dealers.find((dlr) => dlr.id === movementFormData.allocatedToId);
      allocatedName = d?.dealerName || 'Authorized Regional Dealer';
    } else if (movementFormData.allocatedToType === 'technician') {
      const t = users.find((u) => u.userId === movementFormData.allocatedToId);
      allocatedName = t?.fullName || 'Field Technician';
    } else if (movementFormData.allocatedToType === 'bus_fleet') {
      const c = customers.find((cust) => cust.id === movementFormData.allocatedToId);
      allocatedName = c ? `${c.companyName} (${c.busRegistrationNumber})` : 'Bus Fleet Client';
    }

    const movementNumber = `MOV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const movementRecord: StockMovement = {
      id: `mov-${Date.now()}`,
      movementNumber,
      movementType: movementActionType,
      itemId: item.id,
      itemName: item.itemName,
      sku: item.sku,
      category: item.category,
      quantity: qty,
      previousStock: currentStock,
      newStock,
      unitCostNpr: unitCost,
      totalCostNpr: totalCost,
      fromLocation: movementFormData.fromLocation,
      toLocation: movementFormData.toLocation,
      allocatedToId: movementFormData.allocatedToId,
      allocatedToName: allocatedName,
      allocatedToType: movementFormData.allocatedToType,
      serialNumbers: serials.length > 0 ? serials : undefined,
      simNumbers: sims.length > 0 ? sims : undefined,
      reason: movementFormData.negativeStockOverride
        ? `[NEGATIVE STOCK OVERRIDE] ${movementFormData.reason} | Justification: ${movementFormData.overrideJustification}`
        : movementFormData.reason,
      authorizedBy: `${userProfile?.fullName || 'Manager'} (${activeRole})`,
      isNegativeStockOverride: newStock < 0,
      actorId: userProfile?.userId || 'usr-system',
      actorName: userProfile?.fullName || 'Current User',
      actorRole: activeRole,
      timestamp: new Date().toISOString(),
    };

    // 1. Create permanent audit ledger record
    await createDocument('stockMovements', movementRecord, 'Inventory', `STOCK_${movementActionType.toUpperCase()}`, {
      id: userProfile?.userId,
      name: userProfile?.fullName,
      role: activeRole,
    });

    // 2. Update item stock in inventory collection
    const updatePayload: Partial<InventoryItem> = {
      currentStock: newStock,
      status: (newStock <= 0 ? 'decommissioned' : 'in_stock') as InventoryStatus,
      updatedAt: new Date().toISOString(),
    };

    // If technician or dealer allocation, tag allocation fields
    if (movementActionType === 'technician_allocation') {
      updatePayload.allocatedToId = movementFormData.allocatedToId;
      updatePayload.allocatedToName = allocatedName;
      updatePayload.allocatedToRole = 'FIELD_TECHNICIAN';
      updatePayload.allocatedQuantity = qty;
      updatePayload.allocatedDate = new Date().toISOString();
      updatePayload.status = 'allocated_technician';
    } else if (movementActionType === 'dealer_allocation') {
      updatePayload.allocatedToId = movementFormData.allocatedToId;
      updatePayload.allocatedToName = allocatedName;
      updatePayload.allocatedToRole = 'DEALER';
      updatePayload.allocatedQuantity = qty;
      updatePayload.allocatedDate = new Date().toISOString();
      updatePayload.status = 'allocated_dealer';
    } else if (movementActionType === 'damaged_returned') {
      updatePayload.damageCount = (item.damageCount || 0) + qty;
      updatePayload.damageNotes = movementFormData.reason;
      updatePayload.status = 'damaged';
    }

    await updateDocument('inventory', item.id, updatePayload, 'Inventory', `INVENTORY_STOCK_UPDATE`, {
      id: userProfile?.userId,
      name: userProfile?.fullName,
      role: activeRole,
    });

    setIsMovementModalOpen(false);
  };

  // Save Supplier (Create or Update)
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const supPayload: Partial<Supplier> = {
      supplierCode: supplierFormData.supplierCode || `SUP-${Date.now().toString().slice(-4)}`,
      name: supplierFormData.name,
      contactPerson: supplierFormData.contactPerson,
      phone: supplierFormData.phone,
      email: supplierFormData.email,
      address: supplierFormData.address,
      suppliedCategories: supplierFormData.suppliedCategories,
      taxPanNumber: supplierFormData.taxPanNumber,
      paymentTerms: supplierFormData.paymentTerms,
      rating: Number(supplierFormData.rating),
      notes: supplierFormData.notes,
      status: 'active',
    };

    if (editingSupplier) {
      await updateDocument('suppliers', editingSupplier.id, supPayload, 'Inventory', 'SUPPLIER_UPDATE', {
        id: userProfile?.userId,
        name: userProfile?.fullName,
        role: activeRole,
      });
    } else {
      const newSup: Supplier = {
        ...supPayload,
        id: `sup-${Date.now()}`,
        createdAt: new Date().toISOString(),
      } as Supplier;
      await createDocument('suppliers', newSup, 'Inventory', 'SUPPLIER_CREATE', {
        id: userProfile?.userId,
        name: userProfile?.fullName,
        role: activeRole,
      });
    }
    setIsSupplierModalOpen(false);
  };

  // Export Valuation Report to Excel
  const handleExportValuationExcel = () => {
    const rows = accessibleInventory.map((item, idx) => {
      const stock = item.currentStock ?? 0;
      const cost = item.purchasePriceNpr ?? item.costNpr ?? 0;
      const sell = item.sellingPriceNpr ?? item.sellingNpr ?? 0;
      return {
        'S.N.': idx + 1,
        'Product ID': item.productId || item.id,
        'Product Name': item.itemName,
        'SKU': item.sku || '-',
        'Category': item.category,
        'Brand / Model': `${item.brand || ''} ${item.model || item.brandModel || ''}`.trim(),
        'Current Stock (Units)': stock,
        'Min. Stock Level': item.minimumStockLevel ?? 5,
        'Unit Purchase Price (NPR)': cost,
        'Total Valuation at Cost (NPR)': stock * cost,
        'Unit Selling Price (NPR)': sell,
        'Total Valuation at Retail (NPR)': stock * sell,
        'Potential Margin (NPR)': (sell - cost) * stock,
        'Warehouse Location': item.location || '-',
        'Supplier': item.supplierName || '-',
        'Status': item.status,
      };
    });
    exportToExcel(rows, `Netcare_Nepal_Inventory_Valuation_${new Date().toISOString().split('T')[0]}`);
  };

  // Export Valuation Report to PDF
  const handleExportValuationPDF = () => {
    const headers = ['Category', 'Product SKU', 'Brand / Model', 'Stock', 'Safety', 'Cost (NPR)', 'Total Cost (NPR)', 'Selling (NPR)', 'Location', 'Status'];
    const rows = accessibleInventory.map((item) => [
      item.category,
      item.sku || '-',
      `${item.brand || ''} ${item.model || ''}`.trim() || item.itemName,
      item.currentStock ?? 0,
      item.minimumStockLevel ?? 0,
      item.costNpr ?? item.purchasePriceNpr ?? 0,
      (item.currentStock ?? 0) * (item.costNpr ?? item.purchasePriceNpr ?? 0),
      item.sellingNpr ?? item.sellingPriceNpr ?? 0,
      item.location || item.warehouseLocation || '-',
      (item.status || 'in_stock').toUpperCase(),
    ]);
    exportTableToPDF(
      'Netcare Nepal ERP - Inventory Asset Valuation Report',
      headers,
      rows,
      `Netcare_Nepal_Inventory_Valuation_${new Date().toISOString().split('T')[0]}`,
      `Total SKUs: ${accessibleInventory.length} | In-Stock Units: ${valuation.totalStockUnits} | Valuation: NPR रू ${valuation.totalCostValuation.toLocaleString()}`
    );
  };

  // Export Movements to Excel
  const handleExportMovementsExcel = () => {
    const rows = filteredMovements.map((m, idx) => ({
      'S.N.': idx + 1,
      'Movement ID': m.movementNumber,
      'Type': m.movementType.replace('_', ' ').toUpperCase(),
      'Item Name': m.itemName,
      'SKU': m.sku || '-',
      'Quantity': m.quantity,
      'Stock Before': m.previousStock,
      'Stock After': m.newStock,
      'Total Value (NPR)': m.totalCostNpr,
      'From Location': m.fromLocation,
      'To Location': m.toLocation,
      'Allocated Custody': m.allocatedToName || '-',
      'Authorized By': m.authorizedBy,
      'Logged By': `${m.actorName} (${m.actorRole})`,
      'Timestamp': formatDate(m.timestamp),
      'Reason': m.reason,
    }));
    exportToExcel(rows, `Netcare_Nepal_Stock_Movements_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Highlights */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-red-100 text-red-700 font-bold text-xs rounded-full uppercase tracking-wider">
                Enterprise Logistics & Hardware
              </span>
              <span className="text-xs text-slate-500 font-medium">Kathmandu Central & Regional Depots</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Boxes className="h-7 w-7 text-red-600" />
              Inventory & Hardware Operations
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Multi-warehouse tracking of 4G WiFi Routers, CCTV cameras, high-gain antennas, SIM cards, discrete electronics, and technician allocations.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isManagerOrHigher(activeRole) && (
              <>
                <button
                  onClick={() => handleOpenMovementModal('purchase_entry')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <ArrowDownLeft className="h-4 w-4" />
                  Stock Purchase
                </button>
                <button
                  onClick={() => handleOpenMovementModal('stock_issued')}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Issue Stock
                </button>
              </>
            )}

            {isCEO(activeRole) && (
              <button
                onClick={handleOpenCreateItem}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Add Product SKU
              </button>
            )}

            <button
              onClick={handleExportValuationExcel}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
              title="Export Inventory Valuation to Excel"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              onClick={handleExportValuationPDF}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
              title="Export Inventory Valuation to PDF"
            >
              <FileText className="h-4 w-4 text-red-600" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>

        {/* 4 Financial & Inventory Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Catalog SKUs</span>
              <Package className="h-4 w-4 text-slate-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{valuation.totalItems}</p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>In-Stock Units:</span>
              <span className="font-semibold text-slate-700">{valuation.totalStockUnits} units</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Asset Valuation (At Cost)</span>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 mt-2">{formatNPR(valuation.totalCostValuation)}</p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Retail Value:</span>
              <span className="font-semibold text-slate-700">{formatNPR(valuation.totalRetailValuation)}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Gross Margin Potential</span>
              <PieChart className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700 mt-2">{formatNPR(valuation.potentialMargin)}</p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Average Margin:</span>
              <span className="font-semibold text-blue-600">{valuation.marginPercent.toFixed(1)}%</span>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${lowStockItems.length > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200/80'}`}>
            <div className="flex items-center justify-between text-amber-700 text-xs font-medium">
              <span>Low Stock Alerts</span>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <p className={`text-2xl font-bold mt-2 ${lowStockItems.length > 0 ? 'text-amber-800' : 'text-slate-900'}`}>
              {lowStockItems.length} SKUs
            </p>
            <div className="flex items-center justify-between text-[11px] text-amber-600 mt-1">
              <span>Below Safety Level:</span>
              <span className="font-bold">{lowStockItems.length > 0 ? 'Action Recommended' : 'Optimal'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'border-red-600 text-red-600 bg-red-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Boxes className="h-4 w-4" />
            Stock Catalog & Storage ({accessibleInventory.length})
          </button>

          <button
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'movements'
                ? 'border-red-600 text-red-600 bg-red-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <History className="h-4 w-4" />
            Stock Movements & Ledger ({stockMovements.length})
          </button>

          <button
            onClick={() => setActiveTab('operations')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'operations'
                ? 'border-red-600 text-red-600 bg-red-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Movement Operations Hub
          </button>

          <button
            onClick={() => setActiveTab('allocations')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'allocations'
                ? 'border-red-600 text-red-600 bg-red-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Allocated Custody (Dealers & Techs)
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'suppliers'
                ? 'border-red-600 text-red-600 bg-red-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Suppliers & Vendors ({suppliers.length})
          </button>

          <button
            onClick={() => setActiveTab('valuation')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'valuation'
                ? 'border-red-600 text-red-600 bg-red-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <PieChart className="h-4 w-4" />
            Asset Valuation & Analytics
          </button>
        </div>

        {/* Restricted SIM Credentials Vault Button (CEO & Ops Manager) */}
        {isManagerOrHigher(activeRole) && (
          <div className="hidden md:flex items-center gap-2 pb-1">
            <button
              onClick={() => setRevealSimVault(!revealSimVault)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                revealSimVault
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Toggle reveal of sensitive SIM phone numbers and IMSI data"
            >
              {revealSimVault ? <Lock className="h-3.5 w-3.5 text-amber-700" /> : <Unlock className="h-3.5 w-3.5 text-slate-500" />}
              <span>{revealSimVault ? 'Hide Restricted SIM Vault' : 'Reveal Restricted SIM Vault'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          TAB 1: STOCK CATALOG & WAREHOUSE INVENTORY
         ======================================================== */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Low Stock Warning Banner if any items are low */}
          {lowStockItems.length > 0 && stockStatusFilter !== 'low_stock' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    Low Stock Alert Triggered ({lowStockItems.length} SKUs below minimum safety threshold)
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Critical stock items require PO replenishment to prevent bus installation delays.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStockStatusFilter('low_stock')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs"
              >
                View Low Stock Only
              </button>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Product Name, SKU, Serial No, Brand, or Location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All 19 Categories</option>
                {ALL_INVENTORY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Stock Status Filter */}
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Stock Levels</option>
                <option value="in_stock">Healthy Stock</option>
                <option value="low_stock">⚠️ Low Stock Alert</option>
                <option value="out_of_stock">⛔ Out of Stock (0)</option>
                <option value="allocated">Allocated to Tech / Dealer</option>
              </select>

              {/* Location Filter */}
              {uniqueLocations.length > 0 && (
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">All Storage Depots</option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              )}

              {(searchTerm || categoryFilter !== 'all' || stockStatusFilter !== 'all' || locationFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('all');
                    setStockStatusFilter('all');
                    setLocationFilter('all');
                  }}
                  className="px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Catalog Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table id="inventory-catalog-table" className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Product & Category</th>
                    <th className="py-3 px-4">Brand / Model</th>
                    <th className="py-3 px-4">Current Stock</th>
                    <th className="py-3 px-4">Purchase Price</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4">Asset Valuation</th>
                    <th className="py-3 px-4">Serials / SIM</th>
                    <th className="py-3 px-4">Warehouse Depot</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {filteredCatalog.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Boxes className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium">No inventory products found matching your search filter.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCatalog.map((item) => {
                      const stock = item.currentStock ?? 0;
                      const minStock = item.minimumStockLevel ?? 5;
                      const isLow = stock > 0 && stock <= minStock;
                      const isOut = stock <= 0;
                      const unitCost = item.purchasePriceNpr ?? item.costNpr ?? 0;
                      const totalVal = stock * unitCost;
                      const isRouterOrCctv = ['4G WiFi Router', 'CCTV Camera', 'GPS Device'].includes(item.category);
                      const isSim = item.category === 'SIM Card';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{item.itemName}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold border border-slate-200">
                                {item.category}
                              </span>
                              {item.sku && (
                                <span className="font-mono text-[10px] text-slate-500">
                                  SKU: {item.sku}
                                </span>
                              )}
                              {item.productId && (
                                <span className="font-mono text-[10px] text-red-600 font-semibold">
                                  {item.productId}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-medium text-slate-800">
                            <div>{item.brand || item.brandModel}</div>
                            {item.model && <div className="text-[11px] text-slate-500">{item.model}</div>}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold text-sm px-2.5 py-0.5 rounded-lg border ${
                                  isOut
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : isLow
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {stock} units
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              Min safety: {minStock} units
                            </div>
                            {isLow && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 mt-0.5">
                                <AlertTriangle className="h-3 w-3" /> Reorder Alert
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                            {formatNPR(unitCost)}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                            {formatNPR(item.sellingPriceNpr ?? item.sellingNpr ?? 0)}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                            {formatNPR(totalVal)}
                          </td>

                          <td className="py-3.5 px-4">
                            {isRouterOrCctv && (
                              <div>
                                {item.serialNumbers && item.serialNumbers.length > 0 ? (
                                  <button
                                    onClick={() => setSerialViewItem(item)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono text-[11px] font-bold transition-colors flex items-center gap-1 border border-slate-200"
                                  >
                                    <Barcode className="h-3 w-3 text-slate-500" />
                                    {item.serialNumbers.length} Serials
                                  </button>
                                ) : (
                                  <span className="text-slate-400 font-mono text-[11px]">-</span>
                                )}
                              </div>
                            )}

                            {isSim && (
                              <div>
                                {revealSimVault && isManagerOrHigher(activeRole) ? (
                                  <div className="font-mono text-[11px] text-slate-800">
                                    {item.simNumbers && item.simNumbers.length > 0
                                      ? item.simNumbers.slice(0, 2).join(', ') + (item.simNumbers.length > 2 ? ` (+${item.simNumbers.length - 2})` : '')
                                      : 'No SIMs'}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                    <Lock className="h-3 w-3 text-slate-400" />
                                    <span>9841*** (Restricted)</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {!isRouterOrCctv && !isSim && (
                              <span className="text-slate-400 text-[11px]">N/A (Bulk)</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-800 max-w-[150px] truncate" title={item.location}>
                              {item.location || 'Kathmandu Central'}
                            </div>
                            {item.supplierName && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[150px]" title={item.supplierName}>
                                {item.supplierName}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {isManagerOrHigher(activeRole) && (
                                <>
                                  <button
                                    onClick={() => handleOpenMovementModal('stock_issued', item)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Issue Item to Bus / Installation"
                                  >
                                    <ArrowUpRight className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenMovementModal('stock_received', item)}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="Receive Stock Batch"
                                  >
                                    <ArrowDownLeft className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditItem(item)}
                                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Edit Product Details"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}

                              {isCEO(activeRole) && (
                                <button
                                  onClick={() => handleDeleteItem(item.id, item.itemName)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Product SKU"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: STOCK MOVEMENTS PERMANENT AUDIT LEDGER
         ======================================================== */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History className="h-5 w-5 text-red-600" />
                  Permanent Stock Movement Ledger
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Every inventory transaction creates an immutable, permanent Firestore audit record. Negative stock overrides are highlighted.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportMovementsExcel}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  Export Ledger to Excel
                </button>
              </div>
            </div>

            {/* Movements Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Movement ID & Type</th>
                    <th className="py-3 px-4">Item & SKU</th>
                    <th className="py-3 px-4">Qty & Value</th>
                    <th className="py-3 px-4">Stock Ledger</th>
                    <th className="py-3 px-4">Routing (From &rarr; To)</th>
                    <th className="py-3 px-4">Custody / Reason</th>
                    <th className="py-3 px-4">Authorized By</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <History className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        No movement records found.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((mov) => {
                      const isNegativeOverride = mov.isNegativeStockOverride || mov.reason.includes('NEGATIVE STOCK OVERRIDE');
                      const typeLabel = mov.movementType.replace('_', ' ').toUpperCase();

                      return (
                        <tr key={mov.id} className={`hover:bg-slate-50/60 transition-colors ${isNegativeOverride ? 'bg-amber-50/30' : ''}`}>
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-slate-900">{mov.movementNumber}</div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase mt-1 ${
                                mov.movementType === 'purchase_entry' || mov.movementType === 'stock_received'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : mov.movementType === 'stock_issued'
                                  ? 'bg-blue-100 text-blue-800'
                                  : mov.movementType === 'dealer_allocation'
                                  ? 'bg-purple-100 text-purple-800'
                                  : mov.movementType === 'technician_allocation'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : mov.movementType === 'damaged_returned'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {typeLabel}
                            </span>
                            {isNegativeOverride && (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded-md">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Negative Stock Override
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-medium text-slate-800 max-w-[200px]">
                            <div className="font-bold text-slate-900 truncate" title={mov.itemName}>{mov.itemName}</div>
                            {mov.sku && <div className="text-[10px] font-mono text-slate-500">SKU: {mov.sku}</div>}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{mov.quantity} units</div>
                            <div className="font-mono text-[11px] text-slate-500">{formatNPR(mov.totalCostNpr)}</div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-xs">
                            <div className="text-slate-500">Before: {mov.previousStock}</div>
                            <div className="font-bold text-slate-900">After: {mov.newStock}</div>
                          </td>

                          <td className="py-3.5 px-4 max-w-[220px]">
                            <div className="text-[11px] text-slate-500 truncate" title={mov.fromLocation}>
                              From: {mov.fromLocation}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-900 truncate mt-0.5" title={mov.toLocation}>
                              To: {mov.toLocation}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 max-w-[200px]">
                            {mov.allocatedToName && (
                              <div className="font-semibold text-slate-800 truncate" title={mov.allocatedToName}>
                                Custody: {mov.allocatedToName}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-500 line-clamp-2" title={mov.reason}>
                              {mov.reason}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{mov.authorizedBy}</div>
                            <div className="text-[10px] text-slate-400">Actor: {mov.actorName}</div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                            {formatDate(mov.timestamp)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: OPERATIONS & MOVEMENT FORMS HUB
         ======================================================== */}
      {activeTab === 'operations' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-red-600" />
              Stock Operations Center
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select any standardized ERP workflow to generate verified stock movements with audit integrity.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {/* 1. Purchase Entry */}
              <div
                onClick={() => handleOpenMovementModal('purchase_entry')}
                className="p-5 border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 group"
              >
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl w-fit group-hover:scale-110 transition-transform">
                  <ArrowDownLeft className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-3">1. Stock Purchase Entry</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Log incoming hardware shipments from official distributors (Teltonika, Dahua, NTC, etc.).
                </p>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-600">
                  Open Purchase Form &rarr;
                </div>
              </div>

              {/* 2. Stock Received */}
              <div
                onClick={() => handleOpenMovementModal('stock_received')}
                className="p-5 border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 group"
              >
                <div className="p-3 bg-blue-100 text-blue-700 rounded-xl w-fit group-hover:scale-110 transition-transform">
                  <Truck className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-3">2. Stock Received & Inspection</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Confirm customs cargo clearance and warehouse shelf storage check-in.
                </p>
                <div className="mt-4 flex items-center text-xs font-bold text-blue-600">
                  Record Receiving &rarr;
                </div>
              </div>

              {/* 3. Stock Issued */}
              <div
                onClick={() => handleOpenMovementModal('stock_issued')}
                className="p-5 border border-slate-200 rounded-2xl hover:border-red-500 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-red-50/30 group"
              >
                <div className="p-3 bg-red-100 text-red-700 rounded-xl w-fit group-hover:scale-110 transition-transform">
                  <ArrowUpRight className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-3">3. Stock Issued (Installation)</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Issue router, CCTV or antenna equipment to customer bus with strict negative stock guard.
                </p>
                <div className="mt-4 flex items-center text-xs font-bold text-red-600">
                  Issue Stock &rarr;
                </div>
              </div>

              {/* 4. Stock Adjustment */}
              <div
                onClick={() => handleOpenMovementModal('stock_adjustment')}
                className="p-5 border border-slate-200 rounded-2xl hover:border-amber-500 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-amber-50/30 group"
              >
                <div className="p-3 bg-amber-100 text-amber-700 rounded-xl w-fit group-hover:scale-110 transition-transform">
                  <RefreshCw className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-3">4. Stock Audit Adjustment</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Reconcile physical warehouse cycle counts, shrinkage, or audit corrections.
                </p>
                <div className="mt-4 flex items-center text-xs font-bold text-amber-600">
                  Adjust Inventory &rarr;
                </div>
              </div>

              {/* 5. Stock Transfer */}
              <div
                onClick={() => handleOpenMovementModal('stock_transfer')}
                className="p-5 border border-slate-200 rounded-2xl hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-indigo-50/30 group"
              >
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl w-fit group-hover:scale-110 transition-transform">
                  <ArrowUpDown className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-3">5. Inter-Depot Transfer</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Transfer batches from Kathmandu Central to Pokhara Hub or Gongabu Workshop.
                </p>
                <div className="mt-4 flex items-center text-xs font-bold text-indigo-600">
                  Transfer Stock &rarr;
                </div>
              </div>

              {/* 6. Dealer Allocation */}
              <div
                onClick={() => handleOpenMovementModal('dealer_allocation')}
                className="p-5 border border-slate-200 rounded-2xl hover:border-purple-500 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-purple-50/30 group"
              >
                <div className="p-3 bg-purple-100 text-purple-700 rounded-xl w-fit group-hover:scale-110 transition-transform">
                  <Store className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-3">6. Regional Dealer Allocation</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Assign consignment equipment to authorized partners (e.g., Gandaki Telematics Pokhara).
                </p>
                <div className="mt-4 flex items-center text-xs font-bold text-purple-600">
                  Allocate to Dealer &rarr;
                </div>
              </div>

              {/* 7. Technician Material Allocation */}
              <div
                onClick={() => handleOpenMovementModal('technician_allocation')}
                className="p-5 border border-slate-200 rounded-2xl hover:border-teal-500 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-teal-50/30 group"
              >
                <div className="p-3 bg-teal-100 text-teal-700 rounded-xl w-fit group-hover:scale-110 transition-transform">
                  <Wrench className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-3">7. Field Technician Allocation</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Issue tools, antennas, DC jacks, and cables to field engineers for daily bus work.
                </p>
                <div className="mt-4 flex items-center text-xs font-bold text-teal-600">
                  Allocate to Tech &rarr;
                </div>
              </div>

              {/* 8. Damaged & Returned Goods */}
              <div
                onClick={() => handleOpenMovementModal('damaged_returned')}
                className="p-5 border border-slate-200 rounded-2xl hover:border-rose-500 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-rose-50/30 group"
              >
                <div className="p-3 bg-rose-100 text-rose-700 rounded-xl w-fit group-hover:scale-110 transition-transform">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-3">8. Damaged & Returned RMA</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Record faulty de-installed units from highway buses for diagnosis and manufacturer warranty.
                </p>
                <div className="mt-4 flex items-center text-xs font-bold text-rose-600">
                  Log Return / Damage &rarr;
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: ALLOCATED CUSTODY (DEALERS & TECHNICIANS)
         ======================================================== */}
      {activeTab === 'allocations' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-red-600" />
              Allocated Custody & Consignment Tracking
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Overview of all Netcare Nepal hardware and materials currently held by Field Technicians and Regional Partner Dealers.
            </p>

            {/* Field Technicians Allocation Cards */}
            <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-teal-600" />
                Field Technician Material Kits
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                {users
                  .filter((u) => u.role === 'FIELD_TECHNICIAN')
                  .map((tech) => {
                    const techMovements = stockMovements.filter(
                      (m) => m.movementType === 'technician_allocation' && m.allocatedToId === tech.userId
                    );
                    const totalQty = techMovements.reduce((acc, curr) => acc + curr.quantity, 0);

                    return (
                      <div key={tech.userId} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-slate-900 text-sm">{tech.fullName}</div>
                          <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-bold rounded-md">
                            Field Engineer
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{tech.department || 'Field Ops (Kathmandu)'}</div>
                        <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                          <span className="text-slate-600">Material Items Issued:</span>
                          <span className="font-bold text-slate-900">{totalQty} units</span>
                        </div>
                        {techMovements.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {techMovements.slice(0, 3).map((m) => (
                              <div key={m.id} className="text-[11px] text-slate-600 flex justify-between">
                                <span className="truncate max-w-[170px]">{m.itemName}</span>
                                <span className="font-semibold text-slate-900">x{m.quantity}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {isManagerOrHigher(activeRole) && (
                          <button
                            onClick={() => {
                              handleOpenMovementModal('technician_allocation');
                              setMovementFormData((prev) => ({
                                ...prev,
                                allocatedToId: tech.userId,
                                allocatedToType: 'technician',
                              }));
                            }}
                            className="mt-3 w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                          >
                            + Allocate Materials to {tech.fullName.split(' ')[0]}
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Regional Dealer Consignment Cards */}
            <div className="mt-8">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Store className="h-4 w-4 text-purple-600" />
                Regional Partner Dealer Consignment Stock
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                {dealers.map((dealer) => {
                  const dealerMovements = stockMovements.filter(
                    (m) => m.movementType === 'dealer_allocation' && m.allocatedToId === dealer.id
                  );
                  const totalUnits = dealerMovements.reduce((acc, curr) => acc + curr.quantity, 0);

                  return (
                    <div key={dealer.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-900 text-sm">{dealer.dealerName}</div>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-md">
                          {dealer.territory || 'Regional Hub'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Contact: {dealer.contactPerson} ({dealer.phone})
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                        <span className="text-slate-600">Consignment Stock Held:</span>
                        <span className="font-bold text-slate-900">{totalUnits} units</span>
                      </div>
                      {dealerMovements.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {dealerMovements.slice(0, 3).map((m) => (
                            <div key={m.id} className="text-[11px] text-slate-600 flex justify-between">
                              <span className="truncate max-w-[170px]">{m.itemName}</span>
                              <span className="font-semibold text-slate-900">x{m.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {isManagerOrHigher(activeRole) && (
                        <button
                          onClick={() => {
                            handleOpenMovementModal('dealer_allocation');
                            setMovementFormData((prev) => ({
                              ...prev,
                              allocatedToId: dealer.id,
                              allocatedToType: 'dealer',
                            }));
                          }}
                          className="mt-3 w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                        >
                          + Allocate Stock to {dealer.dealerName}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: SUPPLIERS & VENDORS MANAGEMENT
         ======================================================== */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-red-600" />
                  Supplier & Procurement Partner Registry
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage commercial distributors for routers, antennas, SIM cards, MDVRs, and electronics components.
                </p>
              </div>

              {isCEO(activeRole) && (
                <button
                  onClick={() => {
                    setEditingSupplier(null);
                    setSupplierFormData({
                      supplierCode: `SUP-NEW-${Math.floor(10 + Math.random() * 90)}`,
                      name: '',
                      contactPerson: '',
                      phone: '+977-98',
                      email: '',
                      address: 'Kathmandu, Nepal',
                      suppliedCategories: ['4G WiFi Router'],
                      taxPanNumber: '',
                      paymentTerms: 'Net 30 Days',
                      rating: 5,
                      notes: '',
                    });
                    setIsSupplierModalOpen(true);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Supplier
                </button>
              )}
            </div>

            {/* Suppliers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {suppliers.map((sup) => (
                <div key={sup.id} className="p-5 border border-slate-200 rounded-2xl bg-white hover:border-slate-300 transition-colors shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                        {sup.supplierCode}
                      </span>
                      <div className="flex items-center gap-0.5 text-amber-500 text-xs">
                        {'★'.repeat(sup.rating || 5)}
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm mt-3">{sup.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{sup.address}</p>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div><span className="text-slate-400">Contact Person:</span> <span className="font-medium text-slate-800">{sup.contactPerson}</span></div>
                      <div><span className="text-slate-400">Phone:</span> <span className="font-mono">{sup.phone}</span></div>
                      <div><span className="text-slate-400">Email:</span> <span>{sup.email}</span></div>
                      <div><span className="text-slate-400">PAN / VAT:</span> <span className="font-mono">{sup.taxPanNumber || '-'}</span></div>
                      <div><span className="text-slate-400">Payment Terms:</span> <span className="font-medium text-slate-700">{sup.paymentTerms}</span></div>
                    </div>

                    {sup.suppliedCategories && sup.suppliedCategories.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {sup.suppliedCategories.map((cat) => (
                          <span key={cat} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold">
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isManagerOrHigher(activeRole) && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingSupplier(sup);
                          setSupplierFormData({
                            supplierCode: sup.supplierCode,
                            name: sup.name,
                            contactPerson: sup.contactPerson,
                            phone: sup.phone,
                            email: sup.email,
                            address: sup.address,
                            suppliedCategories: sup.suppliedCategories || [],
                            taxPanNumber: sup.taxPanNumber,
                            paymentTerms: sup.paymentTerms,
                            rating: sup.rating,
                            notes: sup.notes || '',
                          });
                          setIsSupplierModalOpen(true);
                        }}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 6: ASSET VALUATION & ANALYTICS
         ======================================================== */}
      {activeTab === 'valuation' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-red-600" />
                  Inventory Valuation & Capital Asset Breakdown
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Complete valuation of Netcare Nepal hardware assets categorized by product family.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportValuationExcel}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  Export Valuation to Excel
                </button>
              </div>
            </div>

            {/* Valuation Summary Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <span className="text-xs font-medium text-emerald-800">Total Capital Invested (At Cost)</span>
                <p className="text-2xl font-bold text-emerald-900 mt-1">{formatNPR(valuation.totalCostValuation)}</p>
                <p className="text-[11px] text-emerald-700 mt-1">Direct hardware acquisition value</p>
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
                <span className="text-xs font-medium text-blue-800">Total Retail Potential</span>
                <p className="text-2xl font-bold text-blue-900 mt-1">{formatNPR(valuation.totalRetailValuation)}</p>
                <p className="text-[11px] text-blue-700 mt-1">Expected turnover upon bus deployment</p>
              </div>

              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl">
                <span className="text-xs font-medium text-purple-800">Projected Gross Profit</span>
                <p className="text-2xl font-bold text-purple-900 mt-1">{formatNPR(valuation.potentialMargin)}</p>
                <p className="text-[11px] text-purple-700 mt-1">Weighted Gross Margin: {valuation.marginPercent.toFixed(1)}%</p>
              </div>
            </div>

            {/* Category Valuation Table */}
            <div className="mt-8 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Inventory Category</th>
                    <th className="py-3 px-4">SKU Varieties</th>
                    <th className="py-3 px-4">Total Stock (Units)</th>
                    <th className="py-3 px-4">Asset Value (Cost)</th>
                    <th className="py-3 px-4">Asset Value (Retail)</th>
                    <th className="py-3 px-4">Gross Margin %</th>
                    <th className="py-3 px-4">Low Stock Risks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {Object.entries(valuation.byCategory).map(([catName, stats]) => {
                    const margin = stats.retailVal - stats.costVal;
                    const marginPct = stats.retailVal > 0 ? (margin / stats.retailVal) * 100 : 0;

                    return (
                      <tr key={catName} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{catName}</td>
                        <td className="py-3 px-4 text-slate-700 font-semibold">{stats.count} SKUs</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{stats.stock} units</td>
                        <td className="py-3 px-4 font-mono text-emerald-700 font-semibold">{formatNPR(stats.costVal)}</td>
                        <td className="py-3 px-4 font-mono text-blue-700 font-semibold">{formatNPR(stats.retailVal)}</td>
                        <td className="py-3 px-4 font-mono text-purple-700 font-semibold">{marginPct.toFixed(1)}%</td>
                        <td className="py-3 px-4">
                          {stats.lowStockCount > 0 ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold">
                              {stats.lowStockCount} SKUs Low
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium text-[11px]">Healthy</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: ADD / EDIT PRODUCT SKU (CEO / Ops Manager)
         ======================================================== */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? 'Edit Product SKU Details' : 'Add New Inventory Product SKU'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={itemFormData.itemName}
                onChange={(e) => setItemFormData({ ...itemFormData, itemName: e.target.value })}
                placeholder="e.g. Teltonika RUTX11 Dual-SIM Industrial Bus Router"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Inventory Category *</label>
              <select
                value={itemFormData.category}
                onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value as InventoryCategory })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-red-500"
              >
                {ALL_INVENTORY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SKU Code *</label>
              <input
                type="text"
                required
                value={itemFormData.sku}
                onChange={(e) => setItemFormData({ ...itemFormData, sku: e.target.value })}
                placeholder="e.g. RUTX11-CAT6-NP"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Product ID</label>
              <input
                type="text"
                value={itemFormData.productId}
                onChange={(e) => setItemFormData({ ...itemFormData, productId: e.target.value })}
                placeholder="e.g. PRD-RTR-001"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Brand</label>
              <input
                type="text"
                value={itemFormData.brand}
                onChange={(e) => setItemFormData({ ...itemFormData, brand: e.target.value })}
                placeholder="e.g. Teltonika / Dahua / MeanWell"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Model Number</label>
              <input
                type="text"
                value={itemFormData.model}
                onChange={(e) => setItemFormData({ ...itemFormData, model: e.target.value })}
                placeholder="e.g. RUTX11 / DH-HAC-HDBW"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Price (NPR रू) *</label>
              <input
                type="number"
                required
                min={0}
                value={itemFormData.costNpr}
                onChange={(e) => setItemFormData({ ...itemFormData, costNpr: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Selling Price (NPR रू) *</label>
              <input
                type="number"
                required
                min={0}
                value={itemFormData.sellingNpr}
                onChange={(e) => setItemFormData({ ...itemFormData, sellingNpr: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current Stock (Units) *</label>
              <input
                type="number"
                required
                value={itemFormData.currentStock}
                onChange={(e) => setItemFormData({ ...itemFormData, currentStock: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Minimum Safety Stock Level *</label>
              <input
                type="number"
                required
                min={0}
                value={itemFormData.minimumStockLevel}
                onChange={(e) => setItemFormData({ ...itemFormData, minimumStockLevel: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Supplier</label>
              <select
                value={itemFormData.supplierId}
                onChange={(e) => setItemFormData({ ...itemFormData, supplierId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-red-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Warehouse Storage Location *</label>
              <input
                type="text"
                required
                value={itemFormData.location}
                onChange={(e) => setItemFormData({ ...itemFormData, location: e.target.value })}
                placeholder="e.g. Kathmandu Central Warehouse, Bay A-1"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Serial Numbers (for Routers, CCTV, GPS) */}
          {['4G WiFi Router', 'CCTV Camera', 'GPS Device'].includes(itemFormData.category) && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tracked Hardware Serial Numbers (Comma-separated)
              </label>
              <textarea
                rows={2}
                value={itemFormData.serialNumbersText}
                onChange={(e) => setItemFormData({ ...itemFormData, serialNumbersText: e.target.value })}
                placeholder="e.g. RUTX11-892301, RUTX11-892302, RUTX11-892303"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          {/* SIM Card Phone & IMSI numbers */}
          {itemFormData.category === 'SIM Card' && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Lock className="h-4 w-4 text-amber-700" />
                Telecom SIM Credentials Vault (Restricted Access)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">SIM Mobile Numbers</label>
                  <input
                    type="text"
                    value={itemFormData.simNumbersText}
                    onChange={(e) => setItemFormData({ ...itemFormData, simNumbersText: e.target.value })}
                    placeholder="e.g. 9841009982, 9841009983"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Telecom IMSI Codes</label>
                  <input
                    type="text"
                    value={itemFormData.imsiNumbersText}
                    onChange={(e) => setItemFormData({ ...itemFormData, imsiNumbersText: e.target.value })}
                    placeholder="e.g. 42901-77123491820"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Internal Notes</label>
            <textarea
              rows={2}
              value={itemFormData.notes}
              onChange={(e) => setItemFormData({ ...itemFormData, notes: e.target.value })}
              placeholder="e.g. Dedicated high-capacity module for long-route tourist buses."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsItemModalOpen(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              {editingItem ? 'Save Changes' : 'Create Product SKU'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL 2: EXECUTE STOCK MOVEMENT (STRICT NEGATIVE STOCK GUARD)
         ======================================================== */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title={`Record Stock Movement: ${movementActionType.replace('_', ' ').toUpperCase()}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleExecuteMovement} className="space-y-4">
          {/* Item Selector & Stock Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Hardware Item *</label>
              <select
                required
                value={movementFormData.itemId}
                onChange={(e) => {
                  const sel = accessibleInventory.find((i) => i.id === e.target.value);
                  setSelectedItemForAction(sel || null);
                  setMovementFormData({
                    ...movementFormData,
                    itemId: e.target.value,
                    unitCostNpr: sel?.purchasePriceNpr || sel?.costNpr || 0,
                  });
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-red-500"
              >
                {accessibleInventory.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.itemName} (Stock: {i.currentStock ?? 0})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Movement Quantity (Units) *</label>
              <input
                type="number"
                required
                min={1}
                value={movementFormData.quantity}
                onChange={(e) => setMovementFormData({ ...movementFormData, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Current Stock vs Resulting Stock Preview */}
          {selectedItemForAction && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Current Stock: </span>
                <span className="font-bold text-slate-900">{selectedItemForAction.currentStock ?? 0} units</span>
              </div>
              <div>
                <span className="text-slate-500">Resulting Stock: </span>
                {(() => {
                  const isDeduct = ['stock_issued', 'dealer_allocation', 'technician_allocation', 'stock_transfer', 'damaged_returned'].includes(movementActionType);
                  const isAdd = ['purchase_entry', 'stock_received'].includes(movementActionType);
                  const cur = selectedItemForAction.currentStock ?? 0;
                  const res = isAdd ? cur + movementFormData.quantity : isDeduct ? cur - movementFormData.quantity : movementFormData.quantity;
                  const isNegative = res < 0;

                  return (
                    <span className={`font-mono font-bold ${isNegative ? 'text-red-700 bg-red-100 px-2 py-0.5 rounded-md' : 'text-emerald-700'}`}>
                      {res} units {isNegative && '⚠️ NEGATIVE STOCK'}
                    </span>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Routing Locations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Origin / From Location *</label>
              <input
                type="text"
                required
                value={movementFormData.fromLocation}
                onChange={(e) => setMovementFormData({ ...movementFormData, fromLocation: e.target.value })}
                placeholder="e.g. Kathmandu Central Warehouse, Bay A-1"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Destination / To Location *</label>
              <input
                type="text"
                required
                value={movementFormData.toLocation}
                onChange={(e) => setMovementFormData({ ...movementFormData, toLocation: e.target.value })}
                placeholder="e.g. Bus Ba 3 Kha 4521 or Pokhara Hub"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Custody Allocation Selector (if dealer, technician or bus) */}
          {movementActionType === 'dealer_allocation' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Allocate Custody to Dealer *</label>
              <select
                value={movementFormData.allocatedToId}
                onChange={(e) => setMovementFormData({ ...movementFormData, allocatedToId: e.target.value, allocatedToType: 'dealer' })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-red-500"
              >
                {dealers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.dealerName} ({d.territory})
                  </option>
                ))}
              </select>
            </div>
          )}

          {movementActionType === 'technician_allocation' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Allocate Custody to Field Technician *</label>
              <select
                value={movementFormData.allocatedToId}
                onChange={(e) => setMovementFormData({ ...movementFormData, allocatedToId: e.target.value, allocatedToType: 'technician' })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-red-500"
              >
                {users
                  .filter((u) => u.role === 'FIELD_TECHNICIAN')
                  .map((t) => (
                    <option key={t.userId} value={t.userId}>
                      {t.fullName} ({t.department || 'Field Engineer'})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {movementActionType === 'stock_issued' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Bus & Customer *</label>
              <select
                value={movementFormData.allocatedToId}
                onChange={(e) => setMovementFormData({ ...movementFormData, allocatedToId: e.target.value, allocatedToType: 'bus_fleet' })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-red-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.busRegistrationNumber} - {c.companyName} ({c.busRoute})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Serial Numbers (if applicable) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Serial Numbers (Optional, comma-separated)
            </label>
            <input
              type="text"
              value={movementFormData.serialNumbersText}
              onChange={(e) => setMovementFormData({ ...movementFormData, serialNumbersText: e.target.value })}
              placeholder="e.g. RUTX11-892305, RUTX11-892306"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Operational Reason / Ticket Reference *</label>
            <input
              type="text"
              required
              value={movementFormData.reason}
              onChange={(e) => setMovementFormData({ ...movementFormData, reason: e.target.value })}
              placeholder="e.g. Installation work order WO-2026-1042 or customs clearance"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* STRICT NEGATIVE STOCK GUARD OVERRIDE ACCORDION */}
          {selectedItemForAction &&
            ['stock_issued', 'dealer_allocation', 'technician_allocation', 'stock_transfer', 'damaged_returned'].includes(movementActionType) &&
            (selectedItemForAction.currentStock ?? 0) - movementFormData.quantity < 0 && (
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  STRICT NEGATIVE STOCK WARNING (Current Stock: {selectedItemForAction.currentStock ?? 0})
                </div>
                <p className="text-xs text-red-700">
                  This transaction will result in negative inventory ({ (selectedItemForAction.currentStock ?? 0) - movementFormData.quantity } units).
                  Standard issuance is blocked. Only CEO or Operations Manager can grant emergency authorization.
                </p>

                {isManagerOrHigher(activeRole) ? (
                  <div className="space-y-2 pt-2 border-t border-red-200">
                    <label className="flex items-center gap-2 text-xs font-bold text-red-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={movementFormData.negativeStockOverride}
                        onChange={(e) =>
                          setMovementFormData({ ...movementFormData, negativeStockOverride: e.target.checked })
                        }
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span>Authorized Negative Stock Emergency Override (Recorded in Audit Ledger)</span>
                    </label>

                    {movementFormData.negativeStockOverride && (
                      <div>
                        <label className="block text-[11px] font-bold text-red-900 mb-1">
                          Mandatory Executive Justification Reason *
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={movementFormData.overrideJustification}
                          onChange={(e) =>
                            setMovementFormData({ ...movementFormData, overrideJustification: e.target.value })
                          }
                          placeholder="e.g. Emergency highway bus replacement; replacement stock arriving at customs tomorrow."
                          className="w-full px-3 py-1.5 border border-red-300 rounded-lg text-xs bg-white text-red-900 focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs font-bold text-red-800 bg-red-100 p-2 rounded-lg">
                    Access Denied: Current role ({activeRole}) cannot authorize negative stock. Please request CEO or Operations Manager approval.
                  </div>
                )}
              </div>
            )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsMovementModalOpen(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              Confirm Movement & Record Ledger
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL 3: ADD / EDIT SUPPLIER
         ======================================================== */}
      <Modal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier Details' : 'Register New Hardware Supplier'}
        maxWidth="xl"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Supplier Company Name *</label>
            <input
              type="text"
              required
              value={supplierFormData.name}
              onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
              placeholder="e.g. Teltonika Networks Baltic & Nepal Distribution"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Supplier Code *</label>
              <input
                type="text"
                required
                value={supplierFormData.supplierCode}
                onChange={(e) => setSupplierFormData({ ...supplierFormData, supplierCode: e.target.value })}
                placeholder="SUP-TEL-01"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person *</label>
              <input
                type="text"
                required
                value={supplierFormData.contactPerson}
                onChange={(e) => setSupplierFormData({ ...supplierFormData, contactPerson: e.target.value })}
                placeholder="e.g. Arun Keshari"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={supplierFormData.phone}
                onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={supplierFormData.email}
                onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                placeholder="sales@supplier.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Office Address</label>
            <input
              type="text"
              value={supplierFormData.address}
              onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
              placeholder="e.g. Tripureshwor Electronics Complex, Kathmandu"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">PAN / Tax Number</label>
              <input
                type="text"
                value={supplierFormData.taxPanNumber}
                onChange={(e) => setSupplierFormData({ ...supplierFormData, taxPanNumber: e.target.value })}
                placeholder="602918273"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Terms</label>
              <select
                value={supplierFormData.paymentTerms}
                onChange={(e) => setSupplierFormData({ ...supplierFormData, paymentTerms: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-red-500"
              >
                <option value="Net 30 Days">Net 30 Days</option>
                <option value="Advance 50%, Net 15 Days">Advance 50%, Net 15 Days</option>
                <option value="Cash on Delivery">Cash on Delivery</option>
                <option value="Monthly Corporate Invoicing">Monthly Corporate Invoicing</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsSupplierModalOpen(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              {editingSupplier ? 'Save Supplier' : 'Register Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL 4: SERIAL NUMBERS INSPECTOR
         ======================================================== */}
      {serialViewItem && (
        <Modal
          isOpen={!!serialViewItem}
          onClose={() => setSerialViewItem(null)}
          title={`Tracked Serial Numbers: ${serialViewItem.itemName}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>SKU: {serialViewItem.sku}</span>
              <span>Total Serial Count: {serialViewItem.serialNumbers?.length || 0}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
              {serialViewItem.serialNumbers && serialViewItem.serialNumbers.length > 0 ? (
                serialViewItem.serialNumbers.map((sn, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 flex items-center justify-between"
                  >
                    <span>{sn}</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                      Verified
                    </span>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-6 text-slate-400 text-xs">
                  No individual serial numbers tracked for this item.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setSerialViewItem(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
