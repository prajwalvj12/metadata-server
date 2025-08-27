const express = require('express');
const QRCode = require('qrcode');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage 
const tickets = {};

// Generate simple SVG ticket
function generateTicketSVG(ticketData) {
  return `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <rect x="20" y="20" width="760" height="560" fill="none" stroke="white" stroke-width="4"/>
      
      <text x="400" y="100" text-anchor="middle" fill="white" font-family="Arial" font-size="48" font-weight="bold">🎫 SECURE TICKET</text>
      <text x="400" y="180" text-anchor="middle" fill="white" font-family="Arial" font-size="32">${ticketData.eventName}</text>
      <text x="400" y="220" text-anchor="middle" fill="white" font-family="Arial" font-size="24">Date: ${ticketData.eventDate}</text>
      <text x="400" y="260" text-anchor="middle" fill="white" font-family="Arial" font-size="24">Price: ${ticketData.price} MATIC</text>
      <text x="400" y="300" text-anchor="middle" fill="white" font-family="Arial" font-size="20">Token ID: #${ticketData.tokenId}</text>
      <text x="400" y="330" text-anchor="middle" fill="white" font-family="Arial" font-size="20">Seat: ${ticketData.seatNumber}</text>
      
      <text x="400" y="500" text-anchor="middle" fill="white" font-family="Arial" font-size="16">QR: ${ticketData.tokenId}</text>
      <text x="400" y="550" text-anchor="middle" fill="white" font-family="Arial" font-size="14">Verify authenticity</text>
    </svg>
  `;
}

// Create ticket metadata
app.post('/api/tickets', async (req, res) => {
  const { tokenId, eventId, eventName, eventDate, price, owner, seatNumber } = req.body;
  
  try {
    const ticketData = { tokenId, eventId, eventName, eventDate, price, owner, seatNumber, timestamp: Date.now() };

    // Generate QR code
    const qrText = JSON.stringify({ tokenId, eventId, owner, timestamp: ticketData.timestamp });
    const qrDataURL = await QRCode.toDataURL(qrText, { width: 200, margin: 2 });

    // Generate SVG ticket image
    const ticketSVG = generateTicketSVG(ticketData);
    const svgDataURL = `image/svg+xml;base64,${Buffer.from(ticketSVG).toString('base64')}`;
    
    // Create NFT metadata
    tickets[tokenId] = {
      name: `${eventName} - Ticket #${tokenId}`,
      description: `Admission ticket for ${eventName}. Proof of purchase and entry authorization.`,
      image: svgDataURL,
      external_url: `https://your-frontend.com/ticket/${tokenId}`,
      attributes: [
        { trait_type: "Event", value: eventName },
        { trait_type: "Date", value: eventDate },
        { trait_type: "Price", value: `${price} MATIC` },
        { trait_type: "Seat Number", value: seatNumber },
        { trait_type: "QR Code", value: qrDataURL }
      ]
    };

    res.json({ success: true, tokenId, metadataUrl: `${req.protocol}://${req.get('host')}/api/tickets/${tokenId}` });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate metadata' });
  }
});

// Get ticket metadata
app.get('/api/tickets/:tokenId', (req, res) => {
  const { tokenId } = req.params;
  const metadata = tickets[tokenId];
  
  if (!metadata) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(metadata);
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Metadata server running', tickets: Object.keys(tickets).length });
});

// CRITICAL: Use Railway's PORT and bind to 0.0.0.0
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Metadata server running on port ${PORT}`);
});
