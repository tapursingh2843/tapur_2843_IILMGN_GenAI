"""
DevBhoomi Escapes — Flask application.
Serves pages and JSON-backed APIs for destinations, hotels, checkpoints, and restrictions.
"""
import json
import os
from pathlib import Path

from flask import Flask, abort, jsonify, render_template, request

# Paths relative to this file
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

try:
    from dotenv import load_dotenv

    load_dotenv(BASE_DIR / ".env")
except Exception:
    # Optional dependency: app still runs if python-dotenv isn't installed.
    pass

app = Flask(__name__)


@app.template_filter("inr")
def format_inr(value):
    """Format integers with Indian-style grouping for display."""
    try:
        return f"{int(value):,}"
    except (TypeError, ValueError):
        return str(value)


def _read_json(filename: str):
    """Load a JSON file from /data with UTF-8 encoding."""
    path = DATA_DIR / filename
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def load_destinations():
    return _read_json("destinations.json")


def load_hotels():
    return _read_json("hotels.json")


def load_restaurants():
    try:
        return _read_json("restaurants.json")
    except Exception:
        return []


def load_checkpoints_bundle():
    return _read_json("checkpoints.json")


def load_restrictions():
    data = _read_json("restrictions.json")
    return data if isinstance(data, dict) else {}


def get_destination_by_slug(slug: str):
    for d in load_destinations():
        if d.get("slug") == slug:
            return d
    return None


def hotels_for_destination(destination_id: str):
    return [h for h in load_hotels() if h.get("destination_id") == destination_id]


def checkpoints_for_destination(destination_id: str):
    for block in load_checkpoints_bundle():
        if block.get("destination_id") == destination_id:
            return block.get("checkpoints", [])
    return []


@app.context_processor
def inject_globals():
    """Expose maps key and nav destinations to all templates."""
    return {
        "maps_api_key": os.environ.get("GOOGLE_MAPS_API_KEY", ""),
        "nav_destinations": load_destinations(),
    }


@app.route("/")
def login():
    return render_template("login.html")


@app.route("/home")
def home():
    destinations = load_destinations()
    return render_template("index.html", destinations=destinations)


@app.route("/explore")
def explore():
    destinations = load_destinations()
    return render_template("explore.html", destinations=destinations)


@app.route("/destination/<slug>")
def destination_detail(slug: str):
    dest = get_destination_by_slug(slug)
    if not dest:
        abort(404)
    hotels = hotels_for_destination(dest["id"])
    checkpoints = checkpoints_for_destination(dest["id"])
    restrictions = load_restrictions()
    restriction = restrictions.get(slug)
    return render_template(
        "destination.html",
        destination=dest,
        hotels=hotels,
        checkpoints=checkpoints,
        restriction=restriction,
    )


@app.route("/planner")
def planner():
    destinations = load_destinations()
    return render_template("planner.html", destinations=destinations)


@app.route("/hotels")
def hotels():
    destinations = load_destinations()
    return render_template("hotels.html", destinations=destinations)


@app.route("/restaurants")
def restaurants():
    destinations = load_destinations()
    return render_template("restaurants.html", destinations=destinations)


@app.route("/profile")
def profile():
    destinations = load_destinations()
    return render_template("profile.html", destinations=destinations)

@app.route("/map")
def live_map():
    destinations = load_destinations()
    return render_template("map.html", destinations=destinations)


@app.route("/api/destinations")
def api_destinations():
    return jsonify(load_destinations())


@app.route("/api/destination/<slug>")
def api_destination(slug: str):
    dest = get_destination_by_slug(slug)
    if not dest:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dest)


@app.route("/api/hotels")
def api_hotels():
    dest_id = request.args.get("destination_id")
    if dest_id:
        return jsonify(hotels_for_destination(dest_id))
    return jsonify(load_hotels())


@app.route("/api/restaurants")
def api_restaurants():
    dest_id = request.args.get("destination_id")
    all_rests = load_restaurants()
    if dest_id:
        return jsonify([r for r in all_rests if r.get("destination_id") == dest_id])
    return jsonify(all_rests)


@app.route("/api/checkpoints/<destination_id>")
def api_checkpoints(destination_id: str):
    return jsonify(checkpoints_for_destination(destination_id))


@app.route("/api/restrictions/<slug>")
def api_restrictions(slug: str):
    data = load_restrictions()
    entry = data.get(slug)
    if not entry:
        return jsonify({})
    return jsonify(entry)


@app.errorhandler(404)
def not_found(_e):
    return render_template("404.html"), 404


if __name__ == "__main__":
    # Local dev / Production: set GOOGLE_MAPS_API_KEY in the environment for map tiles.
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
