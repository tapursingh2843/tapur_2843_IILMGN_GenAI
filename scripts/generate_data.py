import json
from pathlib import Path
import random

LOCATIONS = [
    {"id": "nainital", "name": "Nainital", "lat": 29.3803, "lng": 79.4636},
    {"id": "mussoorie", "name": "Mussoorie", "lat": 30.4598, "lng": 78.0644},
    {"id": "rishikesh", "name": "Rishikesh", "lat": 30.0869, "lng": 78.2676},
    {"id": "auli", "name": "Auli", "lat": 30.531, "lng": 79.566},
    {"id": "chopta", "name": "Chopta", "lat": 30.485, "lng": 79.200},
    {"id": "dehradun", "name": "Dehradun", "lat": 30.3165, "lng": 78.0322},
    {"id": "haridwar", "name": "Haridwar", "lat": 29.9457, "lng": 78.1642},
    {"id": "kedarnath", "name": "Kedarnath", "lat": 30.7346, "lng": 79.0669},
    {"id": "badrinath", "name": "Badrinath", "lat": 30.7433, "lng": 79.4938},
    {"id": "almora", "name": "Almora", "lat": 29.5892, "lng": 79.6467},
    {"id": "mukteshwar", "name": "Mukteshwar", "lat": 29.4724, "lng": 79.3199},
    {"id": "lansdowne", "name": "Lansdowne", "lat": 29.8377, "lng": 78.6875},
    {"id": "jim-corbett", "name": "Jim Corbett", "lat": 29.5300, "lng": 78.7747},
    {"id": "harsil", "name": "Harsil", "lat": 30.9756, "lng": 78.7484}
]

HOTEL_IMAGES = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80"
]

REST_IMAGES = [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80"
]

AMENITIES = ["Free WiFi", "Spa", "Pool", "Restaurant", "Parking", "Room Service", "Bar", "Gym", "Mountain View"]
TAGS = ["Scenic", "Riverside", "Rooftop", "Cozy", "Live Music", "Family Friendly", "Fine Dining", "Local Favorites"]
CUISINES = ["North Indian", "Garhwali", "Kumaoni", "Cafe", "Continental", "Italian", "Chinese", "Tibetan"]

hotels = []
restaurants = []
h_id = 1
r_id = 1

for loc in LOCATIONS:
    # 3 hotels per location
    for i in range(3):
        category = random.choice(["Luxury", "Premium", "Budget", "Resort", "Homestay"])
        price = random.randint(15, 120) * 100
        rating = round(random.uniform(3.5, 4.9), 1)
        h = {
            "id": f"h-{loc['id']}-{i}",
            "destination_id": loc["id"],
            "name": f"{loc['name']} {category} {random.choice(['Lodge', 'Retreat', 'Heights', 'View', 'Resort'])}",
            "location_name": loc["name"],
            "price_per_night": price,
            "rating": rating,
            "lat": loc["lat"] + random.uniform(-0.02, 0.02),
            "lng": loc["lng"] + random.uniform(-0.02, 0.02),
            "image": random.choice(HOTEL_IMAGES),
            "amenities": random.sample(AMENITIES, k=random.randint(3, 6)),
            "availability_status": random.choice(["Available", "Few Rooms Left", "Available"]),
            "contact_number": f"+91 {random.randint(7000000000, 9999999999)}",
            "category": category
        }
        hotels.append(h)
        
    # 3 restaurants per location
    for i in range(3):
        cuisine = random.choice(CUISINES)
        price = random.randint(3, 15) * 100
        rating = round(random.uniform(3.8, 4.9), 1)
        r = {
            "id": f"r-{loc['id']}-{i}",
            "destination_id": loc["id"],
            "name": f"The {loc['name']} {random.choice(['Bistro', 'Cafe', 'Dhaba', 'Diner', 'Kitchen'])}",
            "location_name": loc["name"],
            "cuisine_type": cuisine,
            "average_price": price,
            "rating": rating,
            "opening_hours": "08:00 AM - 10:30 PM",
            "lat": loc["lat"] + random.uniform(-0.02, 0.02),
            "lng": loc["lng"] + random.uniform(-0.02, 0.02),
            "image": random.choice(REST_IMAGES),
            "tags": random.sample(TAGS, k=random.randint(2, 4)),
            "contact_number": f"+91 {random.randint(7000000000, 9999999999)}"
        }
        restaurants.append(r)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

with open(DATA_DIR / "hotels.json", "w", encoding="utf-8") as f:
    json.dump(hotels, f, indent=2)
    
with open(DATA_DIR / "restaurants.json", "w", encoding="utf-8") as f:
    json.dump(restaurants, f, indent=2)

print("Data generated successfully.")
