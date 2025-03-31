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

// Combined submission endpoint
app.post('/submit', async (req, res) => {
  const formData = req.body;
  const { name, email, phone } = formData;
  
  try {
    await authenticate();
    
    // Retrieve sheet data; assuming first row is headers
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'customer tracking!A1:L'
    });
    
    const rows = sheetData.data.values || [];
    const headers = rows[0] || [];
    const emailIndex = headers.indexOf("email");
    const usedDiscountIndex = headers.indexOf("Used Discount");
    
    // Check if the user already exists and discount is already used
    const duplicateUser = rows.slice(1).some(row =>
      row[emailIndex] === email &&
      row[usedDiscountIndex] === "Used"
    );
    
    if (duplicateUser) {
      return res.status(400).json({ success: false, error: "Discount already granted for this user" });
    }
    
    // Generate discount code if not a duplicate
    const discountCode = generateDiscountCode();
    
    // Prepare row values to append; mark discount as "Not Used"
    const values = [
      [
        name,
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
        'Not Used'
      ]
    ];
    
    const resource = { values };
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'customer tracking!A2',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource
    });
    
    // Respond with success and discount details
    res.json({ success: true, discountCode, message: "Your discount has been granted" });
    
  } catch (error) {
    console.error('Error processing submission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Separate endpoint to update discount usage status to "Used"
app.post('/use-discount', async (req, res) => {
  const { email } = req.body;
  
  try {
    await authenticate();
    
    // Retrieve sheet data; assuming first row is header
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'customer tracking!A1:L'
    });
    
    const rows = sheetData.data.values || [];
    const headers = rows[0] || [];
    const emailIndex = headers.indexOf("email");
    const usedDiscountIndex = headers.indexOf("Used Discount");
    
    // Find the row index (skipping the header row)
    const rowIndex = rows.findIndex((row, idx) => idx > 0 && row[emailIndex] === email);
    
    if (rowIndex === -1) {
      return res.status(400).json({ success: false, message: "User not found" });
    }
    
    // Update the "Used Discount" column to "Used"
    // Spreadsheet rows are 1-indexed; add 1 for the header row.
    const updateRange = `customer tracking!L${rowIndex + 1}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: { values: [['Used']] }
    });
    
    res.json({ success: true, message: "Discount applied successfully" });
    
  } catch (error) {
    console.error('Error updating discount status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve schedule.html if needed
app.get('/schedule.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'schedule.html'));
});

// Serve success.html if needed
app.get('/success.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
