const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const cookies = require("cookie-parser");


const app = express();
app.use(express.json());
app.use(cookies());

// Sample user data
const users = [
 { id: 1, username: 'admin', password: 'admin123', type: 'admin' },
 { id: 2, username: 'user', password: 'user123', type: 'regular' }
];

// JWT Secret
const secret = 'your_secret_key';

// Login endpoint
app.post('/login', (req, res) => {
 const { username, password } = req.body;
 const user = users.find(u => u.username === username && u.password === password);

 if (!user) return res.status(401).send('Invalid credentials');

 const token = jwt.sign({ id: user.id, type: user.type }, secret, { expiresIn: '1h' });
res.cookie('token', token, { httpOnly: true }); 
 res.send({ token });
});

// Home endpoint
app.get('/home', (req, res) => {
try {
   const token = req.cookies.token;
   if (!token) return res.status(403).send('A token is required for authentication');
        const decoded = jwt.verify(token, secret);
      req.user = users.find(u => u.id === decoded.id);
      }
      catch (err) {
         res.status(401).send('Invalid Token');
         }
   
 const { type } = req.user;
 let books = fs.readFileSync(path.join(__dirname, 'regularUser.csv'), 'utf-8').split('\n');

 if (type === 'admin') {
    const adminBooks = fs.readFileSync(path.join(__dirname, 'adminUser.csv'), 'utf-8').split('\n');
    books = [...books, ...adminBooks];
 }

 res.send(books);
});

// Middleware to verify JWT and set user type
function verifyToken(req, res, next) {
 const token = req.headers['x-access-token'];
 if (!token) return res.status(403).send('A token is required for authentication');

 try {
    const decoded = jwt.verify(token, secret);
    req.user = users.find(u => u.id === decoded.id);
    next();
 } catch (err) {
    res.status(401).send('Invalid Token');
 }
}

// Add book endpoint
app.post('/addBook', verifyToken, (req, res) => {
 const { bookName, author, publicationYear } = req.body;

 if (typeof bookName !== 'string' || typeof author !== 'string' || typeof publicationYear !== 'number') {
    return res.status(400).send('Invalid parameters');
 }

 const book = `${bookName},${author},${publicationYear}\n`;
 fs.appendFileSync(path.join(__dirname, 'regularUser.csv'), book);
 res.send('Book added successfully');
});

// Delete book endpoint
app.delete('/deleteBook', verifyToken, (req, res) => {
 const { bookName } = req.body;

 if (typeof bookName !== 'string') {
    return res.status(400).send('Invalid parameters');
 }

 let books = fs.readFileSync(path.join(__dirname, 'regularUser.csv'), 'utf-8').split('\n');
 books = books.filter(book => !book.toLowerCase().startsWith(bookName.toLowerCase()));
 fs.writeFileSync(path.join(__dirname, 'regularUser.csv'), books.join('\n'));
 res.send('Book deleted successfully');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
