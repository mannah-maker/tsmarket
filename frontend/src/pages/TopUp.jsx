import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { topupAPI } from '../lib/api';
import { Wallet, Copy, Check, Upload, Clock, CheckCircle, XCircle, Image, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const TopUp = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { t } = useLanguage();
  
  const [settings, setSettings] = useState({ card_number: '', card_holder: '', additional_info: '' });
  const [amount, setAmount] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, requestsRes] = await Promise.all([
        topupAPI.getSettings(),
        topupAPI.getRequests(),
      ]);
      setSettings(settingsRes.data);
      setRequests(requestsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [isAuthenticated, navigate, fetchData]);

  const handleCopyCard = () => {
    navigator.clipboard.writeText(settings.card_number);
    setCopied(true);
    toast.success(t('topup.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptPreview(e.target.result);
        // For demo, use the base64 as URL (in production, upload to storage)
        setReceiptUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Введите сумму / Маблағро ворид кунед');
      return;
    }
    
    if (!receiptUrl) {
      toast.error('Загрузите скриншот чека / Скриншотро боркунӣ кунед');
      return;
    }

    setLoading(true);
    try {
      await topupAPI.createRequest({
        amount: parseFloat(amount),
        receipt_url: receiptUrl,
      });
      toast.success('Заявка отправлена! / Дархост фиристода шуд!');
      setAmount('');
      setReceiptUrl('');
      setReceiptPreview(null);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка / Хатогӣ');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: t('topup.status.pending'),
      approved: t('topup.status.approved'),
      rejected: t('topup.status.rejected'),
    };
    return statusMap[status] || status;
  };

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  return (
    <div className="min-h-screen tsmarket-gradient py-8" data-testid="topup-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">{t('topup.title')}</h1>
        <p className="text-lg text-muted-foreground mb-8">{t('topup.subtitle')}</p>

        {/* Current Balance */}
        <div className="tsmarket-card p-6 mb-8" data-testid="current-balance">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('topup.currentBalance')}</p>
              <p className="text-3xl font-black text-primary" data-testid="balance-amount">
                {user?.balance?.toFixed(0) || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Card Number */}
        {settings.card_number && (
          <div className="tsmarket-card p-6 mb-8 border-2 border-primary/30" data-testid="card-info">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              {t('topup.cardNumber')}
            </h3>
            <div className="flex items-center gap-3 p-4 bg-muted rounded-xl">
              <p className="flex-1 text-2xl font-mono font-bold tracking-wider" data-testid="card-number">
                {settings.card_number}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCard}
                className="rounded-full"
                data-testid="copy-card-btn"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t('topup.copied') : t('topup.copyCard')}
              </Button>
            </div>
            {settings.card_holder && (
              <p className="text-sm text-muted-foreground mt-2">{settings.card_holder}</p>
            )}
            {settings.additional_info && (
              <p className="text-sm text-muted-foreground mt-1">{settings.additional_info}</p>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="tsmarket-card p-6 mb-8 bg-primary/5" data-testid="instructions">
          <h3 className="font-bold mb-4">{t('topup.instructions')}</h3>
          <ol className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
              {t('topup.step1')}
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
              {t('topup.step2')}
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
              {t('topup.step3')}
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
              {t('topup.step4')}
            </li>
          </ol>
        </div>

        {/* Submit Request Form */}
        <form onSubmit={handleSubmit} className="tsmarket-card p-6 mb-8" data-testid="topup-form">
          <h3 className="font-bold mb-4">{t('topup.submitRequest')}</h3>
          
          {/* Amount */}
          <div className="mb-4">
            <label className="text-sm font-bold mb-2 block">{t('topup.amount')}</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              className="tsmarket-input text-lg"
              data-testid="amount-input"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {quickAmounts.map((amt) => (
                <Button
                  key={amt}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(amt.toString())}
                  className="rounded-full"
                >
                  {amt}
                </Button>
              ))}
            </div>
          </div>

          {/* Receipt Upload */}
          <div className="mb-6">
            <label className="text-sm font-bold mb-2 block">{t('topup.uploadReceipt')}</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                data-testid="receipt-input"
              />
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                receiptPreview ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}>
                {receiptPreview ? (
                  <div className="space-y-2">
                    <img 
                      src={receiptPreview} 
                      alt="Receipt preview" 
                      className="max-h-48 mx-auto rounded-lg"
                      data-testid="receipt-preview"
                    />
                    <p className="text-sm text-primary font-bold">✓ Загружено / Боркунӣ шуд</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">{t('topup.dragDrop')}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full tsmarket-btn-primary rounded-full py-6"
            disabled={loading || !amount || !receiptUrl}
            data-testid="submit-request-btn"
          >
            {loading ? (
              <span className="loading-spinner" />
            ) : (
              t('topup.submitRequest')
            )}
          </Button>
        </form>

        {/* Request History */}
        <div className="tsmarket-card p-6" data-testid="request-history">
          <h3 className="font-bold mb-4">{t('topup.requestHistory')}</h3>
          
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">{t('topup.noRequests')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.request_id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
                  data-testid={`request-${req.request_id}`}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(req.status)}
                    <div>
                      <p className="font-bold text-xl text-primary">+{req.amount}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                      req.status === 'approved' ? 'bg-green-100 text-green-700' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {getStatusText(req.status)}
                    </span>
                    {req.admin_note && (
                      <p className="text-xs text-muted-foreground mt-1">{req.admin_note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
