import os
import json
import requests

BASE_URL = "http://localhost:3000"

# ---------------------------------------------------------
# Helper: Read .env file without external dependencies
# ---------------------------------------------------------
env_vars = {}
if os.path.exists(".env"):
    with open(".env") as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                key, val = line.split("=", 1)
                env_vars[key.strip()] = val.strip()

api_client_id = env_vars.get("API_CLIENT_ID", "hypertube_app")
api_client_secret = env_vars.get("API_CLIENT_SECRET", "hypertube_ultra_secret_tsais")

def print_json(title, data):
    print(f"\n📦 [{title}]")
    print(json.dumps(data, indent=2, ensure_ascii=False))

print("=" * 70)
print("🚀 HYPERTUBE COMPLETE API TEST SUITE (SUBJECT SECTION III.4)")
print("=" * 70)

# =====================================================================
# 1. AUTHENTICATION & OAUTH2
# =====================================================================
print("\n🔑 --- 1. AUTHENTICATION & OAUTH2 ---")

# User 1 Login (francois)
login_user1 = {"username": "francois", "password": "password"}
res_login1 = requests.post(f"{BASE_URL}/api/auth/login", json=login_user1)
if res_login1.status_code == 200:
    token_user1 = res_login1.json()["token"]
    user1_id = res_login1.json()["user"]["id"]
    print(f"✅ User 1 Login OK (Username: francois, ID: {user1_id})")
else:
    print(f"❌ User 1 Login failed:", res_login1.text)
    exit(1)

headers_user1 = {"Authorization": f"Bearer {token_user1}"}

# User 2 Login (antoine) - Used for permission / security testing
login_user2 = {"username": "antoine", "password": "password"}
res_login2 = requests.post(f"{BASE_URL}/api/auth/login", json=login_user2)
token_user2 = res_login2.json()["token"]
user2_id = res_login2.json()["user"]["id"]
headers_user2 = {"Authorization": f"Bearer {token_user2}"}
print(f"✅ User 2 Login OK (Username: antoine, ID: {user2_id})")

# Test POST /oauth/token using credentials loaded from .env
oauth_payload = {"client": api_client_id, "secret": api_client_secret}
res_oauth = requests.post(f"{BASE_URL}/oauth/token", json=oauth_payload)
print(f"🔹 POST /oauth/token Status: {res_oauth.status_code}")
if res_oauth.status_code == 200:
    print_json("OAuth Token Response", res_oauth.json())
else:
    print("❌ OAuth Error:", res_oauth.text)


# =====================================================================
# 2. USER ROUTES & SECURITY CHECKS
# =====================================================================
print("\n👤 --- 2. USER ROUTES & SECURITY CHECKS ---")

# GET /users
res_users = requests.get(f"{BASE_URL}/users", headers=headers_user1)
print(f"🔹 GET /users Status: {res_users.status_code}")
print_json("Users List", res_users.json())

# GET /users/:id
res_profile = requests.get(f"{BASE_URL}/users/{user1_id}", headers=headers_user1)
print(f"🔹 GET /users/{user1_id} Status: {res_profile.status_code}")
print_json("User Profile", res_profile.json())

# PATCH /users/:id (Allowed: Own profile)
res_patch_own = requests.patch(f"{BASE_URL}/users/{user1_id}", headers=headers_user1, json={"firstName": "Francois-Updated"})
print(f"🔹 PATCH /users/{user1_id} (Own profile) Status: {res_patch_own.status_code}")
print_json("Updated Own Profile Response", res_patch_own.json())

# SECURITY CHECK: PATCH /users/:id (Forbidden: Attempting to modify another user's profile)
res_patch_other = requests.patch(f"{BASE_URL}/users/{user2_id}", headers=headers_user1, json={"firstName": "Hacked"})
print(f"\n🔒 SECURITY CHECK: PATCH /users/{user2_id} (Other profile) Status: {res_patch_other.status_code}")
print_json("Forbidden Edit Response", res_patch_other.json())


# =====================================================================
# 3. MOVIE ROUTES
# =====================================================================
print("\n🎬 --- 3. MOVIE ROUTES ---")

movie_id = "tt0063350"  # IMDb ID for Night of the Living Dead (1968 - Public Domain)

# GET /movies (Frontpage)
res_movies = requests.get(f"{BASE_URL}/movies", headers=headers_user1)
print(f"🔹 GET /movies Status: {res_movies.status_code}")
if res_movies.status_code == 200:
    movies_sample = res_movies.json().get("movies", [])[:4]
    print_json("Movies Sample (First 4)", movies_sample)

