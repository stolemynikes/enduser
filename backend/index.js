import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();

app.use(express.json());

app.use(cors(
    {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type'],
    }
));

app.get('/', (req, res) => {
    return res.status(200).json({ message: 'Hello from Express!' });
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});