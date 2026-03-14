const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;

let isLoggedIn = false;

const checkAuth = (req, res, next) => {
    if (isLoggedIn) {
        next();
    } else {
        res.redirect("/login");
    }
};

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const db = new sqlite3.Database("./resellbazaar.db");

db.serialize(() => {
    // Products Table
    db.run(`
        CREATE TABLE IF NOT EXISTS products(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            description TEXT,
            price INTEGER,
            category TEXT,
            image TEXT,
            seller_email TEXT DEFAULT 'user@example.com'
        )
    `);
    // Orders Table (Purchase History)
    db.run(`
        CREATE TABLE IF NOT EXISTS orders(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_name TEXT,
            price INTEGER,
            buyer_email TEXT DEFAULT 'user@example.com'
        )
    `);
});


app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "views/auth.html"));
});

app.post("/login", (req, res) => {
    isLoggedIn = true; 
    res.redirect("/");
});

app.get("/logout", (req, res) => {
    isLoggedIn = false;
    res.redirect("/login");
});

/* --- PROTECTED ROUTES --- */

app.get("/", checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "views/index.html"));
});

app.get("/add-product", checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "views/add-product.html"));
});

app.post("/add-product", checkAuth, (req, res) => {
    const { name, description, price, category, image } = req.body;
    db.run(
        "INSERT INTO products(name, description, price, category, image) VALUES(?,?,?,?,?)",
        [name, description, price, category, image],
        function(err) {
            if (err) throw err;
            res.redirect("/products");
        }
    );
});

/* MARKETPLACE WITH FILTERS */
app.get("/products", checkAuth, (req, res) => {
    const { category, search } = req.query;
    let query = "SELECT * FROM products WHERE 1=1";
    let params = [];

    if (category) {
        query += " AND category = ?";
        params.push(category);
    }
    if (search) {
        query += " AND name LIKE ?";
        params.push(`%${search}%`);
    }

    db.all(query, params, (err, rows) => {
        if (err) throw err;

        let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Marketplace - Resell Bazaar</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <nav class="navbar">
        <h2 class="logo">🛍 Resell Bazaar</h2>
        <div>
            <a href="/">Home</a>
            <a href="/products">Marketplace</a>
            <a href="/add-product">Sell</a>
            <a href="/profile">My Dashboard</a>
            <a href="/logout" style="color:#ff6b6b; margin-left:15px;">Logout</a>
        </div>
    </nav>

    <h1 class="page-title">Explore Goods</h1>

    <div class="searchBox">
        <form action="/products" method="GET" style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
            <input type="text" name="search" placeholder="Search products..." value="${search || ''}" style="padding:10px; border-radius:20px; border:1px solid #ddd; width:250px;">
            <select name="category" onchange="this.form.submit()" style="padding:10px; border-radius:20px;">
                <option value="">All Categories</option>
                <option value="Electronics" ${category === 'Electronics' ? 'selected' : ''}>Electronics</option>
                <option value="Books" ${category === 'Books' ? 'selected' : ''}>Books</option>
                <option value="Clothing" ${category === 'Clothing' ? 'selected' : ''}>Clothing</option>
                <option value="Furniture" ${category === 'Furniture' ? 'selected' : ''}>Furniture</option>
            </select>
            <button type="submit" class="primary-btn" style="border:none; padding:10px 20px; border-radius:20px;">Search</button>
        </form>
    </div>

    <div class="grid">
        ${rows.map(p => `
            <div class="card product">
                <span style="background:#e0e0ff; color:#4f46e5; padding:4px 10px; border-radius:15px; font-size:12px;">${p.category}</span>
                <img src="${p.image || 'https://via.placeholder.com/250'}" style="width:100%; height:180px; object-fit:cover; border-radius:10px; margin-top:10px;">
                <h2>${p.name}</h2>
                <h3 style="color:#2ecc71;">₹${p.price}</h3>
                <div style="display:flex; gap:10px; justify-content:center; margin-top:10px;">
                    <button onclick="alert('Contact: seller@mail.com')" class="primary-btn" style="font-size:12px;">Contact</button>
                    <button onclick="location.href='/buy-now?id=${p.id}'" class="secondary-btn" style="font-size:12px;">Buy Now</button>
                </div>
            </div>
        `).join('')}
    </div>
</body>
</html>`;
        res.send(html);
    });
});

/* DASHBOARD: LISTINGS & PURCHASES */
app.get("/profile", checkAuth, (req, res) => {
    db.all("SELECT * FROM products", (err, listings) => {
        db.all("SELECT * FROM orders", (err, orders) => {
            let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Dashboard</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <nav class="navbar">
        <h2 class="logo">🛍 Resell Bazaar</h2>
        <div><a href="/">Home</a><a href="/products">Marketplace</a><a href="/logout">Logout</a></div>
    </nav>
    <div style="padding:40px;">
        <h1 style="text-align:center;">User Dashboard</h1>
        
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px;">
            <section>
                <h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5;">My Selling Items</h2>
                ${listings.map(p => `
                    <div class="card" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                        <span>${p.name} - ₹${p.price}</span>
                        <form action="/delete-product" method="POST">
                            <input type="hidden" name="id" value="${p.id}">
                            <button type="submit" style="background:#ff4b4b; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">Delete</button>
                        </form>
                    </div>
                `).join('')}
            </section>

            <section>
                <h2 style="color: #2ecc71; border-bottom: 2px solid #2ecc71;">Recent Purchases</h2>
                ${orders.map(o => `
                    <div class="card" style="margin-bottom:10px; padding:15px; background: #f9fffb; border-left: 5px solid #2ecc71;">
                        <strong>✅ ${o.product_name}</strong>
                        <p>Paid: ₹${o.price}</p>
                    </div>
                `).join('')}
            </section>
        </div>
    </div>
</body>
</html>`;
            res.send(html);
        });
    });
});

/* TRANSACTIONS */
app.get("/buy-now", checkAuth, (req, res) => {
    const productId = req.query.id;
    db.get("SELECT name, price FROM products WHERE id = ?", [productId], (err, row) => {
        if (row) {
            db.run("INSERT INTO orders(product_name, price) VALUES(?,?)", [row.name, row.price], () => {
                res.send("<script>alert('Purchase Successful!'); window.location.href='/profile';</script>");
            });
        } else {
            res.redirect("/products");
        }
    });
});

app.post("/delete-product", checkAuth, (req, res) => {
    db.run("DELETE FROM products WHERE id = ?", [req.body.id], () => res.redirect("/profile"));
});

app.listen(PORT, () => console.log("Server running at http://localhost:3000"));