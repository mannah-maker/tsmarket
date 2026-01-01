import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { adminAPI, categoriesAPI, productsAPI, rewardsAPI, wheelAPI } from '../lib/api';
import { 
  Settings, Users, Package, Tag, Gift, Sparkles, 
  Plus, Trash2, ShoppingCart, BarChart3, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export const Admin = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [topupCodes, setTopupCodes] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [wheelPrizes, setWheelPrizes] = useState([]);
  const [orders, setOrders] = useState([]);

  // Form states
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: 0, xp_reward: 10, category_id: '', image_url: '', sizes: '', stock: 100 });
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', description: '' });
  const [newTopupCode, setNewTopupCode] = useState({ code: '', amount: 100 });
  const [newReward, setNewReward] = useState({ level_required: 1, name: '', description: '', reward_type: 'coins', value: 50, is_exclusive: false });
  const [newPrize, setNewPrize] = useState({ name: '', prize_type: 'coins', value: 10, probability: 0.2, color: '#0D9488' });

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/');
      return;
    }

    fetchAllData();
  }, [isAuthenticated, isAdmin, navigate]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, productsRes, categoriesRes, codesRes, ordersRes, prizesRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(),
        productsAPI.getAll(),
        categoriesAPI.getAll(),
        adminAPI.getTopupCodes(),
        adminAPI.getOrders(),
        wheelAPI.getPrizes(),
      ]);
      
      // Fetch rewards separately as it requires auth
      let rewardsData = [];
      try {
        const rewardsRes = await rewardsAPI.getAll();
        rewardsData = rewardsRes.data;
      } catch (e) {}

      setStats(statsRes.data);
      setUsers(usersRes.data);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
      setTopupCodes(codesRes.data);
      setOrders(ordersRes.data);
      setRewards(rewardsData);
      setWheelPrizes(prizesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  // Product handlers
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        ...newProduct,
        sizes: newProduct.sizes ? newProduct.sizes.split(',').map(s => s.trim()) : [],
      };
      await productsAPI.create(productData);
      toast.success('Product created');
      setNewProduct({ name: '', description: '', price: 0, xp_reward: 10, category_id: '', image_url: '', sizes: '', stock: 100 });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create product');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await productsAPI.delete(id);
      toast.success('Product deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  // Category handlers
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await categoriesAPI.create(newCategory);
      toast.success('Category created');
      setNewCategory({ name: '', slug: '', description: '' });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await categoriesAPI.delete(id);
      toast.success('Category deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  // Topup code handlers
  const handleCreateTopupCode = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createTopupCode(newTopupCode);
      toast.success('Code created');
      setNewTopupCode({ code: '', amount: 100 });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create code');
    }
  };

  const handleDeleteTopupCode = async (id) => {
    try {
      await adminAPI.deleteTopupCode(id);
      toast.success('Code deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete code');
    }
  };

  // Reward handlers
  const handleCreateReward = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createReward(newReward);
      toast.success('Reward created');
      setNewReward({ level_required: 1, name: '', description: '', reward_type: 'coins', value: 50, is_exclusive: false });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create reward');
    }
  };

  const handleDeleteReward = async (id) => {
    try {
      await adminAPI.deleteReward(id);
      toast.success('Reward deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete reward');
    }
  };

  // Wheel prize handlers
  const handleCreatePrize = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createWheelPrize(newPrize);
      toast.success('Prize created');
      setNewPrize({ name: '', prize_type: 'coins', value: 10, probability: 0.2, color: '#0D9488' });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create prize');
    }
  };

  const handleDeletePrize = async (id) => {
    try {
      await adminAPI.deleteWheelPrize(id);
      toast.success('Prize deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete prize');
    }
  };

  // Toggle admin
  const handleToggleAdmin = async (userId, currentStatus) => {
    try {
      await adminAPI.toggleAdmin(userId, !currentStatus);
      toast.success('Admin status updated');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update admin status');
    }
  };

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="min-h-screen admin-panel flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen admin-panel" data-testid="admin-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Settings className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-slate-400">Manage TSMarket</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-testid="admin-stats">
            <div className="admin-card">
              <Users className="w-6 h-6 text-primary mb-2" />
              <p className="text-2xl font-black">{stats.users_count}</p>
              <p className="text-sm text-slate-400">Users</p>
            </div>
            <div className="admin-card">
              <Package className="w-6 h-6 text-primary mb-2" />
              <p className="text-2xl font-black">{stats.products_count}</p>
              <p className="text-sm text-slate-400">Products</p>
            </div>
            <div className="admin-card">
              <ShoppingCart className="w-6 h-6 text-primary mb-2" />
              <p className="text-2xl font-black">{stats.orders_count}</p>
              <p className="text-sm text-slate-400">Orders</p>
            </div>
            <div className="admin-card">
              <BarChart3 className="w-6 h-6 text-primary mb-2" />
              <p className="text-2xl font-black">{stats.total_revenue?.toFixed(0)}</p>
              <p className="text-sm text-slate-400">Revenue</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
            <TabsTrigger value="codes" data-testid="tab-codes">Top-up Codes</TabsTrigger>
            <TabsTrigger value="rewards" data-testid="tab-rewards">Rewards</TabsTrigger>
            <TabsTrigger value="wheel" data-testid="tab-wheel">Wheel</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="admin-card" data-testid="create-product-form">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Add Product</h3>
              <form onSubmit={handleCreateProduct} className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} className="admin-input" required />
                </div>
                <div>
                  <Label>Price</Label>
                  <Input type="number" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} className="admin-input" required />
                </div>
                <div>
                  <Label>XP Reward</Label>
                  <Input type="number" value={newProduct.xp_reward} onChange={(e) => setNewProduct({...newProduct, xp_reward: parseInt(e.target.value)})} className="admin-input" required />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newProduct.category_id} onValueChange={(v) => setNewProduct({...newProduct, category_id: v})}>
                    <SelectTrigger className="admin-input"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.category_id} value={c.category_id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input value={newProduct.image_url} onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})} className="admin-input" required />
                </div>
                <div>
                  <Label>Sizes (comma-separated)</Label>
                  <Input value={newProduct.sizes} onChange={(e) => setNewProduct({...newProduct, sizes: e.target.value})} className="admin-input" placeholder="S, M, L, XL" />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Input value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} className="admin-input" required />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full">Create Product</Button>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4">Products ({products.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {products.map((p) => (
                  <div key={p.product_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg" data-testid={`admin-product-${p.product_id}`}>
                    <div className="flex items-center gap-3">
                      <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded object-cover" />
                      <div>
                        <p className="font-bold">{p.name}</p>
                        <p className="text-sm text-slate-400">{p.price} coins • {p.xp_reward} XP</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteProduct(p.product_id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="admin-card" data-testid="create-category-form">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Add Category</h3>
              <form onSubmit={handleCreateCategory} className="grid md:grid-cols-4 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input value={newCategory.name} onChange={(e) => setNewCategory({...newCategory, name: e.target.value})} className="admin-input" required />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={newCategory.slug} onChange={(e) => setNewCategory({...newCategory, slug: e.target.value})} className="admin-input" required />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={newCategory.description} onChange={(e) => setNewCategory({...newCategory, description: e.target.value})} className="admin-input" />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full">Create</Button>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4">Categories ({categories.length})</h3>
              <div className="space-y-2">
                {categories.map((c) => (
                  <div key={c.category_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg" data-testid={`admin-category-${c.category_id}`}>
                    <div>
                      <p className="font-bold">{c.name}</p>
                      <p className="text-sm text-slate-400">{c.slug}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteCategory(c.category_id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Top-up Codes Tab */}
          <TabsContent value="codes" className="space-y-6">
            <div className="admin-card" data-testid="create-code-form">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Add Top-up Code</h3>
              <form onSubmit={handleCreateTopupCode} className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Code</Label>
                  <Input value={newTopupCode.code} onChange={(e) => setNewTopupCode({...newTopupCode, code: e.target.value.toUpperCase()})} className="admin-input font-mono" required />
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input type="number" value={newTopupCode.amount} onChange={(e) => setNewTopupCode({...newTopupCode, amount: parseFloat(e.target.value)})} className="admin-input" required />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full">Create</Button>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4">Top-up Codes ({topupCodes.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {topupCodes.map((c) => (
                  <div key={c.code_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg" data-testid={`admin-code-${c.code_id}`}>
                    <div>
                      <p className="font-mono font-bold">{c.code}</p>
                      <p className="text-sm text-slate-400">+{c.amount} coins • {c.is_used ? <span className="text-red-400">Used</span> : <span className="text-green-400">Available</span>}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteTopupCode(c.code_id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-6">
            <div className="admin-card" data-testid="create-reward-form">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Add Reward</h3>
              <form onSubmit={handleCreateReward} className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Level Required</Label>
                  <Input type="number" value={newReward.level_required} onChange={(e) => setNewReward({...newReward, level_required: parseInt(e.target.value)})} className="admin-input" required />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={newReward.name} onChange={(e) => setNewReward({...newReward, name: e.target.value})} className="admin-input" required />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={newReward.description} onChange={(e) => setNewReward({...newReward, description: e.target.value})} className="admin-input" required />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={newReward.reward_type} onValueChange={(v) => setNewReward({...newReward, reward_type: v})}>
                    <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coins">Coins</SelectItem>
                      <SelectItem value="xp_boost">XP Boost</SelectItem>
                      <SelectItem value="discount">Discount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input type="number" value={newReward.value} onChange={(e) => setNewReward({...newReward, value: parseFloat(e.target.value)})} className="admin-input" required />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={newReward.is_exclusive} onChange={(e) => setNewReward({...newReward, is_exclusive: e.target.checked})} />
                    Exclusive (10 levels)
                  </label>
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4">Rewards ({rewards.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {rewards.map((r) => (
                  <div key={r.reward_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg" data-testid={`admin-reward-${r.reward_id}`}>
                    <div>
                      <p className="font-bold">{r.name} {r.is_exclusive && <span className="text-yellow-400">(Exclusive)</span>}</p>
                      <p className="text-sm text-slate-400">Level {r.level_required} • {r.reward_type}: {r.value}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteReward(r.reward_id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Wheel Tab */}
          <TabsContent value="wheel" className="space-y-6">
            <div className="admin-card" data-testid="create-prize-form">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Add Wheel Prize</h3>
              <form onSubmit={handleCreatePrize} className="grid md:grid-cols-5 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input value={newPrize.name} onChange={(e) => setNewPrize({...newPrize, name: e.target.value})} className="admin-input" required />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={newPrize.prize_type} onValueChange={(v) => setNewPrize({...newPrize, prize_type: v})}>
                    <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coins">Coins</SelectItem>
                      <SelectItem value="xp">XP</SelectItem>
                      <SelectItem value="discount">Discount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input type="number" value={newPrize.value} onChange={(e) => setNewPrize({...newPrize, value: parseFloat(e.target.value)})} className="admin-input" required />
                </div>
                <div>
                  <Label>Probability (0-1)</Label>
                  <Input type="number" step="0.01" value={newPrize.probability} onChange={(e) => setNewPrize({...newPrize, probability: parseFloat(e.target.value)})} className="admin-input" required />
                </div>
                <div>
                  <Label>Color</Label>
                  <Input type="color" value={newPrize.color} onChange={(e) => setNewPrize({...newPrize, color: e.target.value})} className="admin-input h-10" />
                </div>
                <div className="md:col-span-5 flex justify-end">
                  <Button type="submit">Create Prize</Button>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4">Wheel Prizes ({wheelPrizes.length})</h3>
              <div className="space-y-2">
                {wheelPrizes.map((p) => (
                  <div key={p.prize_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg" data-testid={`admin-prize-${p.prize_id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded" style={{ backgroundColor: p.color }} />
                      <div>
                        <p className="font-bold">{p.name}</p>
                        <p className="text-sm text-slate-400">{p.prize_type}: {p.value} • {(p.probability * 100).toFixed(0)}% chance</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeletePrize(p.prize_id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4">Users ({users.length})</h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {users.map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg" data-testid={`admin-user-${u.user_id}`}>
                    <div className="flex items-center gap-3">
                      {u.picture ? (
                        <img src={u.picture} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-white font-bold">{u.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-bold">{u.name} {u.is_admin && <span className="text-red-400">(Admin)</span>}</p>
                        <p className="text-sm text-slate-400">{u.email} • Level {u.level} • {u.balance?.toFixed(0)} coins</p>
                      </div>
                    </div>
                    <Button 
                      variant={u.is_admin ? "destructive" : "outline"} 
                      size="sm"
                      onClick={() => handleToggleAdmin(u.user_id, u.is_admin)}
                      disabled={u.user_id === user?.user_id}
                    >
                      {u.is_admin ? 'Remove Admin' : 'Make Admin'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4">Orders ({orders.length})</h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {orders.map((o) => (
                  <div key={o.order_id} className="p-3 bg-slate-700 rounded-lg" data-testid={`admin-order-${o.order_id}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-mono text-sm text-slate-400">{o.order_id}</p>
                      <p className="text-sm">{new Date(o.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm">{o.items?.length || 0} items</p>
                      <p className="font-bold text-primary">{o.total} coins • +{o.total_xp} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
