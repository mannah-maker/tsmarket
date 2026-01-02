import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { adminAPI, categoriesAPI, productsAPI, rewardsAPI, wheelAPI } from '../lib/api';
import { 
  Settings, Users, Package, Tag, Gift, Sparkles, CreditCard, User,
  Plus, Trash2, ShoppingCart, BarChart3, Loader2, Check, X, Eye, Edit, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { toast } from 'sonner';

export const Admin = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [topupCodes, setTopupCodes] = useState([]);
  const [topupRequests, setTopupRequests] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [wheelPrizes, setWheelPrizes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [adminSettings, setAdminSettings] = useState({ card_number: '', card_holder: '', additional_info: '' });

  // Form states
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: 0, xp_reward: 10, category_id: '', image_url: '', sizes: '', stock: 100 });
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', description: '' });
  const [newTopupCode, setNewTopupCode] = useState({ code: '', amount: 100 });
  const [newReward, setNewReward] = useState({ level_required: 1, name: '', description: '', reward_type: 'coins', value: 50, is_exclusive: false });
  const [newPrize, setNewPrize] = useState({ name: '', prize_type: 'coins', value: 10, probability: 0.2, color: '#0D9488' });
  
  // Edit user modal
  const [editingUser, setEditingUser] = useState(null);
  const [editBalance, setEditBalance] = useState('');
  const [editXP, setEditXP] = useState('');
  
  // Admin profile edit
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminSecretKey, setAdminSecretKey] = useState('');
  const ADMIN_SECRET = 'Manah';

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/');
      return;
    }
    fetchAllData();
  }, [isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    if (user) {
      setAdminEmail(user.email || '');
      setAdminName(user.name || '');
    }
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, productsRes, categoriesRes, codesRes, ordersRes, prizesRes, settingsRes, requestsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(),
        productsAPI.getAll(),
        categoriesAPI.getAll(),
        adminAPI.getTopupCodes(),
        adminAPI.getOrders(),
        wheelAPI.getPrizes(),
        adminAPI.getSettings(),
        adminAPI.getTopupRequests(),
      ]);
      
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
      setAdminSettings(settingsRes.data);
      setTopupRequests(requestsRes.data);
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

  // Top-up request handlers
  const handleApproveRequest = async (id) => {
    try {
      await adminAPI.approveTopupRequest(id);
      toast.success('Request approved');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve');
    }
  };

  const handleRejectRequest = async (id) => {
    const note = prompt('Reason for rejection (optional):');
    try {
      await adminAPI.rejectTopupRequest(id, note || '');
      toast.success('Request rejected');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject');
    }
  };

  // Settings handlers
  const handleSaveSettings = async () => {
    try {
      await adminAPI.updateSettings({
        card_number: adminSettings.card_number,
        card_holder: adminSettings.card_holder,
        additional_info: adminSettings.additional_info
      });
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  // Admin profile handlers
  const handleSaveAdminProfile = async () => {
    // Check secret key
    if (adminSecretKey !== ADMIN_SECRET) {
      toast.error('Неверное ключевое слово! / Калимаи асосӣ нодуруст!');
      return;
    }
    
    try {
      const updates = {};
      if (adminEmail && adminEmail !== user?.email) updates.email = adminEmail;
      if (adminPassword) updates.password = adminPassword;
      if (adminName && adminName !== user?.name) updates.name = adminName;
      
      if (Object.keys(updates).length === 0) {
        toast.info('Нет изменений');
        return;
      }
      
      await adminAPI.updateProfile(updates);
      toast.success('Профиль обновлён! Войдите заново.');
      setAdminPassword('');
      setAdminSecretKey('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка обновления профиля');
    }
  };

  // User management handlers
  const handleToggleAdmin = async (userId, currentStatus) => {
    try {
      await adminAPI.toggleAdmin(userId, !currentStatus);
      toast.success('Admin status updated');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update admin status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deleted');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleEditUser = (u) => {
    setEditingUser(u);
    setEditBalance(u.balance?.toString() || '0');
    setEditXP(u.xp?.toString() || '0');
  };

  const handleSaveUserEdit = async () => {
    if (!editingUser) return;
    try {
      await adminAPI.updateUserBalance(editingUser.user_id, parseFloat(editBalance));
      await adminAPI.updateUserXP(editingUser.user_id, parseInt(editXP));
      toast.success('User updated');
      setEditingUser(null);
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update user');
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

  const pendingRequests = topupRequests.filter(r => r.status === 'pending');

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
            <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
            <p className="text-slate-400">{t('admin.subtitle')}</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-testid="admin-stats">
            <div className="admin-card">
              <Users className="w-6 h-6 text-primary mb-2" />
              <p className="text-2xl font-black">{stats.users_count}</p>
              <p className="text-sm text-slate-400">{t('admin.totalUsers')}</p>
            </div>
            <div className="admin-card">
              <Package className="w-6 h-6 text-primary mb-2" />
              <p className="text-2xl font-black">{stats.products_count}</p>
              <p className="text-sm text-slate-400">{t('admin.totalProducts')}</p>
            </div>
            <div className="admin-card">
              <ShoppingCart className="w-6 h-6 text-primary mb-2" />
              <p className="text-2xl font-black">{stats.orders_count}</p>
              <p className="text-sm text-slate-400">{t('admin.totalOrders')}</p>
            </div>
            <div className="admin-card">
              <BarChart3 className="w-6 h-6 text-primary mb-2" />
              <p className="text-2xl font-black">{stats.total_revenue?.toFixed(0)}</p>
              <p className="text-sm text-slate-400">{t('admin.totalRevenue')}</p>
            </div>
          </div>
        )}

        {/* Pending Requests Alert */}
        {pendingRequests.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-xl flex items-center gap-3">
            <Clock className="w-6 h-6 text-yellow-400" />
            <p className="text-yellow-200">
              <span className="font-bold">{pendingRequests.length}</span> {t('admin.topupRequests')} ожидают проверки!
            </p>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="bg-slate-800 border border-slate-700 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="requests" className="relative" data-testid="tab-requests">
              {t('admin.topupRequests')}
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-black text-xs font-bold rounded-full flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">{t('admin.settings')}</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">{t('admin.users')}</TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-products">{t('admin.products')}</TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">{t('admin.categories')}</TabsTrigger>
            <TabsTrigger value="rewards" data-testid="tab-rewards">{t('admin.rewards')}</TabsTrigger>
            <TabsTrigger value="wheel" data-testid="tab-wheel">{t('admin.wheel')}</TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">{t('admin.orders')}</TabsTrigger>
          </TabsList>

          {/* Top-up Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4">{t('admin.topupRequests')} ({topupRequests.length})</h3>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {topupRequests.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">Заявок пока нет</p>
                ) : (
                  topupRequests.map((req) => (
                    <div key={req.request_id} className="p-4 bg-slate-700 rounded-lg" data-testid={`request-${req.request_id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {req.status === 'pending' && <Clock className="w-5 h-5 text-yellow-400" />}
                            {req.status === 'approved' && <CheckCircle className="w-5 h-5 text-green-400" />}
                            {req.status === 'rejected' && <XCircle className="w-5 h-5 text-red-400" />}
                            <span className="font-bold text-xl text-primary">+{req.amount}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              req.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {t(`topup.status.${req.status}`)}
                            </span>
                          </div>
                          <p className="text-sm"><span className="text-slate-400">User:</span> {req.user_name} ({req.user_email})</p>
                          <p className="text-xs text-slate-400 mt-1">{new Date(req.created_at).toLocaleString()}</p>
                        </div>
                        
                        {/* Receipt preview */}
                        {req.receipt_url && (
                          <a href={req.receipt_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                            <img 
                              src={req.receipt_url} 
                              alt="Receipt" 
                              className="w-24 h-24 object-cover rounded-lg border border-slate-600 hover:border-primary transition-colors"
                            />
                          </a>
                        )}
                      </div>
                      
                      {req.status === 'pending' && (
                        <div className="flex gap-2 mt-4">
                          <Button 
                            onClick={() => handleApproveRequest(req.request_id)}
                            className="bg-green-600 hover:bg-green-700"
                            data-testid={`approve-${req.request_id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {t('admin.approve')}
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={() => handleRejectRequest(req.request_id)}
                            data-testid={`reject-${req.request_id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            {t('admin.reject')}
                          </Button>
                        </div>
                      )}
                      
                      {req.admin_note && (
                        <p className="text-sm text-slate-400 mt-2">Примечание: {req.admin_note}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="admin-card" data-testid="card-settings">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                {t('admin.cardSettings')}
              </h3>
              <div className="space-y-4">
                <div>
                  <Label>{t('admin.cardForPayments')}</Label>
                  <Input
                    value={adminSettings.card_number}
                    onChange={(e) => setAdminSettings({...adminSettings, card_number: e.target.value})}
                    className="admin-input font-mono text-lg"
                    placeholder="0000 0000 0000 0000"
                    data-testid="card-number-input"
                  />
                </div>
                <div>
                  <Label>Имя держателя карты</Label>
                  <Input
                    value={adminSettings.card_holder}
                    onChange={(e) => setAdminSettings({...adminSettings, card_holder: e.target.value})}
                    className="admin-input"
                    placeholder="IVAN IVANOV"
                  />
                </div>
                <div>
                  <Label>Дополнительная информация</Label>
                  <Input
                    value={adminSettings.additional_info}
                    onChange={(e) => setAdminSettings({...adminSettings, additional_info: e.target.value})}
                    className="admin-input"
                    placeholder="Банк, комментарий к переводу и т.д."
                  />
                </div>
                <Button onClick={handleSaveSettings} className="w-full" data-testid="save-settings-btn">
                  {t('admin.saveSettings')}
                </Button>
              </div>
            </div>

            {/* Admin Profile Settings */}
            <div className="admin-card" data-testid="admin-profile-settings">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Мой профиль / Профили ман
              </h3>
              <div className="space-y-4">
                <div>
                  <Label>Имя / Ном</Label>
                  <Input
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="admin-input"
                    placeholder="Admin"
                    data-testid="admin-name-input"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="admin-input"
                    placeholder="admin@example.com"
                    data-testid="admin-email-input"
                  />
                </div>
                <div>
                  <Label>Новый пароль / Рамзи нав (оставьте пустым если не меняете)</Label>
                  <Input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="admin-input"
                    placeholder="••••••••"
                    data-testid="admin-password-input"
                  />
                </div>
                <div>
                  <Label className="text-yellow-400">Ключевое слово / Калимаи асосӣ *</Label>
                  <Input
                    type="password"
                    value={adminSecretKey}
                    onChange={(e) => setAdminSecretKey(e.target.value)}
                    className="admin-input border-yellow-500"
                    placeholder="Введите ключевое слово"
                    data-testid="admin-secret-input"
                  />
                  <p className="text-xs text-yellow-400 mt-1">Обязательно для сохранения изменений</p>
                </div>
                <Button onClick={handleSaveAdminProfile} className="w-full bg-blue-600 hover:bg-blue-700" data-testid="save-profile-btn">
                  Сохранить профиль / Нигоҳ доштани профил
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4">{t('admin.users')} ({users.length})</h3>
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
                        <p className="text-sm text-slate-400">{u.email}</p>
                        <p className="text-xs text-slate-500">
                          Lvl {u.level} • {u.xp} XP • {u.balance?.toFixed(0)} coins
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditUser(u)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant={u.is_admin ? "destructive" : "outline"} 
                        size="sm"
                        onClick={() => handleToggleAdmin(u.user_id, u.is_admin)}
                        disabled={u.user_id === user?.user_id}
                      >
                        {u.is_admin ? t('admin.removeAdmin') : t('admin.makeAdmin')}
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteUser(u.user_id)}
                        disabled={u.user_id === user?.user_id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="admin-card" data-testid="create-product-form">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> {t('admin.addProduct')}</h3>
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
                    <SelectTrigger className="admin-input"><SelectValue placeholder="Select" /></SelectTrigger>
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
                  <Input value={newProduct.sizes} onChange={(e) => setNewProduct({...newProduct, sizes: e.target.value})} className="admin-input" placeholder="S, M, L" />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Input value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} className="admin-input" required />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full">{t('admin.create')}</Button>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4">{t('admin.products')} ({products.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {products.map((p) => (
                  <div key={p.product_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
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
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> {t('admin.addCategory')}</h3>
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
                  <Button type="submit" className="w-full">{t('admin.create')}</Button>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4">{t('admin.categories')} ({categories.length})</h3>
              <div className="space-y-2">
                {categories.map((c) => (
                  <div key={c.category_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
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

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> {t('admin.addReward')}</h3>
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
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={newReward.is_exclusive} onChange={(e) => setNewReward({...newReward, is_exclusive: e.target.checked})} />
                    Exclusive
                  </label>
                  <Button type="submit">{t('admin.create')}</Button>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4">{t('admin.rewards')} ({rewards.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {rewards.map((r) => (
                  <div key={r.reward_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
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
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> {t('admin.addPrize')}</h3>
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
                  <Button type="submit">{t('admin.create')}</Button>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4">{t('admin.wheel')} ({wheelPrizes.length})</h3>
              <div className="space-y-2">
                {wheelPrizes.map((p) => (
                  <div key={p.prize_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded" style={{ backgroundColor: p.color }} />
                      <div>
                        <p className="font-bold">{p.name}</p>
                        <p className="text-sm text-slate-400">{p.prize_type}: {p.value} • {(p.probability * 100).toFixed(0)}%</p>
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

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4">{t('admin.orders')} ({orders.length})</h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {orders.map((o) => (
                  <div key={o.order_id} className="p-3 bg-slate-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-mono text-sm text-slate-400">{o.order_id}</p>
                      <p className="text-sm">{new Date(o.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm">{o.items?.length || 0} {t('cart.items')}</p>
                      <p className="font-bold text-primary">{o.total} coins • +{o.total_xp} XP</p>
                    </div>
                    {o.delivery_address && (
                      <div className="mt-2 p-2 bg-slate-600 rounded text-sm">
                        <span className="text-slate-400">📍 {t('cart.deliveryAddress')}:</span>
                        <p className="text-white">{o.delivery_address}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="font-bold text-lg mb-4">Edit User: {editingUser.name}</h3>
            <div className="space-y-4">
              <div>
                <Label>Balance</Label>
                <Input
                  type="number"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  className="admin-input"
                />
              </div>
              <div>
                <Label>XP</Label>
                <Input
                  type="number"
                  value={editXP}
                  onChange={(e) => setEditXP(e.target.value)}
                  className="admin-input"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveUserEdit} className="flex-1">{t('common.save')}</Button>
                <Button variant="outline" onClick={() => setEditingUser(null)} className="flex-1">{t('common.cancel')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
