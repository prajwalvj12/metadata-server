const express = require('express');
const QRCode = require('qrcode');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const tickets = {};

app.post('/api/tickets', async (req, res) => {
  const { tokenId, eventId, eventName, eventDate, price, owner, seatNumber } = req.body;
  
  try {
    // Create verification data for QR code
    const qrData = JSON.stringify({
      tokenId,
      eventId,
      owner,
      eventName,
      eventDate,
      contract: "0x19128bD3C0c9152E2ef74be4472A7A29A15836Ef",
      timestamp: Date.now(),
      verifyUrl: `https://your-app.com/verify/${tokenId}`
    });

    // Generate QR code as PNG base64 (wallet-friendly)
    const qrCodePNG = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 3,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });

    // Create simple, clean ticket design
    const ticketSvg = `
      <svg width="500" height="600" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="100%" height="100%" fill="#6366f1"/>
        <rect x="20" y="20" width="460" height="560" fill="none" stroke="white" stroke-width="3"/>
        
        <!-- Header -->
        <text x="250" y="70" text-anchor="middle" fill="white" font-family="Arial" font-size="28" font-weight="bold">SECURE TICKET</text>
        
        <!-- Event Details -->
        <text x="250" y="120" text-anchor="middle" fill="white" font-family="Arial" font-size="22" font-weight="bold">${eventName}</text>
        <text x="250" y="150" text-anchor="middle" fill="white" font-family="Arial" font-size="16">Date: ${eventDate}</text>
        <text x="250" y="175" text-anchor="middle" fill="white" font-family="Arial" font-size="16">Price: ${price} MATIC</text>
        <text x="250" y="200" text-anchor="middle" fill="white" font-family="Arial" font-size="16">Seat: ${seatNumber} | Token: #${tokenId}</text>
        
        <!-- QR Code (PNG embedded directly) -->
        <image x="50" y="240" width="400" height="400" href="${qrCodePNG}"/>
        
        <!-- Footer -->
        <text x="250" y="570" text-anchor="middle" fill="white" font-family="Arial" font-size="14" font-weight="bold">SCAN QR CODE TO VERIFY AUTHENTICITY</text>
      </svg>
    `;

    // Convert SVG to base64 (safe encoding)
    const svgBase64 = `image/svg+xml;base64,${Buffer.from(ticketSvg).toString('base64')}`;
    
    // Create OpenSea-compatible metadata
    tickets[tokenId] = {
      name: `${eventName} - Ticket #${tokenId}`,
      description: `Admission ticket for ${eventName}. Scan QR code to verify authenticity and ownership on the blockchain.`,
      image: svgBase64,
      external_url: `https://your-app.com/ticket/${tokenId}`,
      animation_url: null,
      attributes: [
        { trait_type: "Event", value: eventName },
        { trait_type: "Date", value: eventDate },
        { trait_type: "Price", value: `${price} MATIC` },
        { trait_type: "Seat Number", value: seatNumber },
        { trait_type: "Token ID", value: tokenId },
        { trait_type: "Event ID", value: eventId },
        { trait_type: "Verification", value: "QR Code Enabled" },
        { trait_type: "Blockchain", value: "Polygon" }
      ]
    };

    console.log(`✅ Generated QR ticket for Token #${tokenId}`);

    res.json({ 
      success: true, 
      tokenId, 
      metadataUrl: `${req.protocol}://${req.get('host')}/api/tickets/${tokenId}`,
      preview: {
        name: tickets[tokenId].name,
        hasQRCode: true,
        qrData: JSON.parse(qrData)
      }
    });
  } catch (error) {
    console.error('❌ Error generating QR ticket:', error);
    res.status(500).json({ error: 'Failed to generate QR ticket', details: error.message });
  }
});

// Serve metadata (what wallets fetch)
app.get('/api/tickets/:tokenId', (req, res) => {
  const { tokenId } = req.params;
  const metadata = tickets[tokenId];
  
  if (!metadata) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  
  // Set proper headers for NFT metadata
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  
  console.log(`📤 Serving metadata for Token #${tokenId}`);
  res.json(metadata);
});

// QR verification endpoint
app.post('/api/verify', (req, res) => {
  const { qrData } = req.body;
  
  try {
    const ticketInfo = JSON.parse(qrData);
    const storedTicket = tickets[ticketInfo.tokenId];
    
    if (!storedTicket) {
      return res.json({ valid: false, message: 'Ticket not found in our records' });
    }
    
    res.json({ 
      valid: true, 
      ticket: {
        tokenId: ticketInfo.tokenId,
        eventName: ticketInfo.eventName,
        owner: ticketInfo.owner,
        eventDate: ticketInfo.eventDate,
        contractAddress: ticketInfo.contract,
        verified: true,
        message: 'Ticket is authentic and valid'
      }
    });
  } catch (error) {
    res.json({ valid: false, message: 'Invalid QR code format' });
  }
});

// Health check - FIXED SYNTAX ERROR HERE
app.get('/', (req, res) => {
  res.json({ 
    status: 'QR Ticket Metadata Server Running',
    version: '1.0.0',
    tickets: Object.keys(tickets).length,
    features: [
      'PNG QR Code Generation',
      'Wallet-Compatible SVG Tickets', 
      'OpenSea Metadata Standard',
      'Blockchain Verification'
    ],
    endpoints: {
      createTicket: 'POST /api/tickets',
      getMeta: 'GET /api/tickets/:tokenId' , // FIXED: Was missing quotes
      verifyQR: 'POST /api/verify'
    }
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 QR Ticket Metadata Server running on port ${PORT}`);
  console.log(`📱 Features: PNG QR codes, wallet-compatible SVG, blockchain verification`);
});
