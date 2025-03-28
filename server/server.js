const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // ✅ Import CORS
const { google } = require('googleapis');
const path = require('path');

// Google Sheets API setup
const sheets = google.sheets('v4');
const credentials = require('./credentials.json');
const SPREADSHEET_ID = '1h3J4uyZvO3yAENDNg-j2CxMND7KcpHVeCBTHeyKs4eY'; // Your Google Spreadsheet ID

// Express server setup
const app = express();
const port = 3000;

app.use(cors()); // ✅ Enable CORS
app.use(bodyParser.json());

// Authenticate Google API
const authenticate = async () => {
    const { client_email, private_key } = credentials;
    const auth = new google.auth.JWT(
        client_email,
        null,
        private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
    );
    google.options({ auth });
};

// Endpoint to handle form submission
app.post('/submit', async (req, res) => {
    const formData = req.body;
    try {
        await authenticate();

        const values = [
            [
                formData.name,
                formData.email,
                formData.phone,
                formData.address,
                formData.date,
                formData.time,
                formData.service,
                formData.site
            ]
        ];

        const resource = {
            values
        };

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'customer tracking!A1', // Adjust this range to your sheet
            valueInputOption: 'RAW',
            resource
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error writing to sheet:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
