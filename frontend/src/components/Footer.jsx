import React from 'react';
import { Link } from 'react-router-dom';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_tsmarket-shop/artifacts/ku1akclq_%D0%BB%D0%BE%D0%B3%D0%BE.jpg";

export const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src={LOGO_URL} alt="TSMarket" className="h-12 w-12 rounded-full object-cover" />
              <span className="font-bold text-2xl">
                <span className="text-green-400">TS</span>
                <span className="text-teal-400">Market</span>
              </span>
            </div>
            <p className="text-background/70 max-w-md">
              Your ultimate gaming marketplace with rewards, XP system, and exclusive items. 
              Level up your shopping experience!
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/catalog" className="text-background/70 hover:text-primary transition-colors">
                  Catalog
                </Link>
              </li>
              <li>
                <Link to="/rewards" className="text-background/70 hover:text-primary transition-colors">
                  Rewards
                </Link>
              </li>
              <li>
                <Link to="/topup" className="text-background/70 hover:text-primary transition-colors">
                  Top Up Balance
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-bold text-lg mb-4">Account</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/profile" className="text-background/70 hover:text-primary transition-colors">
                  My Profile
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-background/70 hover:text-primary transition-colors">
                  Cart
                </Link>
              </li>
              <li>
                <Link to="/auth" className="text-background/70 hover:text-primary transition-colors">
                  Login / Register
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 mt-12 pt-8 text-center">
          <p className="text-background/50 text-sm">
            © {new Date().getFullYear()} TSMarket. All rights reserved. Level up your game!
          </p>
        </div>
      </div>
    </footer>
  );
};
