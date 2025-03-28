const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); 
const { google } = require('googleapis');
const path = require('path');


const sheets = google.sheets('v4');
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
 


const app = express();
const port = 3000;

app.use(cors()); 
app.use(bodyParser.json());


const authenticate = async () => {
  const { client_email, private_key } = credentials;
  const auth = new google.auth.JWT(
      client_email,
      null,
      private_key.replace(/\\n/g, '\n'), // 
      ['https://www.googleapis.com/auth/spreadsheets']
  );
  google.options({ auth });
};


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
                formData.site,
                formData.delivery,
                formData.scent
            ]
        ];

        const resource = {
            values
        };

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'customer tracking!A1', 
            valueInputOption: 'RAW',
            resource
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
