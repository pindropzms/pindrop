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

// CORS Configuration (Allow only the frontend domain)
app.use(cors({
  origin: '*', // Adjust to your actual frontend URL
  methods: 'GET, POST',
}));

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

  // Validate that all required fields are present
  const requiredFields = ['name', 'email', 'phone', 'address', 'date', 'time', 'service', 'site', 'delivery'];
  for (let field of requiredFields) {
    if (!formData[field]) {
      return res.status(400).json({ success: false, error: `${field} is required.` });
    }
  }

  try {
    await authenticate();

    // Validate time range (8 AM - 4 PM)
    const [hours, minutes] = formData.time.split(':').map(Number);
    if (hours < 8 || hours >= 16) {
      return res.status(400).json({ success: false, error: 'Pickup time must be between 8:00 AM and 4:00 PM.' });
    }

    // Append data to Google Sheets
    const values = [[
      formData.name,
      formData.email,
      formData.phone,
      formData.address,
      formData.date,
      formData.time,
      formData.service,
      formData.site,
      formData.delivery
    ]];

    // Specify the range for appending data dynamically (starting from the second row)
    const range = 'customer tracking!A2'; // Start from A2 to avoid overwriting headers

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
      valueInputOption: 'RAW',
      resource: { values }
    });

    // Respond with success
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing to sheet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
