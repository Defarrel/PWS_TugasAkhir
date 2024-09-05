const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'defarrel13',
    database: 'library_db'
});

db.connect((err) => {
    if (err) throw err;
    console.log('MySQL connected...');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.query(sql, [username, password], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            const user = result[0];
            if (user.role === 'administrator') {
                res.redirect('/admin');
            } else if (user.role === 'user') {
                res.redirect('/viewbuku');
            }
        } else {
            res.send('Invalid username or password');
        }
    });
});

app.get('/viewbuku', (req, res) => {
  res.sendFile(path.join(__dirname, 'viewbuku.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'adminbuku.html'));
});

app.get('/api/books', (req, res) => {
    const sql = 'SELECT * FROM books';
    db.query(sql, (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});

app.post('/api/books', upload.single('image'), (req, res) => {
    const { title, author, isbn } = req.body;

    if (!title || !author || !isbn) {
        return res.status(400).json({ error: 'Title, author, and ISBN are required.' });
    }

    const newBook = {
        title,
        author,
        isbn,
        image_url: req.file ? `/uploads/${req.file.filename}` : null
    };

    const sql = 'INSERT INTO books (title, author, isbn, image) VALUES (?, ?, ?, ?)';
    db.query(sql, [newBook.title, newBook.author, newBook.isbn, newBook.image_url], (err, result) => {
        if (err) {
            console.error('Error executing query:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: result.insertId, ...newBook });
    });
});

app.put('/api/books/:id', upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { title, author, isbn } = req.body;

    const sql = 'UPDATE books SET title = ?, author = ?, isbn = ?' +
                (req.file ? ', image = ?' : '') + 
                ' WHERE id = ?';

    const values = [
        title,
        author,
        isbn,
        ...(req.file ? [`/uploads/${req.file.filename}`] : []),
        id
    ];

    db.query(sql, values, (err, result) => {
        if (err) throw err;

        if (result.affectedRows > 0) {
            res.json({ id, title, author, isbn, image_url: req.file ? `/uploads/${req.file.filename}` : undefined });
        } else {
            res.status(404).json({ error: 'Book not found.' });
        }
    });
});

app.delete('/api/books/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM books WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) throw err;
        res.json({ id });
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