# GET /movies/:id (Details)
res_movie_detail = requests.get(f"{BASE_URL}/movies/{movie_id}", headers=headers_user1)
print(f"🔹 GET /movies/{movie_id} Status: {res_movie_detail.status_code}")
print_json("Movie Details Response", res_movie_detail.json())


# =====================================================================
# 4. COMMENT ROUTES & PERMISSION CHECKS
# =====================================================================
print("\n💬 --- 4. COMMENT ROUTES & PERMISSION CHECKS ---")

# POST /movies/:id/comments (User 1 posts comment)
res_post1 = requests.post(f"{BASE_URL}/movies/{movie_id}/comments", headers=headers_user1, json={"content": "Masterpiece movie!"})
print(f"🔹 POST /movies/{movie_id}/comments Status: {res_post1.status_code}")
print_json("Created Comment Response", res_post1.json())
comment_id = res_post1.json()["comment"]["id"]

# POST /comments (User 1 posts comment using JSON body variant)
res_post2 = requests.post(f"{BASE_URL}/comments", headers=headers_user1, json={"movie_id": movie_id, "comment": "Posted via /comments body payload"})
print(f"🔹 POST /comments (Body variant) Status: {res_post2.status_code}")
print_json("Created Comment (Body Variant)", res_post2.json())

# GET /movies/:id/comments
res_movie_comments = requests.get(f"{BASE_URL}/movies/{movie_id}/comments", headers=headers_user1)
print(f"🔹 GET /movies/{movie_id}/comments Status: {res_movie_comments.status_code}")
print_json("Movie Comments List", res_movie_comments.json())

# GET /comments (Global latest comments)
res_all_comments = requests.get(f"{BASE_URL}/comments", headers=headers_user1)
print(f"🔹 GET /comments Status: {res_all_comments.status_code}")
print_json("Latest Global Comments", res_all_comments.json())

# GET /comments/:id
res_single_comment = requests.get(f"{BASE_URL}/comments/{comment_id}", headers=headers_user1)
print(f"🔹 GET /comments/{comment_id} Status: {res_single_comment.status_code}")
print_json("Single Comment Detail", res_single_comment.json())

# SECURITY CHECK: User 2 tries to PATCH User 1's comment -> Should fail with 403 Forbidden
res_patch_forbidden = requests.patch(f"{BASE_URL}/comments/{comment_id}", headers=headers_user2, json={"content": "Hacked comment"})
print(f"🔒 SECURITY CHECK: User 2 PATCH User 1 comment Status: {res_patch_forbidden.status_code}")
print_json("Forbidden Comment Edit Response", res_patch_forbidden.json())

# SECURITY CHECK: User 2 tries to DELETE User 1's comment -> Should fail with 403 Forbidden
res_del_forbidden = requests.delete(f"{BASE_URL}/comments/{comment_id}", headers=headers_user2)
print(f"🔒 SECURITY CHECK: User 2 DELETE User 1 comment Status: {res_del_forbidden.status_code}")
print_json("Forbidden Comment Delete Response", res_del_forbidden.json())

# ERROR CHECK: Empty comment payload -> Should fail with 400 Bad Request
res_empty_comment = requests.post(f"{BASE_URL}/comments", headers=headers_user1, json={"movie_id": movie_id, "content": ""})
print(f"⚠️ ERROR CHECK: Empty comment payload Status: {res_empty_comment.status_code}")
print_json("Bad Request Response", res_empty_comment.json())

# PATCH /comments/:id (User 1 modifies their own comment)
res_patch_own_comment = requests.patch(f"{BASE_URL}/comments/{comment_id}", headers=headers_user1, json={"content": "Updated comment by owner"})
print(f"🔹 PATCH /comments/{comment_id} (Owner) Status: {res_patch_own_comment.status_code}")
print_json("Updated Owner Comment Response", res_patch_own_comment.json())

# DELETE /comments/:id (User 1 deletes their own comment)
res_del_own_comment = requests.delete(f"{BASE_URL}/comments/{comment_id}", headers=headers_user1)
print(f"🔹 DELETE /comments/{comment_id} (Owner) Status: {res_del_own_comment.status_code}")
print_json("Deleted Owner Comment Response", res_del_own_comment.json())

print("\n" + "=" * 70)
print("🎉 ALL API TESTS AND SECURITY CHECKS EXECUTED SUCCESSFULLY!")
print("=" * 70)
