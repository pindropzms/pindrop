require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');

const sheets = google.sheets('v4');
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Health check endpoint for Render
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Authenticate with Google Sheets API using environment variables
const authenticate = async () => {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  google.options({ auth });
};

app.post('/submit', async (req, res) => {
  const formData = req.body;
  try {
    await authenticate();

    // Validate time range (8 AM - 4 PM)
    const [hours, minutes] = formData.time.split(':').map(Number);
    if (hours < 8 || hours >= 16) {
      return res.status(400).json({ success: false, error: 'Pickup time must be between 8:00 AM and 4:00 PM.' });
    }

    const values = [[
      formData.name,
      formData.email,
      formData.phone,
      formData.address,
      formData.date,
      formData.time,
      formData.service,
      formData.site
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'customer tracking!A1',
      valueInputOption: 'RAW',
      resource: { values }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error writing to sheet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
