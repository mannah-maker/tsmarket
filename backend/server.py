from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import secrets
import jwt
import bcrypt
import httpx
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

# Create the main app
app = FastAPI(title="TSMarket API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# ==================== MODELS ====================

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    balance: float = 0.0
    xp: int = 0
    level: int = 1
    is_admin: bool = False
    wheel_spins_available: int = 0
    claimed_rewards: List[int] = []
    created_at: datetime

class UserPublic(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    balance: float = 0.0
    xp: int = 0
    level: int = 1
    is_admin: bool = False
    wheel_spins_available: int = 0
    claimed_rewards: List[int] = []

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    category_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:12]}")
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None

class CategoryCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str = Field(default_factory=lambda: f"prod_{uuid.uuid4().hex[:12]}")
    name: str
    description: str
    price: float
    xp_reward: int = 10
    category_id: str
    image_url: str
    sizes: List[str] = []
    stock: int = 100
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    xp_reward: int = 10
    category_id: str
    image_url: str
    sizes: List[str] = []
    stock: int = 100

class CartItem(BaseModel):
    product_id: str
    quantity: int = 1
    size: Optional[str] = None

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    price: float
    quantity: int
    size: Optional[str] = None
    xp_reward: int

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    order_id: str = Field(default_factory=lambda: f"ord_{uuid.uuid4().hex[:12]}")
    user_id: str
    items: List[OrderItem]
    total: float
    total_xp: int
    status: str = "completed"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TopUpCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    code_id: str = Field(default_factory=lambda: f"code_{uuid.uuid4().hex[:12]}")
    code: str
    amount: float
    is_used: bool = False
    used_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TopUpCodeCreate(BaseModel):
    code: str
    amount: float

# New TopUp Request model for card-based payments
class TopUpRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    request_id: str = Field(default_factory=lambda: f"req_{uuid.uuid4().hex[:12]}")
    user_id: str
    user_name: str
    user_email: str
    amount: float
    receipt_url: str  # URL to uploaded receipt image
    status: str = "pending"  # pending, approved, rejected
    admin_note: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None

class TopUpRequestCreate(BaseModel):
    amount: float
    receipt_url: str

class AdminSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    settings_id: str = "admin_settings"
    card_number: str = ""
    card_holder: str = ""
    additional_info: str = ""

class AdminSettingsUpdate(BaseModel):
    card_number: str
    card_holder: str = ""
    additional_info: str = ""

