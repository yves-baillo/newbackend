const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Debug middleware – logs every request
app.use((req, res, next) => {
  console.log(`📩 ${req.method} ${req.url}`);
  console.log('📩 Body:', req.body);
  next();
});

// ============================================
// ROOT ENDPOINT
// ============================================
app.get('/', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// ============================================
// TEST ENDPOINT
// ============================================
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Test endpoint works!' });
});

// ============================================
// ADMIN LOGIN – UPDATED with username
// ============================================
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;  // Now expects 'username'

  // Hardcoded credentials
  const adminUsername = 'hakizimana';
  const adminPassword = 'alexis';

  if (username === adminUsername && password === adminPassword) {
    res.json({
      success: true,
      message: 'Login successful',
      token: 'demo-jwt-token-12345',
      user: { username: adminUsername, name: 'Admin' }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  }
});

// ============================================
// SCHOLARSHIPS ENDPOINTS
// ============================================
app.get('/api/scholarships', (req, res) => {
  res.json([
    {
      id: 1,
      title: 'Fulbright Scholarship 2025',
      country: 'USA',
      degree: "Master's & PhD",
      description: 'The Fulbright Scholarship provides funding for international students to study in the United States.',
      eligibility: 'Open to all nationalities. Bachelor\'s degree required.',
      benefits: 'Full tuition coverage, monthly stipend, health insurance, airfare.',
      deadline: '2025-10-15',
      image_url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=500',
      status: 'active',
      featured: true,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      title: 'Chevening Scholarship',
      country: 'UK',
      degree: "Master's",
      description: "Chevening is the UK government's international awards program.",
      eligibility: 'Citizens of Chevening-eligible countries. 2+ years work experience.',
      benefits: 'Full tuition fees, living allowance, return flights to UK.',
      deadline: '2025-11-07',
      image_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500',
      status: 'active',
      featured: true,
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      title: 'DAAD Scholarship Germany',
      country: 'Germany',
      degree: "Master's & PhD",
      description: 'DAAD offers scholarships for international students to study in Germany.',
      eligibility: 'Bachelor\'s degree in relevant field. Good academic record.',
      benefits: 'Monthly stipend of €934, health insurance, travel allowance.',
      deadline: '2025-09-30',
      image_url: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=500',
      status: 'active',
      featured: false,
      created_at: new Date().toISOString()
    }
  ]);
});

app.get('/api/scholarships/:id', (req, res) => {
  const scholarshipId = parseInt(req.params.id);
  res.json({
    id: scholarshipId,
    title: 'Scholarship Details',
    description: 'Full description of the scholarship',
    eligibility: 'Eligibility requirements',
    benefits: 'Benefits and coverage',
    deadline: '2025-12-31',
    image_url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=500',
    country: 'Various',
    degree: "Master's & PhD",
    status: 'active',
    featured: true,
    created_at: new Date().toISOString()
  });
});

// ============================================
// NOTIFICATIONS ENDPOINTS
// ============================================
app.get('/api/notifications', (req, res) => {
  res.json([
    { id: 1, type: 'scholarship', title: '🎓 New Scholarship: Fulbright 2025', message: 'Apply now for fully funded USA scholarship', created_at: new Date().toISOString(), read: false, scholarship_id: 1 },
    { id: 2, type: 'deadline', title: '⏰ Deadline Approaching', message: 'Chevening Scholarship deadline in 7 days', created_at: new Date().toISOString(), read: false, scholarship_id: 2 },
    { id: 3, type: 'news', title: '📢 Application Tips', message: 'How to write a winning Statement of Purpose', created_at: new Date().toISOString(), read: false },
    { id: 4, type: 'scholarship', title: '🎓 DAAD Scholarship 2025', message: 'Study in Germany with full funding', created_at: new Date().toISOString(), read: false, scholarship_id: 3 }
  ]);
});

app.patch('/api/notifications/:id/read', (req, res) => {
  res.json({ success: true, message: `Notification ${req.params.id} marked as read` });
});

app.patch('/api/notifications/read-all', (req, res) => {
  res.json({ success: true, message: 'All notifications marked as read' });
});

// ============================================
// CONTACT & SUBSCRIPTION
// ============================================
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  res.json({ success: true, message: 'Message sent successfully!' });
});

app.post('/api/subscribe', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }
  res.json({ success: true, message: 'Subscribed successfully!' });
});

app.post('/api/scholarship/inquiry', (req, res) => {
  const { name, email, scholarship_id, question } = req.body;
  if (!name || !email || !question) {
    return res.status(400).json({ success: false, message: 'Please provide name, email, and question' });
  }
  res.json({ success: true, message: 'Inquiry submitted successfully!' });
});

// ============================================
// 404 HANDLER – Must be at the end
// ============================================
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = app;