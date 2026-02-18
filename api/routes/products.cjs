const express = require('express');
const router = express.Router();
const Product = require('../models/Product.cjs');
const { authenticateAdmin } = require('../middleware/authenticateAdmin.cjs');
const sanitize = require('sanitize-html');

// Safe image handler: allow base64 data-URLs and normal paths, block scripts
const safeImage = (val) => {
  if (!val || typeof val !== 'string') return '';
  const v = val.trim();
  // Allow base64 data URLs (image types only)
  if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/.test(v)) return v;
  // Allow normal paths / URLs — sanitize to strip any HTML
  return sanitize(v).trim();
};

// GET all products (public - for shop page)
router.get('/', async (req, res) => {
  try {
    const { category, search, active } = req.query;
    const filter = {};

    // Only show active products for public (non-admin) requests
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      filter.isActive = true;
    } else if (active !== undefined) {
      filter.isActive = active === 'true';
    }

    if (category && category !== 'All') {
      filter.category = category;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    console.error('Fetch products error:', error.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST seed products from hardcoded data (admin only, one-time migration)
// MUST be before /:id so Express doesn't treat "seed" as an id
router.post('/seed', authenticateAdmin, async (req, res) => {
  try {
    const existing = await Product.countDocuments();
    if (existing > 0) {
      return res.status(400).json({ error: 'Products already exist. Delete all first to re-seed.' });
    }

    const seedData = [
      { name: 'Bamboo Toothbrush', description: 'Eco-friendly bamboo toothbrush with soft bristles, perfect for everyday use.', price: 40, image: '/toothbrush.png', category: 'Bamboo', tag: 'Bestseller', stock: 100, isActive: true },
      { name: 'Bamboo Tongue Cleaner', description: 'Natural bamboo tongue cleaner for improved oral hygiene.', price: 40, image: '/tongue_cleaner.png', category: 'Bamboo', tag: '', stock: 100, isActive: true },
      { name: 'Bamboo Razor', description: 'Sustainable bamboo razor with replaceable stainless steel blades.', price: 199, image: '/BAmboo (2).png', category: 'Bamboo', tag: '', stock: 50, isActive: true },
      { name: 'Menstrual Cup', description: 'Reusable silicone menstrual cup, eco-friendly alternative to disposable products.', price: 299, image: '/cup.png', category: 'Menstrual', tag: 'Popular', stock: 80, isActive: true },
      { name: 'Bamboo Straws (each of 40)', description: 'Reusable bamboo drinking straws.', price: 40, image: '/BAmboo (1).png', category: 'Bamboo', tag: '', stock: 200, isActive: true },
      { name: 'Collapsible Steel Cup', description: 'Stainless steel Portable cup (75 ml) for hot and cold beverages.', price: 199, image: '/tumbler.png', category: 'Steel', tag: '', stock: 60, isActive: true },
      { name: 'Reusable Makeup Remover Pads (each of 69 rs)', description: 'Reusable makeup remover pads.', price: 69, image: '/makeupremove.jpeg', category: 'Zero Waste', tag: '', stock: 150, isActive: true },
      { name: 'Steel Water Bottle 750ml', description: 'Stainless steel water bottle with leak-proof lid, 750ml capacity.', price: 199, image: '/Untitled design (35).png', category: 'Steel', tag: 'New', stock: 70, isActive: true },
      { name: 'Handmade Customized Muffler', description: 'Handcrafted muffler made from Wollen, can be customized.', price: 799, image: '/mufflers.png', category: 'Zero Waste', tag: '', stock: 30, isActive: true },
      { name: 'Zero Waste Cutlery Set', description: 'Portable stainless steel cutlery set with fork, spoon, Steel straw, straw cleaner and bamboo tooth brush neatly packed in a durable cotton pouch.', price: 199, image: '/cutlery_set.png', category: 'Zero Waste', tag: '', stock: 90, isActive: true },
      { name: 'Steel Water Bottle 1L', description: 'Stainless steel water bottle with leak-proof lid, (1 litre) capacity.', price: 249, image: '/Untitled design (35).png', category: 'Steel', tag: 'New', stock: 70, isActive: true },
    ];

    const products = await Product.insertMany(seedData);
    console.log(`Seeded ${products.length} products`);
    res.status(201).json({ message: `Seeded ${products.length} products`, products });
  } catch (error) {
    console.error('Seed products error:', error.message);
    res.status(500).json({ error: 'Failed to seed products' });
  }
});

// GET dashboard stats (admin only)
// MUST be before /:id so Express doesn't treat "admin" as an id
router.get('/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const outOfStock = await Product.countDocuments({ stock: 0, isActive: true });
    const categories = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      totalProducts,
      activeProducts,
      inactiveProducts: totalProducts - activeProducts,
      outOfStock,
      categories,
    });
  } catch (error) {
    console.error('Stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error('Fetch product error:', error.message);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST create product (admin only)
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const data = {
      name: sanitize(req.body.name || '').trim(),
      description: sanitize(req.body.description || '').trim(),
      price: Number(req.body.price) || 0,
      comparePrice: Number(req.body.comparePrice) || 0,
      image: safeImage(req.body.image),
      category: sanitize(req.body.category || '').trim(),
      tag: sanitize(req.body.tag || '').trim(),
      stock: Number(req.body.stock) || 0,
      isActive: req.body.isActive !== false,
      sku: sanitize(req.body.sku || '').trim(),
    };

    if (!data.name || !data.description || !data.price || !data.image || !data.category) {
      return res.status(400).json({ error: 'Name, description, price, image, and category are required' });
    }

    const product = new Product(data);
    await product.save();
    console.log(`Product created: ${product.name} (${product._id})`);
    res.status(201).json(product);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    console.error('Create product error:', error.message);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT update product (admin only)
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = sanitize(req.body.name).trim();
    if (req.body.description !== undefined) updates.description = sanitize(req.body.description).trim();
    if (req.body.price !== undefined) updates.price = Number(req.body.price);
    if (req.body.comparePrice !== undefined) updates.comparePrice = Number(req.body.comparePrice);
    if (req.body.image !== undefined) updates.image = safeImage(req.body.image);
    if (req.body.category !== undefined) updates.category = sanitize(req.body.category).trim();
    if (req.body.tag !== undefined) updates.tag = sanitize(req.body.tag).trim();
    if (req.body.stock !== undefined) updates.stock = Number(req.body.stock);
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    if (req.body.sku !== undefined) updates.sku = sanitize(req.body.sku).trim();

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log(`Product updated: ${product.name} (${product._id})`);
    res.status(200).json(product);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    console.error('Update product error:', error.message);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE product (admin only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.log(`Product deleted: ${product.name} (${product._id})`);
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error.message);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
