const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();

app.use(express.urlencoded({ extended: true }));

/* serve CSS and JS */
app.use(express.static("public"));

/* DATABASE */

const db = new sqlite3.Database("./resellbazaar.db");

db.run(`
CREATE TABLE IF NOT EXISTS products(
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT,
description TEXT,
price INTEGER,
category TEXT,
image TEXT
)
`);

/* HOME PAGE */

app.get("/", (req,res)=>{
res.sendFile(__dirname + "/views/index.html");
});

/* SELL PAGE */

app.get("/add-product",(req,res)=>{
res.sendFile(__dirname + "/views/add-product.html");
});

/* SAVE PRODUCT */

app.post("/add-product",(req,res)=>{

const {name,description,price,category,image} = req.body;

db.run(
"INSERT INTO products(name,description,price,category,image) VALUES(?,?,?,?,?)",
[name,description,price,category,image],
function(err){
if(err) throw err;
res.redirect("/products");
}
);

});

/* MARKETPLACE */

app.get("/products",(req,res)=>{

db.all("SELECT * FROM products",(err,rows)=>{

let html = `
<!DOCTYPE html>

<html>

<head>

<title>Marketplace</title>

<link rel="stylesheet" href="/style.css">

<script src="/search.js"></script>

</head>

<body>

<nav class="navbar">

<h2 class="logo">🛍 Resell Bazaar</h2>

<div>
<a href="/">Home</a>
<a href="/add-product">Sell</a>
</div>

</nav>

<h1 class="page-title">Marketplace</h1>

<div class="searchBox">

<input type="text" id="search" placeholder="Search products..." onkeyup="searchProducts()">

</div>

<div class="grid">
`;

rows.forEach(p=>{

html+=`

<div class="card product">

<img src="${p.image || 'https://via.placeholder.com/250'}">

<h2>${p.name}</h2>

<p>${p.description}</p>

<p class="category">${p.category}</p>

<h3>₹${p.price}</h3>

<button onclick="alert('Contact seller')">Contact</button>

</div>

`;

});

html+=`

</div>

</body>

</html>
`;

res.send(html);

});

});

app.listen(3000,()=>{
console.log("Server running at http://localhost:3000");
});