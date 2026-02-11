const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Import routes (to be implemented in routes/)
try {
  const orderRoutes = require('./routes/orderRoutes');
  const productionRoutes = require('./routes/productionRoutes');
  const inventoryRoutes = require('./routes/inventoryRoutes');
  const analyticsRoutes = require('./routes/analyticsRoutes');

  app.use('/api/orders', orderRoutes);
  app.use('/api/production', productionRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/analytics', analyticsRoutes);
} catch (err) {
  // Routes are placeholders during initial setup
  console.warn('Routes not yet implemented:', err.message);
}

// Root route
app.get('/', (req, res) => {
  res.send('Bunca Roastery System API');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
