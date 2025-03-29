const express = require('express');
const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const cors = require('cors');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config(); // Load environment variables

const sheets = google.sheets('v4');
const credentials = JSON.parse(process.env.CREDENTIALS_JSON);
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Authenticate with Google Sheets API
const authenticate = async () => {
  const { client_email, private_key } = credentials;
  const auth = new google.auth.JWT(
    client_email,
    null,
    private_key.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  google.options({ auth });
};

// Generate a unique discount code
const generateDiscountCode = () => {
  return 'DISCOUNT-' + crypto.randomBytes(3).toString('hex').toUpperCase(); // Example: DISCOUNT-AB12CD
};

// Endpoint to generate and verify discount
app.post('/generate-discount', async (req, res) => {
  const formData = req.body; // Assuming form data includes all user info (e.g., name, email, phone, etc.)
  const { email, phone } = formData;

  try {
    await authenticate();

    // Get existing data from Google Sheets
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'customer tracking!A:L', // Adjust this if needed
    });

    const rows = sheetData.data.values || [];
    const headers = rows[0]; // Assuming first row is headers
    const emailIndex = headers.indexOf("Email");
    const phoneIndex = headers.indexOf("Phone Number");
    const discountIndex = headers.indexOf("Used Discount");

    // Check if the user has already claimed the discount
    const userExists = rows.some(row => 
      (row[emailIndex] === email || row[phoneIndex] === phone) && row[discountIndex] === "Yes"
    );

    if (userExists) {
      return res.status(400).json({ success: false, error: "Discount already used by this user" });
    }

    // Generate new discount code
    const discountCode = generateDiscountCode();

    // Append new data (including discount code) for this user
    const values = [
      [
        formData.name,
        email,
        phone,
        formData.address || '',
        formData.date || '',
        formData.time || '',
        formData.service || '',
        formData.site || '',
        formData.delivery || '',
        formData.scent || '',
        discountCode, 
        'No'  
      ]
    ];

    const resource = { values };

    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'customer tracking!A1',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS', 
      resource
    });

    res.json({ success: true, discountCode });
  } catch (error) {
    console.error('Error generating discount code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
