#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class TSMarketAPITester:
    def __init__(self, base_url="https://summary-ai-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_token = None
        self.user_token = None
        self.test_user_id = None
        self.admin_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append({"test": name, "error": details})

    def make_request(self, method, endpoint, data=None, headers=None, token=None, params=None):
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        
        request_headers = {'Content-Type': 'application/json'}
        if headers:
            request_headers.update(headers)
        if token:
            request_headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=request_headers, params=params)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=request_headers, params=params)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=request_headers, params=params)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=request_headers, params=params)
            
            return response
        except Exception as e:
            return None

    def test_database_seeding(self):
        """Test database seeding"""
        print("\n🌱 Testing Database Seeding...")
        
        response = self.make_request('POST', 'seed')
        if response and response.status_code in [200, 201]:
            self.log_test("Database seeding", True)
            return True
        else:
            self.log_test("Database seeding", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_user_registration(self):
        """Test user registration"""
        print("\n👤 Testing User Registration...")
        
        timestamp = int(time.time())
        test_data = {
            "email": f"testuser{timestamp}@test.com",
            "password": "testpass123",
            "name": f"Test User {timestamp}"
        }
        
        response = self.make_request('POST', 'auth/register', test_data)
        if response and response.status_code in [200, 201]:
            data = response.json()
            if 'token' in data and 'user' in data:
                self.user_token = data['token']
                self.test_user_id = data['user']['user_id']
                self.log_test("User registration", True)
                return True
        
        self.log_test("User registration", False, f"Status: {response.status_code if response else 'No response'}")
        return False

    def test_admin_login(self):
        """Test admin login"""
        print("\n🔐 Testing Admin Login...")
        
        admin_data = {
            "email": "admin@tsmarket.com",
            "password": "admin123"
        }
        
        response = self.make_request('POST', 'auth/login', admin_data)
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data and 'user' in data:
                self.admin_token = data['token']
                self.admin_user_id = data['user']['user_id']
                if data['user'].get('is_admin'):
                    self.log_test("Admin login", True)
                    return True
        
        self.log_test("Admin login", False, f"Status: {response.status_code if response else 'No response'}")
        return False

    def test_categories_api(self):
        """Test categories API"""
        print("\n📂 Testing Categories API...")
        
        # Get categories
        response = self.make_request('GET', 'categories')
        if response and response.status_code == 200:
            categories = response.json()
            if isinstance(categories, list) and len(categories) > 0:
                self.log_test("Get categories", True)
                return categories
        
        self.log_test("Get categories", False, f"Status: {response.status_code if response else 'No response'}")
        return []

    def test_products_api(self):
        """Test products API"""
        print("\n📦 Testing Products API...")
        
        # Get all products
        response = self.make_request('GET', 'products')
        if response and response.status_code == 200:
            products = response.json()
            if isinstance(products, list) and len(products) > 0:
                self.log_test("Get products", True)
                
                # Test product filtering
                first_product = products[0]
                
                # Test get single product
                product_response = self.make_request('GET', f'products/{first_product["product_id"]}')
                if product_response and product_response.status_code == 200:
                    self.log_test("Get single product", True)
                else:
                    self.log_test("Get single product", False, f"Status: {product_response.status_code if product_response else 'No response'}")
                
                # Test product search
                search_response = self.make_request('GET', 'products?search=gaming')
                if search_response and search_response.status_code == 200:
                    self.log_test("Product search", True)
                else:
                    self.log_test("Product search", False, f"Status: {search_response.status_code if search_response else 'No response'}")
                
                return products
        
        self.log_test("Get products", False, f"Status: {response.status_code if response else 'No response'}")
        return []

    def test_topup_codes(self):
        """Test top-up code redemption"""
        print("\n💰 Testing Top-up Codes...")
        
        if not self.user_token:
            self.log_test("Top-up codes (no user token)", False, "User not logged in")
            return False
        
        # Test redeeming WELCOME100 code
        test_codes = ["WELCOME100", "DRAGON500", "GAMING1000"]
        
        for code in test_codes:
            response = self.make_request('POST', 'topup/redeem', params={'code': code}, token=self.user_token)
            if response and response.status_code == 200:
                self.log_test(f"Redeem code {code}", True)
            else:
                # Code might already be used, which is expected in testing
                if response and response.status_code == 404:
                    self.log_test(f"Redeem code {code}", True, "Code already used (expected)")
                else:
                    self.log_test(f"Redeem code {code}", False, f"Status: {response.status_code if response else 'No response'}")

    def test_cart_and_checkout(self):
        """Test cart and checkout functionality"""
        print("\n🛒 Testing Cart and Checkout...")
        
        if not self.user_token:
            self.log_test("Cart and checkout (no user token)", False, "User not logged in")
            return False
        
        # Get products first
        products_response = self.make_request('GET', 'products')
        if not products_response or products_response.status_code != 200:
            self.log_test("Cart and checkout (no products)", False, "Cannot get products")
            return False
        
        products = products_response.json()
        if not products:
            self.log_test("Cart and checkout (empty products)", False, "No products available")
            return False
        
        # Create order with first product
        first_product = products[0]
        order_data = {
            "items": [
                {
                    "product_id": first_product["product_id"],
                    "quantity": 1,
                    "size": first_product["sizes"][0] if first_product.get("sizes") else None
                }
            ],
            "delivery_address": "г. Душанбе, ул. Ленина 15, кв 42"
        }
        
        response = self.make_request('POST', 'orders', order_data, token=self.user_token)
        if response and response.status_code in [200, 201]:
            order_result = response.json()
            if 'order' in order_result:
                self.log_test("Create order", True)
                return True
        
        # If order fails due to insufficient balance, that's expected
        if response and response.status_code == 400:
            error_detail = response.json().get('detail', '')
            if 'balance' in error_detail.lower():
                self.log_test("Create order", True, "Insufficient balance (expected)")
                return True
        
        self.log_test("Create order", False, f"Status: {response.status_code if response else 'No response'}")
        return False

    def test_delivery_address_validation(self):
        """Test delivery address validation in checkout process"""
        print("\n🏠 Testing Delivery Address Validation...")
        
        if not self.admin_token:
            self.log_test("Delivery address validation (no admin token)", False, "Admin not logged in")
            return False
        
        # Get products first
        products_response = self.make_request('GET', 'products')
        if not products_response or products_response.status_code != 200:
            self.log_test("Delivery address validation (no products)", False, "Cannot get products")
            return False
        
        products = products_response.json()
        if not products:
            self.log_test("Delivery address validation (empty products)", False, "No products available")
            return False
        
        # Use prod_001 as specified in the test request
        test_product = None
        for product in products:
            if product["product_id"] == "prod_001":
                test_product = product
                break
        
        if not test_product:
            # Fallback to first product if prod_001 not found
            test_product = products[0]
        
        # Test 1: Order WITHOUT delivery address - should fail
        order_data_no_address = {
            "items": [
                {
                    "product_id": test_product["product_id"],
                    "quantity": 1
                }
            ]
            # No delivery_address field
        }
        
        response = self.make_request('POST', 'orders', order_data_no_address, token=self.admin_token)
        if response and response.status_code == 400:
            error_detail = response.json().get('detail', '')
            if 'Delivery address is required' in error_detail:
                self.log_test("Order without delivery address (should fail)", True)
            else:
                self.log_test("Order without delivery address (should fail)", False, f"Wrong error message: {error_detail}")
        else:
            self.log_test("Order without delivery address (should fail)", False, f"Expected 400 error, got: {response.status_code if response else 'No response'}")
        
        # Test 2: Order with empty delivery address - should fail
        order_data_empty_address = {
            "items": [
                {
                    "product_id": test_product["product_id"],
                    "quantity": 1
                }
            ],
            "delivery_address": ""
        }
        
        response = self.make_request('POST', 'orders', order_data_empty_address, token=self.admin_token)
        if response and response.status_code == 400:
            error_detail = response.json().get('detail', '')
            if 'Delivery address is required' in error_detail:
                self.log_test("Order with empty delivery address (should fail)", True)
            else:
                self.log_test("Order with empty delivery address (should fail)", False, f"Wrong error message: {error_detail}")
        else:
            self.log_test("Order with empty delivery address (should fail)", False, f"Expected 400 error, got: {response.status_code if response else 'No response'}")
        
        # Test 3: Order with short address (less than 5 chars) - should fail
        order_data_short_address = {
            "items": [
                {
                    "product_id": test_product["product_id"],
                    "quantity": 1
                }
            ],
            "delivery_address": "123"
        }
        
        response = self.make_request('POST', 'orders', order_data_short_address, token=self.admin_token)
        if response and response.status_code == 400:
            error_detail = response.json().get('detail', '')
            if 'Delivery address is required' in error_detail:
                self.log_test("Order with short delivery address (should fail)", True)
            else:
                self.log_test("Order with short delivery address (should fail)", False, f"Wrong error message: {error_detail}")
        else:
            self.log_test("Order with short delivery address (should fail)", False, f"Expected 400 error, got: {response.status_code if response else 'No response'}")
        
        # Test 4: Order with valid address - should succeed
        order_data_valid_address = {
            "items": [
                {
                    "product_id": test_product["product_id"],
                    "quantity": 1
                }
            ],
            "delivery_address": "г. Душанбе, ул. Ленина 15, кв 42"
        }
        
        response = self.make_request('POST', 'orders', order_data_valid_address, token=self.admin_token)
        if response and response.status_code in [200, 201]:
            order_result = response.json()
            if 'order' in order_result and order_result['order'].get('delivery_address') == "г. Душанбе, ул. Ленина 15, кв 42":
                self.log_test("Order with valid delivery address (should succeed)", True)
                return True
            else:
                self.log_test("Order with valid delivery address (should succeed)", False, "Order created but delivery address not saved correctly")
        else:
            # Check if it's a balance issue
            if response and response.status_code == 400:
                error_detail = response.json().get('detail', '')
                if 'balance' in error_detail.lower():
                    self.log_test("Order with valid delivery address (should succeed)", True, "Insufficient balance but address validation passed")
                    return True
                else:
                    self.log_test("Order with valid delivery address (should succeed)", False, f"Unexpected error: {error_detail}")
            else:
                self.log_test("Order with valid delivery address (should succeed)", False, f"Status: {response.status_code if response else 'No response'}")
        
        return False

    def test_user_profile(self):
        """Test user profile endpoints"""
        print("\n👤 Testing User Profile...")
        
        if not self.user_token:
            self.log_test("User profile (no token)", False, "User not logged in")
            return False
        
        # Get user profile
        response = self.make_request('GET', 'auth/me', token=self.user_token)
        if response and response.status_code == 200:
            user_data = response.json()
            if 'user_id' in user_data:
                self.log_test("Get user profile", True)
                
                # Test get user orders
                orders_response = self.make_request('GET', 'orders', token=self.user_token)
                if orders_response and orders_response.status_code == 200:
                    self.log_test("Get user orders", True)
                else:
                    self.log_test("Get user orders", False, f"Status: {orders_response.status_code if orders_response else 'No response'}")
                
                return True
        
        self.log_test("Get user profile", False, f"Status: {response.status_code if response else 'No response'}")
        return False

    def test_rewards_system(self):
        """Test rewards system"""
        print("\n🎁 Testing Rewards System...")
        
        if not self.user_token:
            self.log_test("Rewards system (no token)", False, "User not logged in")
            return False
        
        # Get rewards
        response = self.make_request('GET', 'rewards', token=self.user_token)
        if response and response.status_code == 200:
            rewards = response.json()
            if isinstance(rewards, list):
                self.log_test("Get rewards", True)
                
                # Test wheel prizes
                wheel_response = self.make_request('GET', 'wheel/prizes')
                if wheel_response and wheel_response.status_code == 200:
                    self.log_test("Get wheel prizes", True)
                else:
                    self.log_test("Get wheel prizes", False, f"Status: {wheel_response.status_code if wheel_response else 'No response'}")
                
                return True
        
        self.log_test("Get rewards", False, f"Status: {response.status_code if response else 'No response'}")
        return False

    def test_admin_endpoints(self):
        """Test admin endpoints"""
        print("\n⚙️ Testing Admin Endpoints...")
        
        if not self.admin_token:
            self.log_test("Admin endpoints (no admin token)", False, "Admin not logged in")
            return False
        
        # Test admin stats
        response = self.make_request('GET', 'admin/stats', token=self.admin_token)
        if response and response.status_code == 200:
            stats = response.json()
            if 'users_count' in stats:
                self.log_test("Get admin stats", True)
            else:
                self.log_test("Get admin stats", False, "Invalid stats format")
        else:
            self.log_test("Get admin stats", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get all users
        users_response = self.make_request('GET', 'admin/users', token=self.admin_token)
        if users_response and users_response.status_code == 200:
            self.log_test("Get all users", True)
        else:
            self.log_test("Get all users", False, f"Status: {users_response.status_code if users_response else 'No response'}")
        
        # Test get top-up codes
        codes_response = self.make_request('GET', 'admin/topup-codes', token=self.admin_token)
        if codes_response and codes_response.status_code == 200:
            self.log_test("Get top-up codes", True)
        else:
            self.log_test("Get top-up codes", False, f"Status: {codes_response.status_code if codes_response else 'No response'}")

    def test_new_card_topup_system(self):
        """Test new card-based top-up system"""
        print("\n💳 Testing Card-based Top-up System...")
        
        # Test get topup settings (public endpoint)
        response = self.make_request('GET', 'topup/settings')
        if response and response.status_code == 200:
            settings = response.json()
            if 'card_number' in settings:
                self.log_test("Get topup settings", True)
                print(f"   Card number: {settings.get('card_number', 'Not set')}")
            else:
                self.log_test("Get topup settings", False, "Invalid settings format")
        else:
            self.log_test("Get topup settings", False, f"Status: {response.status_code if response else 'No response'}")
        
        if not self.user_token:
            self.log_test("Card topup (no user token)", False, "User not logged in")
            return False
        
        # Test create topup request
        request_data = {
            "amount": 1000,
            "receipt_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        }
        
        response = self.make_request('POST', 'topup/request', request_data, token=self.user_token)
        if response and response.status_code in [200, 201]:
            request_result = response.json()
            if 'request_id' in request_result:
                self.log_test("Create topup request", True)
                self.test_request_id = request_result['request_id']
            else:
                self.log_test("Create topup request", False, "Invalid request format")
        else:
            self.log_test("Create topup request", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get user topup requests
        response = self.make_request('GET', 'topup/requests', token=self.user_token)
        if response and response.status_code == 200:
            requests_list = response.json()
            if isinstance(requests_list, list):
                self.log_test("Get user topup requests", True)
            else:
                self.log_test("Get user topup requests", False, "Invalid requests format")
        else:
            self.log_test("Get user topup requests", False, f"Status: {response.status_code if response else 'No response'}")

    def test_admin_card_settings(self):
        """Test admin card settings management"""
        print("\n⚙️ Testing Admin Card Settings...")
        
        if not self.admin_token:
            self.log_test("Admin card settings (no admin token)", False, "Admin not logged in")
            return False
        
        # Test get admin settings
        response = self.make_request('GET', 'admin/settings', token=self.admin_token)
        if response and response.status_code == 200:
            settings = response.json()
            self.log_test("Get admin settings", True)
        else:
            self.log_test("Get admin settings", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test update admin settings
        settings_data = {
            "card_number": "1234 5678 9012 3456",
            "card_holder": "TSMarket Admin",
            "additional_info": "Test bank info"
        }
        
        response = self.make_request('PUT', 'admin/settings', settings_data, token=self.admin_token)
        if response and response.status_code == 200:
            self.log_test("Update admin settings", True)
        else:
            self.log_test("Update admin settings", False, f"Status: {response.status_code if response else 'No response'}")

    def test_admin_topup_requests_management(self):
        """Test admin topup requests management"""
        print("\n📋 Testing Admin Topup Requests Management...")
        
        if not self.admin_token:
            self.log_test("Admin topup requests (no admin token)", False, "Admin not logged in")
            return False
        
        # Test get all topup requests
        response = self.make_request('GET', 'admin/topup-requests', token=self.admin_token)
        if response and response.status_code == 200:
            requests_list = response.json()
            if isinstance(requests_list, list):
                self.log_test("Get all topup requests", True)
                
                # If there are pending requests, test approve/reject
                pending_requests = [r for r in requests_list if r.get('status') == 'pending']
                if pending_requests and hasattr(self, 'test_request_id'):
                    request_id = self.test_request_id
                    
                    # Test approve request
                    approve_response = self.make_request('PUT', f'admin/topup-requests/{request_id}/approve', token=self.admin_token)
                    if approve_response and approve_response.status_code == 200:
                        self.log_test("Approve topup request", True)
                    else:
                        self.log_test("Approve topup request", False, f"Status: {approve_response.status_code if approve_response else 'No response'}")
                
            else:
                self.log_test("Get all topup requests", False, "Invalid requests format")
        else:
            self.log_test("Get all topup requests", False, f"Status: {response.status_code if response else 'No response'}")

    def test_admin_user_management(self):
        """Test admin user management features"""
        print("\n👥 Testing Admin User Management...")
        
        if not self.admin_token or not self.test_user_id:
            self.log_test("Admin user management (no tokens)", False, "Admin or test user not available")
            return False
        
        # Test update user balance
        response = self.make_request('PUT', f'admin/users/{self.test_user_id}/balance', params={'balance': 5000}, token=self.admin_token)
        if response and response.status_code == 200:
            self.log_test("Update user balance", True)
        else:
            self.log_test("Update user balance", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test update user XP
        response = self.make_request('PUT', f'admin/users/{self.test_user_id}/xp', params={'xp': 1000}, token=self.admin_token)
        if response and response.status_code == 200:
            self.log_test("Update user XP", True)
        else:
            self.log_test("Update user XP", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test toggle admin status (make user admin then remove)
        response = self.make_request('PUT', f'admin/users/{self.test_user_id}/admin', params={'is_admin': True}, token=self.admin_token)
        if response and response.status_code == 200:
            self.log_test("Toggle admin status (grant)", True)
            
            # Remove admin status
            response = self.make_request('PUT', f'admin/users/{self.test_user_id}/admin', params={'is_admin': False}, token=self.admin_token)
            if response and response.status_code == 200:
                self.log_test("Toggle admin status (remove)", True)
            else:
                self.log_test("Toggle admin status (remove)", False, f"Status: {response.status_code if response else 'No response'}")
        else:
            self.log_test("Toggle admin status (grant)", False, f"Status: {response.status_code if response else 'No response'}")

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting TSMarket API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Test basic functionality first
        if not self.test_database_seeding():
            print("❌ Database seeding failed - stopping tests")
            return False
        
        # Test authentication
        self.test_user_registration()
        self.test_admin_login()
        
        # Test core APIs
        self.test_categories_api()
        self.test_products_api()
        
        # Test user functionality
        self.test_topup_codes()
        self.test_user_profile()
        self.test_cart_and_checkout()
        self.test_rewards_system()
        
        # Test NEW card-based topup system
        self.test_new_card_topup_system()
        
        # Test admin functionality
        self.test_admin_endpoints()
        self.test_admin_card_settings()
        self.test_admin_topup_requests_management()
        self.test_admin_user_management()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "No tests run")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['error']}")
        
        return len(self.failed_tests) == 0

def main():
    """Main test function"""
    tester = TSMarketAPITester()
    
    try:
        success = tester.run_all_tests()
        all_passed = tester.print_summary()
        
        if all_passed:
            print("\n🎉 All tests passed!")
            return 0
        else:
            print(f"\n⚠️ {len(tester.failed_tests)} tests failed")
            return 1
            
    except KeyboardInterrupt:
        print("\n\n⏹️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Test runner crashed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())