class Reward(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reward_id: str = Field(default_factory=lambda: f"rew_{uuid.uuid4().hex[:12]}")
    level_required: int
    name: str
    description: str
    reward_type: str  # "coins", "xp_boost", "discount", "exclusive"
    value: float
    is_exclusive: bool = False  # For every 10 levels

class RewardCreate(BaseModel):
    level_required: int
    name: str
    description: str
    reward_type: str
    value: float
    is_exclusive: bool = False

class WheelPrize(BaseModel):
    model_config = ConfigDict(extra="ignore")
    prize_id: str = Field(default_factory=lambda: f"prize_{uuid.uuid4().hex[:12]}")
    name: str
    prize_type: str  # "coins", "xp", "discount"
    value: float
    probability: float  # 0.0 to 1.0
    color: str = "#0D9488"

class WheelPrizeCreate(BaseModel):
    name: str
    prize_type: str
    value: float
    probability: float
    color: str = "#0D9488"

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str = Field(default_factory=lambda: f"sess_{uuid.uuid4().hex[:12]}")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_jwt_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def calculate_level(xp: int) -> int:
    """Calculate level from XP. Formula: each level needs base 100 + level*50 XP"""
    level = 1
    xp_needed = 100
    total_xp_for_level = 0
    while xp >= total_xp_for_level + xp_needed:
        total_xp_for_level += xp_needed
        level += 1
        xp_needed = 100 + level * 50
    return level

def xp_for_next_level(current_level: int) -> int:
    """XP needed to reach next level"""
    return 100 + current_level * 50

def total_xp_for_level(level: int) -> int:
    """Total XP accumulated to reach a level"""
    total = 0
    for l in range(1, level):
        total += 100 + l * 50
    return total

async def get_current_user(request: Request) -> Optional[User]:
    # Try cookie first
    session_token = request.cookies.get("session_token")
    
    # Then try Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    # Check session
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    # Check expiry
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        return None
    
    return User(**user)

async def require_user(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_admin(request: Request) -> User:
    user = await require_user(request)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register")
async def register(data: UserCreate, response: Response):
    # Check if user exists
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_data = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "password_hash": hash_password(data.password),
        "picture": None,
        "balance": 0.0,
        "xp": 0,
        "level": 1,
        "is_admin": False,
        "wheel_spins_available": 1,  # 1 free spin on registration
        "claimed_rewards": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_data)
    
    # Create session
    session_token = secrets.token_hex(32)
    session_data = {
        "session_id": f"sess_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_data)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user_data.pop("password_hash", None)
    user_data.pop("_id", None)
    return {"user": user_data, "token": session_token}

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_token = secrets.token_hex(32)
    session_data = {
        "session_id": f"sess_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_data)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user_response = {k: v for k, v in user.items() if k != "password_hash"}
    return {"user": user_response, "token": session_token}

@api_router.post("/auth/session")
async def process_google_session(request: Request, response: Response):
    """Process session_id from Google OAuth"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Fetch user data from Emergent Auth
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        oauth_data = resp.json()
    
    # Check if user exists
    existing = await db.users.find_one({"email": oauth_data["email"]}, {"_id": 0})
    
    if existing:
        user_id = existing["user_id"]
        # Update user data
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": oauth_data.get("name", existing.get("name")),
                "picture": oauth_data.get("picture", existing.get("picture"))
            }}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_data = {
            "user_id": user_id,
            "email": oauth_data["email"],
            "name": oauth_data.get("name", "User"),
            "picture": oauth_data.get("picture"),
            "balance": 0.0,
            "xp": 0,
            "level": 1,
            "is_admin": False,
            "wheel_spins_available": 1,
            "claimed_rewards": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_data)
    
    # Create session
    session_token = oauth_data.get("session_token", secrets.token_hex(32))
    session_data = {
        "session_id": f"sess_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_data)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": user, "token": session_token}

@api_router.get("/auth/me")
async def get_me(user: User = Depends(require_user)):
    return UserPublic(**user.model_dump())

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ==================== CATEGORY ENDPOINTS ====================

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return categories

@api_router.post("/categories", response_model=Category)
async def create_category(data: CategoryCreate, user: User = Depends(require_admin)):
    category = Category(**data.model_dump())
    await db.categories.insert_one(category.model_dump())
    return category

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user: User = Depends(require_admin)):
    result = await db.categories.delete_one({"category_id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# ==================== PRODUCT ENDPOINTS ====================

@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_xp: Optional[int] = None,
    size: Optional[str] = None
):
    query: Dict[str, Any] = {"is_active": True}
    
    if category:
        query["category_id"] = category
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price
    if min_xp is not None:
        query["xp_reward"] = {"$gte": min_xp}
    if size:
        query["sizes"] = size
    
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/products", response_model=Product)
async def create_product(data: ProductCreate, user: User = Depends(require_admin)):
    product = Product(**data.model_dump())
    product_dict = product.model_dump()
    product_dict["created_at"] = product_dict["created_at"].isoformat()
    await db.products.insert_one(product_dict)
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, data: ProductCreate, user: User = Depends(require_admin)):
    result = await db.products.update_one(
        {"product_id": product_id},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    return product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: User = Depends(require_admin)):
    result = await db.products.delete_one({"product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# ==================== ORDER ENDPOINTS ====================

@api_router.post("/orders")
async def create_order(items: List[CartItem], user: User = Depends(require_user)):
    if not items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    order_items = []
    total = 0.0
    total_xp = 0
    
    for item in items:
        product = await db.products.find_one({"product_id": item.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        if item.size and item.size not in product.get("sizes", []):
            raise HTTPException(status_code=400, detail=f"Size {item.size} not available")
        
        item_total = product["price"] * item.quantity
        item_xp = product["xp_reward"] * item.quantity
        
        order_items.append(OrderItem(
            product_id=item.product_id,
            product_name=product["name"],
            price=product["price"],
            quantity=item.quantity,
            size=item.size,
            xp_reward=item_xp
        ))
        
        total += item_total
        total_xp += item_xp
    
    # Check balance
    current_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if current_user["balance"] < total:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Create order
    order = Order(
        user_id=user.user_id,
        items=order_items,
        total=total,
        total_xp=total_xp
    )
    order_dict = order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    order_dict["items"] = [item.model_dump() for item in order_items]
    await db.orders.insert_one(order_dict)
    
    # Remove MongoDB _id from response
    order_dict.pop("_id", None)
    
    # Update user balance and XP
    new_xp = current_user["xp"] + total_xp
    old_level = current_user["level"]
    new_level = calculate_level(new_xp)
    
    # Calculate wheel spins for level up
    levels_gained = new_level - old_level
    new_spins = current_user.get("wheel_spins_available", 0) + levels_gained
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "balance": current_user["balance"] - total,
            "xp": new_xp,
            "level": new_level,
            "wheel_spins_available": new_spins
        }}
    )
    
    return {
        "order": order_dict,
        "xp_gained": total_xp,
        "new_level": new_level,
        "level_up": new_level > old_level
    }

@api_router.get("/orders")
async def get_user_orders(user: User = Depends(require_user)):
    orders = await db.orders.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

# ==================== TOP-UP ENDPOINTS ====================

@api_router.post("/topup/redeem")
async def redeem_topup_code(code: str, user: User = Depends(require_user)):
    topup = await db.topup_codes.find_one({"code": code, "is_used": False}, {"_id": 0})
    if not topup:
        raise HTTPException(status_code=404, detail="Invalid or already used code")
    
    # Mark as used
    await db.topup_codes.update_one(
        {"code": code},
        {"$set": {"is_used": True, "used_by": user.user_id}}
    )
    
    # Add balance
    current = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    new_balance = current["balance"] + topup["amount"]
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"balance": new_balance}}
    )
    
    # Log history
    await db.topup_history.insert_one({
        "history_id": f"hist_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "code": code,
        "amount": topup["amount"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Balance topped up", "amount": topup["amount"], "new_balance": new_balance}

# New card-based top-up system
@api_router.get("/topup/settings")
async def get_topup_settings():
    """Get card payment settings (public endpoint)"""
    settings = await db.admin_settings.find_one({"settings_id": "admin_settings"}, {"_id": 0})
    if not settings:
        return {"card_number": "", "card_holder": "", "additional_info": ""}
    return {
        "card_number": settings.get("card_number", ""),
        "card_holder": settings.get("card_holder", ""),
        "additional_info": settings.get("additional_info", "")
    }

@api_router.post("/topup/request")
async def create_topup_request(data: TopUpRequestCreate, user: User = Depends(require_user)):
    """Create a new top-up request with receipt"""
    request_data = {
        "request_id": f"req_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "user_name": user.name,
        "user_email": user.email,
        "amount": data.amount,
        "receipt_url": data.receipt_url,
        "status": "pending",
        "admin_note": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "processed_at": None
    }
    await db.topup_requests.insert_one(request_data)
    request_data.pop("_id", None)
    return request_data

@api_router.get("/topup/requests")
async def get_user_topup_requests(user: User = Depends(require_user)):
    """Get user's top-up requests"""
    requests = await db.topup_requests.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return requests

@api_router.get("/topup/history")
async def get_topup_history(user: User = Depends(require_user)):
    history = await db.topup_history.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return history

# ==================== REWARDS ENDPOINTS ====================

@api_router.get("/rewards")
async def get_rewards(user: User = Depends(require_user)):
    rewards = await db.rewards.find({}, {"_id": 0}).sort("level_required", 1).to_list(100)
    
    # Mark which rewards user can claim
    for reward in rewards:
        reward["can_claim"] = (
            user.level >= reward["level_required"] and 
            reward["level_required"] not in user.claimed_rewards
        )
        reward["is_claimed"] = reward["level_required"] in user.claimed_rewards
    
    return rewards

@api_router.post("/rewards/claim/{level}")
async def claim_reward(level: int, user: User = Depends(require_user)):
    reward = await db.rewards.find_one({"level_required": level}, {"_id": 0})
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    
    if user.level < level:
        raise HTTPException(status_code=400, detail="Level requirement not met")
    
    if level in user.claimed_rewards:
        raise HTTPException(status_code=400, detail="Reward already claimed")
    
    # Apply reward
    current = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    updates = {"claimed_rewards": current["claimed_rewards"] + [level]}
    
    if reward["reward_type"] == "coins":
        updates["balance"] = current["balance"] + reward["value"]
    elif reward["reward_type"] == "xp_boost":
        updates["xp"] = current["xp"] + int(reward["value"])
    
    await db.users.update_one({"user_id": user.user_id}, {"$set": updates})
    
    return {"message": "Reward claimed", "reward": reward}

# ==================== WHEEL ENDPOINTS ====================

@api_router.get("/wheel/prizes")
async def get_wheel_prizes():
    prizes = await db.wheel_prizes.find({}, {"_id": 0}).to_list(100)
    return prizes

@api_router.post("/wheel/spin")
async def spin_wheel(user: User = Depends(require_user)):
    if user.wheel_spins_available <= 0:
        raise HTTPException(status_code=400, detail="No spins available")
    
    prizes = await db.wheel_prizes.find({}, {"_id": 0}).to_list(100)
    if not prizes:
        raise HTTPException(status_code=404, detail="No prizes configured")
    
    # Weighted random selection
    total_prob = sum(p["probability"] for p in prizes)
    rand = random.uniform(0, total_prob)
    cumulative = 0
    selected_prize = prizes[0]
    
    for prize in prizes:
        cumulative += prize["probability"]
        if rand <= cumulative:
            selected_prize = prize
            break
    
    # Apply prize
    current = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    updates = {"wheel_spins_available": current["wheel_spins_available"] - 1}
    
    if selected_prize["prize_type"] == "coins":
        updates["balance"] = current["balance"] + selected_prize["value"]
    elif selected_prize["prize_type"] == "xp":
        new_xp = current["xp"] + int(selected_prize["value"])
        new_level = calculate_level(new_xp)
        updates["xp"] = new_xp
        updates["level"] = new_level
    
    await db.users.update_one({"user_id": user.user_id}, {"$set": updates})
    
    return {"prize": selected_prize, "spins_remaining": current["wheel_spins_available"] - 1}

# ==================== ADMIN ENDPOINTS ====================

@api_router.get("/admin/stats")
async def get_admin_stats(user: User = Depends(require_admin)):
    users_count = await db.users.count_documents({})
    orders_count = await db.orders.count_documents({})
    products_count = await db.products.count_documents({})
    
    # Total revenue
    orders = await db.orders.find({}, {"total": 1, "_id": 0}).to_list(10000)
    total_revenue = sum(o.get("total", 0) for o in orders)
    
    return {
        "users_count": users_count,
        "orders_count": orders_count,
        "products_count": products_count,
        "total_revenue": total_revenue
    }

@api_router.get("/admin/users")
async def get_all_users(user: User = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.put("/admin/users/{user_id}/admin")
async def toggle_admin(user_id: str, is_admin: bool, user: User = Depends(require_admin)):
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_admin": is_admin}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Admin status updated"}

@api_router.post("/admin/topup-codes", response_model=TopUpCode)
async def create_topup_code(data: TopUpCodeCreate, user: User = Depends(require_admin)):
    existing = await db.topup_codes.find_one({"code": data.code}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Code already exists")
    
    code = TopUpCode(**data.model_dump())
    code_dict = code.model_dump()
    code_dict["created_at"] = code_dict["created_at"].isoformat()
    await db.topup_codes.insert_one(code_dict)
    return code

@api_router.get("/admin/topup-codes")
async def get_topup_codes(user: User = Depends(require_admin)):
    codes = await db.topup_codes.find({}, {"_id": 0}).to_list(1000)
    return codes

@api_router.delete("/admin/topup-codes/{code_id}")
async def delete_topup_code(code_id: str, user: User = Depends(require_admin)):
    result = await db.topup_codes.delete_one({"code_id": code_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Code not found")
    return {"message": "Code deleted"}

# Admin settings for card payments
@api_router.get("/admin/settings")
async def get_admin_settings(user: User = Depends(require_admin)):
    settings = await db.admin_settings.find_one({"settings_id": "admin_settings"}, {"_id": 0})
    if not settings:
        return {"settings_id": "admin_settings", "card_number": "", "card_holder": "", "additional_info": ""}
    return settings

@api_router.put("/admin/settings")
async def update_admin_settings(data: AdminSettingsUpdate, user: User = Depends(require_admin)):
    await db.admin_settings.update_one(
        {"settings_id": "admin_settings"},
        {"$set": {
            "settings_id": "admin_settings",
            "card_number": data.card_number,
            "card_holder": data.card_holder,
            "additional_info": data.additional_info
        }},
        upsert=True
    )
    return {"message": "Settings updated"}

# Top-up requests management
@api_router.get("/admin/topup-requests")
async def get_all_topup_requests(user: User = Depends(require_admin)):
    requests = await db.topup_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return requests

@api_router.put("/admin/topup-requests/{request_id}/approve")
async def approve_topup_request(request_id: str, user: User = Depends(require_admin)):
    req = await db.topup_requests.find_one({"request_id": request_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Update request status
    await db.topup_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "approved",
            "processed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Add balance to user
    target_user = await db.users.find_one({"user_id": req["user_id"]}, {"_id": 0})
    if target_user:
        new_balance = target_user["balance"] + req["amount"]
        await db.users.update_one(
            {"user_id": req["user_id"]},
            {"$set": {"balance": new_balance}}
        )
    
    return {"message": "Request approved", "amount": req["amount"]}

@api_router.put("/admin/topup-requests/{request_id}/reject")
async def reject_topup_request(request_id: str, note: str = "", user: User = Depends(require_admin)):
    req = await db.topup_requests.find_one({"request_id": request_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    await db.topup_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "rejected",
            "admin_note": note,
            "processed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Request rejected"}

# Delete user
@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, user: User = Depends(require_admin)):
    if user_id == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    # Also delete user sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    return {"message": "User deleted"}

# Update user balance (admin)
@api_router.put("/admin/users/{user_id}/balance")
async def update_user_balance(user_id: str, balance: float, user: User = Depends(require_admin)):
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"balance": balance}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Balance updated"}

# Update user XP/Level (admin)
@api_router.put("/admin/users/{user_id}/xp")
async def update_user_xp(user_id: str, xp: int, user: User = Depends(require_admin)):
    new_level = calculate_level(xp)
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"xp": xp, "level": new_level}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "XP updated", "new_level": new_level}

@api_router.post("/admin/rewards", response_model=Reward)
async def create_reward(data: RewardCreate, user: User = Depends(require_admin)):
    reward = Reward(**data.model_dump())
    await db.rewards.insert_one(reward.model_dump())
    return reward

@api_router.delete("/admin/rewards/{reward_id}")
async def delete_reward(reward_id: str, user: User = Depends(require_admin)):
    result = await db.rewards.delete_one({"reward_id": reward_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reward not found")
    return {"message": "Reward deleted"}

@api_router.post("/admin/wheel-prizes", response_model=WheelPrize)
async def create_wheel_prize(data: WheelPrizeCreate, user: User = Depends(require_admin)):
    prize = WheelPrize(**data.model_dump())
    await db.wheel_prizes.insert_one(prize.model_dump())
    return prize

@api_router.delete("/admin/wheel-prizes/{prize_id}")
async def delete_wheel_prize(prize_id: str, user: User = Depends(require_admin)):
    result = await db.wheel_prizes.delete_one({"prize_id": prize_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prize not found")
    return {"message": "Prize deleted"}

@api_router.get("/admin/orders")
async def get_all_orders(user: User = Depends(require_admin)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_database():
    """Seed database with demo data"""
    
    # Check if already seeded
    existing = await db.categories.find_one({})
    if existing:
        return {"message": "Database already seeded"}
    
    # Categories
    categories = [
        {"category_id": "cat_gaming", "name": "Gaming", "slug": "gaming", "description": "Gaming peripherals and accessories"},
        {"category_id": "cat_clothing", "name": "Clothing", "slug": "clothing", "description": "Stylish gaming apparel"},
        {"category_id": "cat_accessories", "name": "Accessories", "slug": "accessories", "description": "Tech accessories"},
        {"category_id": "cat_collectibles", "name": "Collectibles", "slug": "collectibles", "description": "Limited edition items"},
    ]
    await db.categories.insert_many(categories)
    
    # Products
    products = [
        {
            "product_id": "prod_001", "name": "Dragon Gaming Headset", "description": "Premium RGB gaming headset with surround sound",
            "price": 1500, "xp_reward": 150, "category_id": "cat_gaming",
            "image_url": "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500",
            "sizes": [], "stock": 50, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": "prod_002", "name": "Neon Gaming Mouse", "description": "High DPI gaming mouse with customizable lighting",
            "price": 800, "xp_reward": 80, "category_id": "cat_gaming",
            "image_url": "https://images.unsplash.com/photo-1527814050087-3793815479db?w=500",
            "sizes": [], "stock": 100, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": "prod_003", "name": "TSMarket Hoodie", "description": "Premium gaming hoodie with dragon logo",
            "price": 2000, "xp_reward": 200, "category_id": "cat_clothing",
            "image_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500",
            "sizes": ["S", "M", "L", "XL", "XXL"], "stock": 30, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": "prod_004", "name": "Gaming T-Shirt", "description": "Comfortable cotton t-shirt for gamers",
            "price": 1000, "xp_reward": 100, "category_id": "cat_clothing",
            "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500",
            "sizes": ["S", "M", "L", "XL"], "stock": 75, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": "prod_005", "name": "RGB Keyboard", "description": "Mechanical gaming keyboard with Cherry MX switches",
            "price": 2500, "xp_reward": 250, "category_id": "cat_gaming",
            "image_url": "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=500",
            "sizes": [], "stock": 40, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": "prod_006", "name": "Gaming Mousepad XL", "description": "Extended RGB mousepad for full desk coverage",
            "price": 600, "xp_reward": 60, "category_id": "cat_accessories",
            "image_url": "https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?w=500",
            "sizes": [], "stock": 200, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": "prod_007", "name": "Dragon Figurine", "description": "Limited edition TSMarket dragon collectible",
            "price": 5000, "xp_reward": 500, "category_id": "cat_collectibles",
            "image_url": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500",
            "sizes": [], "stock": 10, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": "prod_008", "name": "Gaming Cap", "description": "Snapback cap with embroidered dragon",
            "price": 700, "xp_reward": 70, "category_id": "cat_clothing",
            "image_url": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500",
            "sizes": ["One Size"], "stock": 60, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    await db.products.insert_many(products)
    
    # Rewards
    rewards = [
        {"reward_id": "rew_001", "level_required": 2, "name": "Welcome Bonus", "description": "50 coins for reaching level 2", "reward_type": "coins", "value": 50, "is_exclusive": False},
        {"reward_id": "rew_002", "level_required": 5, "name": "Rising Star", "description": "100 coins for reaching level 5", "reward_type": "coins", "value": 100, "is_exclusive": False},
        {"reward_id": "rew_003", "level_required": 10, "name": "Dragon's Blessing", "description": "500 coins exclusive reward!", "reward_type": "coins", "value": 500, "is_exclusive": True},
        {"reward_id": "rew_004", "level_required": 15, "name": "XP Boost", "description": "200 bonus XP", "reward_type": "xp_boost", "value": 200, "is_exclusive": False},
        {"reward_id": "rew_005", "level_required": 20, "name": "Dragon Master", "description": "1000 coins exclusive reward!", "reward_type": "coins", "value": 1000, "is_exclusive": True},
    ]
    await db.rewards.insert_many(rewards)
    
    # Wheel Prizes
    wheel_prizes = [
        {"prize_id": "prize_001", "name": "10 Coins", "prize_type": "coins", "value": 10, "probability": 0.3, "color": "#0D9488"},
        {"prize_id": "prize_002", "name": "25 Coins", "prize_type": "coins", "value": 25, "probability": 0.25, "color": "#14B8A6"},
        {"prize_id": "prize_003", "name": "50 Coins", "prize_type": "coins", "value": 50, "probability": 0.2, "color": "#F0ABFC"},
        {"prize_id": "prize_004", "name": "100 Coins", "prize_type": "coins", "value": 100, "probability": 0.1, "color": "#FFD700"},
        {"prize_id": "prize_005", "name": "50 XP", "prize_type": "xp", "value": 50, "probability": 0.1, "color": "#FF4D4D"},
        {"prize_id": "prize_006", "name": "200 Coins JACKPOT!", "prize_type": "coins", "value": 200, "probability": 0.05, "color": "#FFD700"},
    ]
    await db.wheel_prizes.insert_many(wheel_prizes)
    
    # Demo top-up codes
    topup_codes = [
        {"code_id": "code_001", "code": "WELCOME100", "amount": 100, "is_used": False, "created_at": datetime.now(timezone.utc).isoformat()},
        {"code_id": "code_002", "code": "DRAGON500", "amount": 500, "is_used": False, "created_at": datetime.now(timezone.utc).isoformat()},
        {"code_id": "code_003", "code": "GAMING1000", "amount": 1000, "is_used": False, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.topup_codes.insert_many(topup_codes)
    
    # Create admin user
    admin_user = {
        "user_id": "user_admin001",
        "email": "admin@tsmarket.com",
        "name": "Admin",
        "password_hash": hash_password("admin123"),
        "picture": None,
        "balance": 10000.0,
        "xp": 5000,
        "level": 15,
        "is_admin": True,
        "wheel_spins_available": 5,
        "claimed_rewards": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_user)
    
    return {"message": "Database seeded successfully"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["https://tsmarket-shop.preview.emergentagent.com", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
