// server.js
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// POST endpoint to handle form submissions
app.post('/submit-form', (req, res) => {
  const { name, email, phone, address, date, time, service, site, delivery, scent } = req.body;

  // Simulate basic validation (check if name and email are provided)
  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required.' });
  }

  // Example of using the environment variable (API_KEY)
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'API key not found on server.' });
  }

  // Simulate sending data to a database or processing
  console.log(`Form submitted by: ${name}, ${email}, ${phone}, ${address}, ${date}, ${time}, ${service}, ${site}, ${delivery}, ${scent}`);
  
  // Return success message
  return res.status(200).json({ message: 'Form submitted successfully!' });
});

// Serve static files (success.html)
app.use(express.static('public'));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
