import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../context/AuthContext';
import { ordersAPI } from '../lib/api';
import { Wallet, Sparkles, Gift, ShoppingBag, Calendar, Trophy, Settings } from 'lucide-react';

export const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    const fetchOrders = async () => {
      try {
        const res = await ordersAPI.getAll();
        setOrders(res.data);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) return null;

  // Calculate XP progress
  const xpForCurrentLevel = calculateTotalXPForLevel(user.level);
  const xpForNextLevel = calculateTotalXPForLevel(user.level + 1);
  const xpInCurrentLevel = user.xp - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = Math.min((xpInCurrentLevel / xpNeededForLevel) * 100, 100);

  function calculateTotalXPForLevel(level) {
    let total = 0;
    for (let l = 1; l < level; l++) {
      total += 100 + l * 50;
    }
    return total;
  }

  return (
    <div className="min-h-screen tsmarket-gradient py-8" data-testid="profile-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="tsmarket-card p-8 mb-8" data-testid="profile-header">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/30"
                  data-testid="profile-avatar"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center ring-4 ring-primary/30">
                  <span className="text-primary-foreground font-black text-3xl">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 level-badge" data-testid="profile-level">
                {user.level}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold" data-testid="profile-name">{user.name}</h1>
              <p className="text-muted-foreground" data-testid="profile-email">{user.email}</p>
              
              {/* Level Progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-bold">Level {user.level}</span>
                  <span className="text-muted-foreground">
                    {xpInCurrentLevel} / {xpNeededForLevel} XP
                  </span>
                </div>
                <Progress value={progressPercent} className="h-3" data-testid="xp-progress" />
                <p className="text-xs text-muted-foreground mt-1">
                  {xpNeededForLevel - xpInCurrentLevel} XP to level {user.level + 1}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4">
              <div className="text-center p-4 bg-primary/10 rounded-2xl">
                <Wallet className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-2xl font-black text-primary" data-testid="profile-balance">
                  {user.balance?.toFixed(0) || 0}
                </p>
                <p className="text-xs text-muted-foreground">Balance</p>
              </div>
              <div className="text-center p-4 bg-secondary/20 rounded-2xl">
                <Sparkles className="w-6 h-6 text-secondary-foreground mx-auto mb-1" />
                <p className="text-2xl font-black text-secondary-foreground" data-testid="profile-xp">
                  {user.xp || 0}
                </p>
                <p className="text-xs text-muted-foreground">Total XP</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link to="/topup" className="tsmarket-card p-4 text-center hover:border-primary/50 transition-colors" data-testid="quick-topup">
            <Wallet className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-bold">Top Up</p>
          </Link>
          <Link to="/rewards" className="tsmarket-card p-4 text-center hover:border-primary/50 transition-colors" data-testid="quick-rewards">
            <Gift className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-bold">Rewards</p>
            {user.wheel_spins_available > 0 && (
              <span className="text-xs text-secondary-foreground bg-secondary/30 px-2 py-1 rounded-full">
                {user.wheel_spins_available} spins!
              </span>
            )}
          </Link>
          <Link to="/catalog" className="tsmarket-card p-4 text-center hover:border-primary/50 transition-colors" data-testid="quick-shop">
            <ShoppingBag className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-bold">Shop</p>
          </Link>
          {isAdmin && (
            <Link to="/admin" className="tsmarket-card p-4 text-center hover:border-destructive/50 transition-colors border-destructive/30" data-testid="quick-admin">
              <Settings className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="font-bold text-destructive">Admin</p>
            </Link>
          )}
        </div>

        {/* Order History */}
        <div className="tsmarket-card p-6" data-testid="order-history">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Order History
          </h2>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">No orders yet</p>
              <Link to="/catalog">
                <Button className="mt-4 rounded-full" variant="outline">
                  Start Shopping
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.order_id}
                  className="p-4 bg-muted/50 rounded-xl"
                  data-testid={`order-${order.order_id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-full">
                      {order.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">{order.items?.length || 0} items</p>
                      <p className="text-sm text-muted-foreground">
                        {order.items?.map((i) => i.product_name).join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-primary">{order.total}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        +{order.total_xp} XP
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Achievements */}
        <div className="tsmarket-card p-6 mt-8" data-testid="achievements">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Achievements
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl text-center ${user.level >= 5 ? 'bg-primary/10' : 'bg-muted opacity-50'}`}>
              <div className="text-2xl mb-1">🌟</div>
              <p className="text-sm font-bold">Rising Star</p>
              <p className="text-xs text-muted-foreground">Reach Level 5</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${user.level >= 10 ? 'bg-primary/10' : 'bg-muted opacity-50'}`}>
              <div className="text-2xl mb-1">🐉</div>
              <p className="text-sm font-bold">Dragon Slayer</p>
              <p className="text-xs text-muted-foreground">Reach Level 10</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${orders.length >= 5 ? 'bg-primary/10' : 'bg-muted opacity-50'}`}>
              <div className="text-2xl mb-1">🛒</div>
              <p className="text-sm font-bold">Shopper</p>
              <p className="text-xs text-muted-foreground">5 Orders</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${user.xp >= 1000 ? 'bg-primary/10' : 'bg-muted opacity-50'}`}>
              <div className="text-2xl mb-1">✨</div>
              <p className="text-sm font-bold">XP Hunter</p>
              <p className="text-xs text-muted-foreground">1000 XP</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
