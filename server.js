const express = require('express');
const QRCode = require('qrcode');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage 
const tickets = {};

app.post('/api/tickets', async (req, res) => {
  const { tokenId, eventId, eventName, eventDate, price, owner, seatNumber } = req.body;
  
  try {
    const ticketData = {
      tokenId,
      eventId,
      eventName,
      eventDate,
      price,
      owner,
      seatNumber,
      timestamp: Date.now()
    };

    // Generate QR code containing ticket verification data
    const qrData = JSON.stringify({
      tokenId,
      eventId,
      owner,
      eventName,
      eventDate,
      seatNumber,
      contractAddress: "0x19128bD3C0c9152E2ef74be4472A7A29A15836Ef",
      timestamp: ticketData.timestamp
    });

    // Generate QR code as SVG
    const qrSvg = await QRCode.toString(qrData, { 
      type: 'svg',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    // Create ticket SVG with QR code and event details
    const ticketSvg = `
      <svg width="500" height="700" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#6366f1"/>
            <stop offset="100%" style="stop-color:#8b5cf6"/>
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="100%" height="100%" fill="url(#gradient)"/>
        <rect x="20" y="20" width="460" height="660" fill="none" stroke="white" stroke-width="3"/>
        
        <!-- Header -->
        <text x="250" y="80" text-anchor="middle" fill="white" font-family="Arial" font-size="32" font-weight="bold">🎫 SECURE TICKET</text>
        
        <!-- Event Details -->
        <text x="250" y="140" text-anchor="middle" fill="white" font-family="Arial" font-size="24" font-weight="bold">${eventName}</text>
        <text x="250" y="180" text-anchor="middle" fill="white" font-family="Arial" font-size="18">Date: ${eventDate}</text>
        <text x="250" y="210" text-anchor="middle" fill="white" font-family="Arial" font-size="18">Price: ${price} MATIC</text>
        <text x="250" y="240" text-anchor="middle" fill="white" font-family="Arial" font-size="18">Seat: ${seatNumber}</text>
        <text x="250" y="270" text-anchor="middle" fill="white" font-family="Arial" font-size="18">Token ID: #${tokenId}</text>
        
        <!-- QR Code -->
        <rect x="100" y="320" width="300" height="300" fill="white" stroke="#333" stroke-width="2"/>
        <g transform="translate(100,320)">
          ${qrSvg}
        </g>
        
        <!-- Footer -->
        <text x="250" y="660" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold">SCAN TO VERIFY AUTHENTICITY</text>
        <text x="250" y="685" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial" font-size="12">Powered by Blockchain Technology</text>
      </svg>
    `;

    // Convert to base64
    const svgBase64 = `image/svg+xml;base64,${Buffer.from(ticketSvg).toString('base64')}`;
    
    // Create NFT metadata
    tickets[tokenId] = {
      name: `${eventName} - Ticket #${tokenId}`,
      description: `Admission ticket for ${eventName}. Scan QR code to verify authenticity and ownership.`,
      image: svgBase64,
      external_url: `https://your-app.com/verify/${tokenId}`,
      attributes: [
        { trait_type: "Event", value: eventName },
        { trait_type: "Date", value: eventDate },
        { trait_type: "Price", value: `${price} MATIC` },
        { trait_type: "Seat Number", value: seatNumber },
        { trait_type: "Token ID", value: tokenId },
        { trait_type: "Event ID", value: eventId },
        { trait_type: "Verification", value: "QR Code Enabled" }
      ]
    };

    res.json({ 
      success: true, 
      tokenId, 
      metadataUrl: `${req.protocol}://${req.get('host')}/api/tickets/${tokenId}`,
      qrData: qrData // For frontend verification
    });
  } catch (error) {
    console.error('Error generating QR ticket:', error);
    res.status(500).json({ error: 'Failed to generate QR ticket' });
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

// QR Code verification endpoint
app.post('/api/verify', (req, res) => {
  const { qrData } = req.body;
  
  try {
    const ticketInfo = JSON.parse(qrData);
    const storedTicket = tickets[ticketInfo.tokenId];
    
    if (!storedTicket) {
      return res.json({ valid: false, message: 'Ticket not found' });
    }
    
    res.json({ 
      valid: true, 
      ticket: {
        tokenId: ticketInfo.tokenId,
        eventName: ticketInfo.eventName,
        owner: ticketInfo.owner,
        eventDate: ticketInfo.eventDate,
        verified: true
      }
    });
  } catch (error) {
    res.json({ valid: false, message: 'Invalid QR code' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'QR Ticket Metadata Server Running', 
    tickets: Object.keys(tickets).length,
    features: ['QR Code Generation', 'Ticket Verification', 'SVG Rendering']
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 QR Ticket Metadata Server running on port ${PORT}`);
});
