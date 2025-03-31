const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const crypto = require('crypto');
const path = require('path');

dotenv.config(); 

const sheets = google.sheets('v4');
const credentials = JSON.parse(process.env.CREDENTIALS_JSON);
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// Google API authentication
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

// Generate a discount code
const generateDiscountCode = () => {
  return 'DISCOUNT-' + crypto.randomBytes(3).toString('hex').toUpperCase();
};

// Combined submission endpoint for discount generation and scheduling
app.post('/submit', async (req, res) => {
  const formData = req.body;
  const { email, phone } = formData;
  
  try {
    await authenticate();

    // Retrieve existing sheet data
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'customer tracking!A1:L',  // assuming first row contains headers
    });
    
    const rows = sheetData.data.values || [];
    // Assuming headers are in the first row
    const headers = rows[0] || [];
    const emailIndex = headers.indexOf("email");
    const phoneIndex = headers.indexOf("phone");
    const usedDiscountIndex = headers.indexOf("Used Discount");
    
    // Check if the user has already used a discount
    const userExists = rows.slice(1).some(row =>
      (row[emailIndex] === email || row[phoneIndex] === phone) && row[usedDiscountIndex] === "Yes"
    );
    
    if (userExists) {
      return res.status(400).json({ success: false, error: "Discount already used by this user" });
    }
    
    // Generate a new discount code
    const discountCode = generateDiscountCode();
    
    // Prepare row values
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
        'No'  // indicating discount not yet used
      ]
    ];
    
    const resource = { values };

    // Append the new row to the sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'customer tracking!A2',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource
    });

    // Respond with JSON instead of redirecting
    res.json({ success: true, discountCode, message: "Pickup scheduled successfully" });
    
  } catch (error) {
    console.error('Error processing submission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve schedule.html (if needed)
app.get('/schedule.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'schedule.html'));
});

// Example success.html route (if you have a separate success page)
app.get('/success.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
