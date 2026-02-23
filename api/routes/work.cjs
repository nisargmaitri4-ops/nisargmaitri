const express = require('express');
const router = express.Router();
const Work = require('../models/Work.cjs');
const { authenticateAdmin } = require('../middleware/authenticateAdmin.cjs');
const sanitize = require('sanitize-html');

// Safe image handler (same as products)
const safeImage = (val) => {
    if (!val || typeof val !== 'string') return '';
    const v = val.trim();
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/.test(v)) return v;
    return sanitize(v).trim();
};

// GET all work items (public — active only; admin — all)
router.get('/', async (req, res) => {
    try {
        const filter = {};
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            filter.isActive = true;
        }
        const work = await Work.find(filter).sort({ createdAt: -1 });
        res.status(200).json(work);
    } catch (error) {
        console.error('Fetch work error:', error.message);
        res.status(500).json({ error: 'Failed to fetch work items' });
    }
});

// POST seed work items from hardcoded data (admin only)
router.post('/seed', authenticateAdmin, async (req, res) => {
    try {
        const existing = await Work.countDocuments();
        if (existing > 0) {
            return res.status(400).json({ error: 'Work items already exist. Delete all first to re-seed.' });
        }

        const seedData = [
            { title: 'Empowering Education: Gifting School Essentials', details: 'We support schools by gifting essential school supplies and stationery etc. This initiative helps reduce the burden on families, encourages regular attendance, and creates a more inclusive and positive learning environment.', image: '/WhatsApp Image 2025-07-26 at 5.54.59 PM.jpeg', tags: [] },
            { title: 'Water Pots for Street Animals', description: 'Implemented comprehensive recycling system at local school', details: 'We have initiated the Water Pots for Street Animals campaign in Greater Noida to provide clean drinking water for stray animals during extreme heat.', image: '/WhatsApp Image 2025-07-26 at 5.54.18 PM.jpeg', tags: [] },
            { title: 'Feeding Street Animals', details: 'We actively feed street animals, ensuring they receive regular, nutritious meals. This initiative supports the well-being of stray animals reduces hunger-related aggression, and fosters compassion within communities.', image: '/WhatsApp Image 2025-07-26 at 5.55.08 PM.jpeg', tags: [] },
            { title: 'Treatment to Street Animals', details: 'We provide vaccinations to street animals to protect them from deadly diseases like rabies, distemper, and parvovirus, contributing to both animal and public health.', image: '/WhatsApp Image 2025-07-26 at 5.55.05 PM.jpeg', tags: [] },
            { title: 'Reducing Textile Waste', details: 'We upcycle boutique waste into useful products like bags, accessories, and home décor items, creatively reducing textile waste.', image: '/WhatsApp Image 2025-07-26 at 5.55.01 PM.jpeg', tags: [] },
            { title: 'Bioenzyme and Seed Ball Making Workshops', details: 'We conducted Bioenzyme and Seed Ball Making Workshops in college to promote sustainable practices among students.', image: '/WhatsApp Image 2025-07-26 at 5.54.39 PM.jpeg', tags: [] },
            { title: 'Supporting and Uplifting Lives in Old Age Homes', details: 'We support old age homes by providing essential supplies, organizing eatables, and spending quality time with residents through interactive activities and celebrations.', image: '/WhatsApp Image 2025-07-26 at 5.55.03 PM.jpeg', tags: [] },
        ];

        const work = await Work.insertMany(seedData);
        res.status(201).json({ message: `Seeded ${work.length} work items`, work });
    } catch (error) {
        console.error('Seed work error:', error.message);
        res.status(500).json({ error: 'Failed to seed work items' });
    }
});

// GET single work item
router.get('/:id', async (req, res) => {
    try {
        const work = await Work.findById(req.params.id);
        if (!work) return res.status(404).json({ error: 'Work item not found' });
        res.status(200).json(work);
    } catch (error) {
        console.error('Fetch work item error:', error.message);
        res.status(500).json({ error: 'Failed to fetch work item' });
    }
});

// POST create work item (admin only)
router.post('/', authenticateAdmin, async (req, res) => {
    try {
        const data = {
            title: sanitize(req.body.title || '').trim(),
            description: sanitize(req.body.description || '').trim(),
            details: sanitize(req.body.details || '').trim(),
            results: sanitize(req.body.results || '').trim(),
            image: safeImage(req.body.image),
            gallery: Array.isArray(req.body.gallery) ? req.body.gallery.map(safeImage).filter(Boolean) : [],
            tags: Array.isArray(req.body.tags) ? req.body.tags.map((t) => sanitize(t).trim()).filter(Boolean) : [],
            isActive: req.body.isActive !== false,
        };

        if (!data.title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const work = new Work(data);
        await work.save();
        console.log(`Work created: ${work.title} (${work._id})`);
        res.status(201).json(work);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ error: messages.join(', ') });
        }
        console.error('Create work error:', error.message);
        res.status(500).json({ error: 'Failed to create work item' });
    }
});

// PUT update work item (admin only)
router.put('/:id', authenticateAdmin, async (req, res) => {
    try {
        const updates = {};
        if (req.body.title !== undefined) updates.title = sanitize(req.body.title).trim();
        if (req.body.description !== undefined) updates.description = sanitize(req.body.description).trim();
        if (req.body.details !== undefined) updates.details = sanitize(req.body.details).trim();
        if (req.body.results !== undefined) updates.results = sanitize(req.body.results).trim();
        if (req.body.image !== undefined) updates.image = safeImage(req.body.image);
        if (req.body.gallery !== undefined) updates.gallery = Array.isArray(req.body.gallery) ? req.body.gallery.map(safeImage).filter(Boolean) : [];
        if (req.body.tags !== undefined) updates.tags = Array.isArray(req.body.tags) ? req.body.tags.map((t) => sanitize(t).trim()).filter(Boolean) : [];
        if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

        const work = await Work.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        });

        if (!work) return res.status(404).json({ error: 'Work item not found' });
        console.log(`Work updated: ${work.title} (${work._id})`);
        res.status(200).json(work);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ error: messages.join(', ') });
        }
        console.error('Update work error:', error.message);
        res.status(500).json({ error: 'Failed to update work item' });
    }
});

// DELETE work item (admin only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        const work = await Work.findByIdAndDelete(req.params.id);
        if (!work) return res.status(404).json({ error: 'Work item not found' });
        console.log(`Work deleted: ${work.title} (${work._id})`);
        res.status(200).json({ message: 'Work item deleted successfully' });
    } catch (error) {
        console.error('Delete work error:', error.message);
        res.status(500).json({ error: 'Failed to delete work item' });
    }
});

module.exports = router;
