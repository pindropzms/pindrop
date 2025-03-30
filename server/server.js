// Endpoint to generate and verify discount
app.post('/generate-discount', async (req, res) => {
  const formData = req.body;
  const { email, phone } = formData;

  try {
    await authenticate();

    // Get existing data from Google Sheets
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'customer tracking!A:L',
    });

    const rows = sheetData.data.values || [];
    const headers = rows[0]; // Assuming first row is headers
    const emailIndex = headers.indexOf("Email");
    const phoneIndex = headers.indexOf("Phone Number");
    const discountIndex = 10; // Column K (11th column in zero-based index)
    const statusIndex = 11;   // Column L (12th column in zero-based index)

    // Check if the user has already claimed the discount
    const userExists = rows.some(row => 
      (row[emailIndex] === email || row[phoneIndex] === phone) && row[statusIndex] === "Yes"
    );

    if (userExists) {
      return res.status(400).json({ success: false, error: "Discount already used by this user" });
    }

    // Generate new discount code
    const discountCode = generateDiscountCode();

    // Append new data (including discount code in column K and status in column L)
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
        discountCode,    // Insert discount code into column K
        'No'             // Insert 'No' for status into column L (indicating discount not used yet)
      ]
    ];

    const resource = { values };

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'customer tracking!A1', // Starting at row 1 to append data
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource
    });

    // Return the discount code as part of the response
    res.status(200).json({ success: true, discountCode });

  } catch (error) {
    console.error('Error generating discount code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
