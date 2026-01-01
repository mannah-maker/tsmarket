import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import { topupAPI } from '../lib/api';
import { Wallet, Gift, ArrowRight, Check, History } from 'lucide-react';
import { toast } from 'sonner';

export const TopUp = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    const fetchHistory = async () => {
      try {
        const res = await topupAPI.getHistory();
        setHistory(res.data);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [isAuthenticated, navigate]);

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter a code');
      return;
    }

    setLoading(true);
    try {
      const res = await topupAPI.redeem(code.trim());
      toast.success(`+${res.data.amount} coins added to your balance!`);
      setCode('');
      await refreshUser();
      
      // Refresh history
      const historyRes = await topupAPI.getHistory();
      setHistory(historyRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid or already used code');
    } finally {
      setLoading(false);
    }
  };

  const demoCodes = [
    { code: 'WELCOME100', amount: 100 },
    { code: 'DRAGON500', amount: 500 },
    { code: 'GAMING1000', amount: 1000 },
  ];

  return (
    <div className="min-h-screen tsmarket-gradient py-8" data-testid="topup-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">Top Up Balance</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Enter your code to add coins to your account
        </p>

        {/* Current Balance */}
        <div className="tsmarket-card p-6 mb-8" data-testid="current-balance">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-3xl font-black text-primary" data-testid="balance-amount">
                  {user?.balance?.toFixed(0) || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Redeem Code Form */}
        <div className="tsmarket-card p-6 mb-8" data-testid="redeem-form">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Redeem Code
          </h2>
          
          <form onSubmit={handleRedeem} className="space-y-4">
            <Input
              placeholder="Enter your code (e.g., WELCOME100)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="tsmarket-input text-lg font-mono uppercase"
              data-testid="code-input"
            />
            <Button
              type="submit"
              className="w-full tsmarket-btn-primary rounded-full py-6"
              disabled={loading}
              data-testid="redeem-btn"
            >
              {loading ? (
                <span className="loading-spinner" />
              ) : (
                <>
                  Redeem Code
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Demo Codes */}
        <div className="tsmarket-card p-6 mb-8 bg-primary/5" data-testid="demo-codes">
          <h3 className="font-bold mb-4">Demo Codes (for testing)</h3>
          <div className="space-y-2">
            {demoCodes.map((demo) => (
              <div
                key={demo.code}
                className="flex items-center justify-between p-3 bg-white rounded-xl"
              >
                <code className="font-mono font-bold">{demo.code}</code>
                <span className="text-primary font-bold">+{demo.amount} coins</span>
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        <div className="tsmarket-card p-6" data-testid="topup-history">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Top-up History
          </h2>

          {historyLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">No top-ups yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
                  data-testid={`history-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-mono font-bold">{item.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-primary">+{item.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
