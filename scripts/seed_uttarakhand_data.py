"""One-off helper: append checkpoints and hotels for Uttarakhand destinations missing them."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

IMAGES = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80",
]


def ring(lat: float, lng: float, n: int = 6):
    pts = []
    for i in range(n):
        pts.append(
            (
                lat + 0.008 * i * 0.7,
                lng + 0.006 * ((i % 3) - 1),
            )
        )
    return pts


def main():
    dests = json.loads((DATA / "destinations.json").read_text(encoding="utf-8"))
    uk_ids = {d["id"] for d in dests if d["state"] == "Uttarakhand"}

    cp_path = DATA / "checkpoints.json"
    blocks = json.loads(cp_path.read_text(encoding="utf-8"))
    have_cp = {b["destination_id"] for b in blocks}
    new_blocks = []
    for d in dests:
        if d["id"] not in uk_ids or d["id"] in have_cp:
            continue
        lat, lng = d["lat"], d["lng"]
        pts = ring(lat, lng)
        names = [
            f"Base: {d['name']}",
            "Ridge viewpoint",
            "Forest / meadow stretch",
            "Trail junction",
            "High camp approach",
            "Summit / shrine precinct",
        ]
        safe = d["id"].replace("-", "")[:5]
        cps = []
        for i, ((la, ln), nm) in enumerate(zip(pts, names), 1):
            cps.append(
                {
                    "id": f"{safe}-cp{i}",
                    "name": nm,
                    "lat": round(la, 6),
                    "lng": round(ln, 6),
                    "order": i,
                }
            )
        new_blocks.append({"destination_id": d["id"], "checkpoints": cps})
    blocks.extend(new_blocks)
    cp_path.write_text(json.dumps(blocks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    hotels_path = DATA / "hotels.json"
    hotels = json.loads(hotels_path.read_text(encoding="utf-8"))
    have_h = {h["destination_id"] for h in hotels}
    hid = 9000
    for d in dests:
        if d["id"] not in uk_ids or d["id"] in have_h:
            continue
        lat, lng = d["lat"], d["lng"]
        pairs = [
            (3200, 4.2, IMAGES[0]),
            (2400, 4.4, IMAGES[1]),
        ]
        for j, (price, rating, img) in enumerate(pairs, start=1):
            hid += 1
            hotels.append(
                {
                    "id": f"h-uk-{hid}",
                    "destination_id": d["id"],
                    "name": f"{d['name']} Mountain Lodge {j}",
                    "price_per_night": price,
                    "rating": round(min(rating, 4.9), 1),
                    "lat": round(lat + 0.002 * j, 4),
                    "lng": round(lng + 0.002 * j, 4),
                    "image": img,
                }
            )

    hotels_path.write_text(json.dumps(hotels, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Checkpoints: added {len(new_blocks)} blocks")
    print(f"Hotels: total {len(hotels)} rows")


if __name__ == "__main__":
    main()
