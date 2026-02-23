const express = require('express');
const router = express.Router();
const Service = require('../models/Service.cjs');
const { authenticateAdmin } = require('../middleware/authenticateAdmin.cjs');
const sanitize = require('sanitize-html');

// GET all services (public — active only; admin — all)
router.get('/', async (req, res) => {
    try {
        const filter = {};
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            filter.isActive = true;
        }
        const services = await Service.find(filter).sort({ createdAt: -1 });
        res.status(200).json(services);
    } catch (error) {
        console.error('Fetch services error:', error.message);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

// POST seed services from hardcoded data (admin only)
router.post('/seed', authenticateAdmin, async (req, res) => {
    try {
        const existing = await Service.countDocuments();
        if (existing > 0) {
            return res.status(400).json({ error: 'Services already exist. Delete all first to re-seed.' });
        }

        const seedData = [
            { title: 'Workshops & Seminars on Climate Change, Plastic Pollution, Biodiversity, etc.', description: 'As Planet Warriors, we conduct engaging workshops and seminars on key environmental issues like climate change, plastic pollution, and biodiversity loss. These sessions raise awareness, foster eco-conscious thinking, and empower communities to take action.', icon: 'BarChart4' },
            { title: 'Eco-Education Programs in schools and colleges', description: 'Eco-Education Programs in schools and colleges aim to instill environmental awareness, responsibility, and sustainable practices among students. Through activities like green clubs, eco-quizzes, clean-up drives, and hands-on projects.', icon: 'GraduationCap' },
            { title: 'Waste Management & Recycling Services', description: 'Our Waste Management & Recycling Services focus on promoting responsible waste disposal and resource recovery within communities, institutions, and households.', icon: 'Leaf' },
            { title: 'Plastic-Free Lifestyle Tips', description: 'Adopting a plastic-free lifestyle starts with simple swaps: use cloth bags instead of plastic, carry a reusable water bottle and cutlery, and choose glass or metal containers over plastic ones.', icon: 'Building' },
            { title: 'Zero-Waste Event Planning (eco-friendly weddings, events)', description: 'Zero-Waste Event Planning focuses on organizing eco-friendly weddings and events that minimize environmental impact.', icon: 'Users' },
            { title: 'Urban Farming and Terrace Gardening Consultation', description: 'Our Urban Gardening and Terrace Farming consultancy empowers individuals and communities to grow their own food in limited spaces.', icon: 'PenTool' },
            { title: 'Our Sustainable Menstruation Awareness services', description: 'Our Sustainable Menstruation Awareness services educate individuals, especially young women and girls, on eco-friendly menstrual choices.', icon: 'PenTool' },
        ];

        const services = await Service.insertMany(seedData);
        res.status(201).json({ message: `Seeded ${services.length} services`, services });
    } catch (error) {
        console.error('Seed services error:', error.message);
        res.status(500).json({ error: 'Failed to seed services' });
    }
});

// GET single service
router.get('/:id', async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        res.status(200).json(service);
    } catch (error) {
        console.error('Fetch service error:', error.message);
        res.status(500).json({ error: 'Failed to fetch service' });
    }
});

// POST create service (admin only)
router.post('/', authenticateAdmin, async (req, res) => {
    try {
        const data = {
            title: sanitize(req.body.title || '').trim(),
            description: sanitize(req.body.description || '').trim(),
            icon: req.body.icon || 'Leaf',
            isActive: req.body.isActive !== false,
        };

        if (!data.title || !data.description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        const service = new Service(data);
        await service.save();
        console.log(`Service created: ${service.title} (${service._id})`);
        res.status(201).json(service);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ error: messages.join(', ') });
        }
        console.error('Create service error:', error.message);
        res.status(500).json({ error: 'Failed to create service' });
    }
});

// PUT update service (admin only)
router.put('/:id', authenticateAdmin, async (req, res) => {
    try {
        const updates = {};
        if (req.body.title !== undefined) updates.title = sanitize(req.body.title).trim();
        if (req.body.description !== undefined) updates.description = sanitize(req.body.description).trim();
        if (req.body.icon !== undefined) updates.icon = req.body.icon;
        if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

        const service = await Service.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        });

        if (!service) return res.status(404).json({ error: 'Service not found' });
        console.log(`Service updated: ${service.title} (${service._id})`);
        res.status(200).json(service);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ error: messages.join(', ') });
        }
        console.error('Update service error:', error.message);
        res.status(500).json({ error: 'Failed to update service' });
    }
});

// DELETE service (admin only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        const service = await Service.findByIdAndDelete(req.params.id);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        console.log(`Service deleted: ${service.title} (${service._id})`);
        res.status(200).json({ message: 'Service deleted successfully' });
    } catch (error) {
        console.error('Delete service error:', error.message);
        res.status(500).json({ error: 'Failed to delete service' });
    }
});

module.exports = router;
