require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Configuration (simulating ConfigService)
const config = {
  'shopify.appProxy.clientId': '5e8a0f203d8c3c433a539bf46a2e54ea',
  'shopify.appProxy.clientSecret': '530b6f4b62a883758ee2606a4df75860',
  'shopify.appProxy.scopes': ['write_delivery_customizations'],
  'apiUrl': process.env.API_URL || 'https://shopify-extension-app-server.vercel.app'
};

// Global access token storage (similar to your class variable)
let global_access_token = "";

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint - handle initial request
app.get('/', (req, res) => {
  const shop = req.query.shop;

  console.log("Shop parameter:", shop);

  if (shop) {
    // If shop parameter is present, redirect to install
    return res.redirect(`/shopify-oauth/init?shop=${shop}`);
  }
  // Otherwise show a simple landing page
  res.send(`
    <h1>Shopify App</h1>
    <p>Visit /?shop=your-shop.myshopify.com to install this app</p>
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

// OAuth initialization endpoint
app.get('/shopify-oauth/init', (req, res) => {
  console.log("I am in init");
  const { shop } = req.query;
  
  if (!shop) {
    return res.status(400).send('Shop parameter required');
  }

  // Create OAuth URL exactly like your NextJS example
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${
    config['shopify.appProxy.clientId']
  }&scope=${
    config['shopify.appProxy.scopes'].join(',')
  }&redirect_uri=${
    config['apiUrl']
  }/shopify-oauth/redirect&state=nonce&grant_options[]=per-user`;

  console.log("Auth URL:", authUrl);
  res.redirect(authUrl);
});

// OAuth callback handler
app.get('/shopify-oauth/redirect', async (req, res) => {
  try {
    console.log('I am in redirect. Code:', req.query.code);
    const { shop, code } = req.query;
    
    if (!shop || !code) {
      console.error('Missing required parameters');
      return res.status(400).send('Missing required parameters');
    }
    
    // Exchange code for token using direct axios request (just like your NextJS example)
    const response = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: config['shopify.appProxy.clientId'],
        client_secret: config['shopify.appProxy.clientSecret'],
        code: code
      }
    );
    
    console.log("Token Response - " + JSON.stringify(response.data));
    console.log("Token Response2 - " + response.data.access_token);
    
    // Store token globally
    global_access_token = response.data.access_token;
    
    // Redirect to the app in the admin
    res.redirect(`https://${shop}/admin/apps?shop=${shop}`);
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    if (err.response) {
      console.error('Response data:', err.response.data);
    }
    res.status(500).send(`Authentication callback failed: ${err.message}`);
  }
});

// Endpoint to check the token (for testing)
app.get('/token-status', (req, res) => {
  if (global_access_token) {
    res.json({
      status: 'Token available',
      token_preview: global_access_token.substring(0, 5) + '...'
    });
  } else {
    res.json({
      status: 'No token available'
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Visit http://localhost:${port} to get started`);
});