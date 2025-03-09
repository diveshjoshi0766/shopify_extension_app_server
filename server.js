require('dotenv').config();
const express = require('express');
const { shopifyApi, ApiVersion } = require('@shopify/shopify-api');
const { NodeAdapter } = require('@shopify/shopify-api/adapters/node'); 

const app = express();
const port = process.env.PORT || 3000;

// Configure Shopify API
const shopify = shopifyApi({
  apiKey: '5e8a0f203d8c3c433a539bf46a2e54ea',
  apiSecretKey: '530b6f4b62a883758ee2606a4df75860',
  scopes: 'write_delivery_customizations',
  hostName: 'shopify-extension-app-server.vercel.app',
  apiVersion: ApiVersion.January25,
  adapter: NodeAdapter,
  isEmbeddedApp: true
});

// Root endpoint - handle initial request
app.get('/', (req, res) => {
  const shop = req.query.shop;

  console.log("shop >><<", shop);

  if (shop) {
    // If shop parameter is present, redirect to install
    return res.redirect(`/install?shop=${shop}`);
  }
  // Otherwise show a simple landing page
  res.send(`
    <h1>Shopify App</h1>
    <p>Visit /install?shop=dynavapeu.myshopify.com to install this app</p>
  `);
});

// Heartbeat endpoint
app.get('/heartbeat', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Server is running'
  });
});

// Install endpoint (start OAuth flow)
app.get('/install', async (req, res) => {
    try {
      const shop = req.query.shop;
      console.log('Logging req:', req);
      if (!shop) return res.status(400).send('Shop parameter required');
  
      console.log('Starting auth for shop:', shop);

      const authUrl = await shopify.auth.begin({
        shop,
        callbackPath: '/api/auth/callback',
        isOnline: false,
        rawRequest: {  // Explicitly pass headers
          headers: req.headers,
          url: req.url,
        }
      });
  
      res.redirect(authUrl);
    } catch (error) {
      console.error('Auth error:', error);
      res.status(500).send('Authentication failed');
    }
  });
  
  // OAuth callback handler
  app.get('/api/auth/callback', async (req, res) => {
    try {
        console.log('Callback received with query params:', req.query);
      // Validate HMAC first
      const valid = shopify.auth.oauth.validateHmac(req.query);
      if (!valid) return res.status(400).send('Invalid request');
  
      // Exchange code for token
      const { access_token, shop } = await shopify.auth.oauth.tokenize({
        code: req.query.code,
        shop: req.query.shop,
      });
  
      console.log('✅ Access Token:', access_token?.slice(0, 10) + '...');
      res.send(`<h1>Success!</h1><p>Token received for ${shop}</p>`);
      
    } catch (err) {
      console.error('Tokenization error:', err);
      res.status(500).send('Token exchange failed');
    }
  });
  

// Make sure to add this callback handler with the exact URI pattern Shopify expects
app.get('/auth/callback', (req, res) => {
  // Redirect to our actual handler with the same query parameters
  const queryString = new URLSearchParams(req.query).toString();
  res.redirect(`/api/auth/callback?${queryString}`);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});