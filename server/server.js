import dotenv from 'dotenv'; // Load environment variables from .env
import express from 'express'; // Express framework
import bodyParser from 'body-parser'; // To parse incoming request bodies
import cors from 'cors'; // For Cross-Origin Resource Sharing
import { google } from 'googleapis'; // Google Sheets API client
import fetch from 'node-fetch'; // For HTTP requests

dotenv.config(); // Load environment variables from .env

const sheets = google.sheets('v4');
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

const app = express(); // Initialize Express app
const port = process.env.PORT || 3000;

// Middlewares: Allow only your production domain for CORS
app.use(cors({ origin: 'https://pindropzm.com' }));
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
  const recaptchaToken = formData.recaptchaToken;

  const secretKey = RECAPTCHA_SECRET_KEY;
  const recaptchaUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;

  try {
    const recaptchaResponse = await fetch(recaptchaUrl, {
      method: 'POST',
    });
    const recaptchaData = await recaptchaResponse.json();

    // For reCAPTCHA v2, we only check for success.
    if (!recaptchaData.success) {
      return res.status(400).json({ success: false, error: 'reCAPTCHA verification failed.' });
    }

    // Proceed with form processing (Google Sheets write, etc.)
    await authenticate();

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
      formData.site,
      formData.scent,
      formData.delivery
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'customer tracking!A1',
      valueInputOption: 'RAW',
      resource: { values }
    });

    // Return success response as JSON (frontend will handle redirection)
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing to sheet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
