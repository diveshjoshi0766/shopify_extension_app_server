require('dotenv').config();
const express = require('express');
const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');

const app = express();
const port = process.env.PORT || 3000;

// Configure Shopify API
const shopify = shopifyApi({
  apiKey: '5e8a0f203d8c3c433a539bf46a2e54ea',
  apiSecretKey: '530b6f4b62a883758ee2606a4df75860',
  scopes: 'write_delivery_customizations',
  hostName: process.env.SHOPIFY_HOST,
  apiVersion: '2025-01',
  isEmbeddedApp: true,
});
// Heartbeat endpoint to check if server is alive
app.get('/heartbeat', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Server is running'
    });
  });

// Install endpoint (start OAuth flow)
app.get('/install', async (req, res) => {
  const shop = req.query.shop;
  const authRoute = await shopify.auth.begin({
    shop,
    callbackPath: '/api/auth/callback',
    isOnline: false,
  });
  
  res.redirect(authRoute);
});

// Handle OAuth callback
app.get('/api/auth/callback', async (req, res) => {
  try {
    const { code, shop } = req.query;
    
    // Validate HMAC signature
    const valid = shopify.auth.oauth.validateHmac(req.query);
    if (!valid) return res.status(400).send('Invalid HMAC validation');

    // Exchange code for access token
    const { access_token } = await shopify.auth.oauth.tokenize({
      code,
      shop,
    });

    // ➡️ THIS IS FOR DEMO ONLY - DO NOT LOG TOKENS IN PRODUCTION ⬅️
    console.log('🔑 Shopify Access Token:', access_token);
    console.log('🏪 Store Domain:', shop);

    res.send(`
      <h1>Installation Successful</h1>
      <p>Token for ${shop} logged in server console</p>
    `);

  } catch (err) {
    console.error('🚨 Installation failed:', err);
    res.status(500).send('Installation failed - check server logs');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});