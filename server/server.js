const express = require('express');
const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const cors = require('cors');
const { google } = require('googleapis');
const dotenv = require('dotenv');

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

// Endpoint to submit form data
app.post(
  '/submit',
  [
    check('name').notEmpty().withMessage('Name is required'),
    check('email').isEmail().withMessage('Please enter a valid email'),
    check('phone').notEmpty().withMessage('Phone number is required'),
    check('address').notEmpty().withMessage('Address is required'),
    check('date').isISO8601().withMessage('Please enter a valid date'),
    check('time').matches(/^(0[8-9]|1[0-6]):[0-5][0-9]$/).withMessage('Pickup time must be between 8:00 AM and 4:00 PM'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const formData = req.body;
    try {
      await authenticate();

      // Check if user already got a discount
      const sheetData = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'customer tracking!A:L', // Adjust this if needed
      });

      const rows = sheetData.data.values || [];
      const headers = rows[0]; // Assuming first row is headers
      const emailIndex = headers.indexOf("Email");
      const phoneIndex = headers.indexOf("Phone Number");
      const discountIndex = headers.indexOf("Used Discount");

      const userExists = rows.some(row => 
        (row[emailIndex] === formData.email || row[phoneIndex] === formData.phone) && row[discountIndex] === "Yes"
      );

      if (userExists) {
        return res.status(400).json({ success: false, error: "Discount already used by this user" });
      }

      // Append new data
      const values = [
        [
          formData.name,
          formData.email,
          formData.phone,
          formData.address,
          formData.date,
          formData.time,
          formData.service,
          formData.site,
          formData.delivery,
          formData.scent,
          formData.discount || "No Discount",
          formData.discount ? "Yes" : "No", // Mark if discount was used
        ]
      ];

      const resource = { values };

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'customer tracking!A1',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS', // Ensures it appends new data
        resource
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error writing to sheet:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
