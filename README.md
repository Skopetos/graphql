# 🧠 Zone01 Profile (GraphQL + SVG Dashboard)

### 🔗 [Live Demo → https://skopetos.github.io/](https://skopetos.github.io/)

A personal profile dashboard for the **Zone01 Athens** platform — built entirely with **vanilla JavaScript**, **GraphQL**, and **SVG graphics**.

This project connects to the official Zone01 GraphQL API and displays your real school data, XP, and results in a clean interactive UI.

---

## 🎯 Project Objective

The goal of this project is to **learn and apply GraphQL** by:
- authenticating via JWT from the Zone01 API,
- performing GraphQL queries to fetch personal data,
- visualizing statistics using SVG graphics,
- designing a simple and responsive user interface.

---

## 🧩 Features

✅ **Login Page**  
- Authenticates using Zone01 credentials (`username/email:password`)  
- Requests a JWT token from `https://platform.zone01.gr/api/auth/signin`  
- Displays errors for invalid credentials  
- Stays logged in after refresh using `localStorage`

✅ **Profile Dashboard**  
Displays key data from the GraphQL API:
- User info (ID & login)
- Total XP earned
- Pass / Fail results  
- Automatically updates data after refresh (fresh GraphQL queries)

✅ **SVG Charts (3 total)**  
1. **XP Over Time** — line/area chart  
2. **Pass vs Fail Ratio** — donut chart  
3. **XP by Project** — bar chart  

✅ **Logout Button**  
Clears session and hides private data.

✅ **Responsive Layout**  
Built with CSS Grid and flex utilities, fully client-side.

---

## 🧠 Technologies Used

| Component | Technology |
|------------|-------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES Modules) |
| API | GraphQL (Zone01 Athens endpoint) |
| Data Auth | JWT (Basic → Bearer) |
| Charts | SVG paths, rects, arcs (no libraries) |
| Hosting | GitHub Pages (`https://skopetos.github.io/`) |

---

## ⚙️ How It Works

1. **Login:**  
   Sends a POST request to  
   `https://platform.zone01.gr/api/auth/signin` using Basic Auth  
   → Receives a JWT token.

2. **Queries:**  
   Uses the token with Bearer Auth to access  
   `https://platform.zone01.gr/api/graphql-engine/v1/graphql`

3. **GraphQL Data:**  
   - `user { id login }`  
   - `transaction(where:{type:{_eq:"xp"}})`  
   - `result { grade object { name } }`

4. **Render:**  
   JavaScript dynamically updates the DOM and generates SVG charts.

---

## 🪄 Local Development

If you want to run it locally:

```bash
# clone the repo
git clone https://github.com/skopetos/skopetos.github.io.git

cd skopetos.github.io

# start a simple web server (Python)
python3 -m http.server 5173

# open your browser
http://localhost:5173
