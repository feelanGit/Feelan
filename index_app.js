const express = require('express');
const cors = require('cors');
const Irys = require('@irys/sdk');
const fs = require('fs-extra');
const path = require('path');
const fetch = require('node-fetch'); 
require('dotenv').config();
const { Query } = require("@irys/query");
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });


const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'react-ui/build')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'react-ui', 'build', 'index.html'));
});



const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`App service running on port ${PORT}`);
});




app.post('/fetch-transactions', async (req, res) => {

const receiptId = req.body.receiptId;

try {
    // testnet
    const myQuery = new Query({ url: "https://devnet.irys.xyz/graphql" });
    const result = await myQuery
        .search("irys:transactions")
        .token("matic")
        .ids([receiptId])


    // Fetch file data for each transaction
    const fileDataPromises = result.map(async (item) => {
        const url = `https://gateway.irys.xyz/${item.id}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const fileData = await response.buffer(); // Get the response as a Buffer
        return { id: item.id, data: fileData }; // Convert file data to a base64 string
    });

    const filesWithData = await Promise.all(fileDataPromises);

    res.json({ success: true, transactions: filesWithData });
} catch (error) {
    console.error("Error fetching transactions", error);
    res.status(500).json({ success: false, error: error.message });
}
});



app.post('/upload', upload.single('encryptedFile'), async (req, res) => {
    try {
        const file = req.file; // The uploaded file


        const irys = new Irys({
            url: process.env.IRYS_URL,
            token: process.env.IRYS_TOKEN,
            key: process.env.ETH_PRIVATE_KEY,
            config: { providerUrl: process.env.IRYS_PROVIDER_URL }
        });


        // Assuming you want to save the file to disk
        const filePath = `data/${file.originalname}`;
        await fs.writeFile(filePath, file.buffer);

        // tags aren't used for now
        const tags = [{ name: "conversation-id", value: "conversation-id" }];

        // Upload the saved ZIP file
        const receipt = await irys.uploadFile(filePath, { tags });

        console.log(`Data uploaded ==> https://gateway.irys.xyz/graphgl/${receipt.id}`);
        res.json({ success: true, receipt: `https://gateway.irys.xyz/graphql/${receipt.id}`});

    } catch (error) {
        console.error("Error uploading data ", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


