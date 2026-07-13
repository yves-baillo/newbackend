const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

// ============================================
// ROOT ENDPOINT
// ============================================
app.get('/', (req, res) => {
  res.json({ success: true, message: 'API is running' })
})

// ============================================
// TEST ENDPOINT
// ============================================
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Test endpoint works!' })
})

// ============================================
// ADMIN LOGIN - FIXED!
// ============================================
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body
  
  // For demo purposes - replace with real authentication
  const adminEmail = 'admin@goabroad.com'
  const adminPassword = 'admin123'
  
  if (email === adminEmail && password === adminPassword) {
    res.json({
      success: true,
      message: 'Login successful',
      token: 'demo-jwt-token-12345',
      user: {
        email: adminEmail,
        name: 'Admin'
      }
    })
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    })
  }
})

// ============================================
// SCHOLARSHIPS ENDPOINTS
// ============================================

// Get all scholarships
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
    },
    {
      id: 4,
      title: 'Erasmus Mundus Scholarship',
      country: 'Europe',
      degree: "Master's",
      description: 'Erasmus Mundus offers fully funded scholarships for international students to study in multiple European countries.',
      eligibility: 'Bachelor\'s degree. Open to all nationalities.',
      benefits: 'Full tuition, monthly stipend, travel costs, insurance.',
      deadline: '2025-12-01',
      image_url: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=500',
      status: 'active',
      featured: false,
      created_at: new Date().toISOString()
    },
    {
      id: 5,
      title: 'Australia Awards Scholarship',
      country: 'Australia',
      degree: "Master's & PhD",
      description: 'Australia Awards provides fully funded scholarships for students from developing countries.',
      eligibility: 'Citizens of eligible countries. Bachelor\'s degree required.',
      benefits: 'Full tuition, living allowance, health insurance, travel.',
      deadline: '2025-08-30',
      image_url: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=500',
      status: 'active',
      featured: false,
      created_at: new Date().toISOString()
    }
  ])
})

// Get single scholarship by ID
app.get('/api/scholarships/:id', (req, res) => {
  const scholarshipId = parseInt(req.params.id)
  
  // Return scholarship details based on ID
  // For now, returning a sample response
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
  })
})

// ============================================
// NOTIFICATIONS ENDPOINTS
// ============================================

// Get all notifications
app.get('/api/notifications', (req, res) => {
  res.json([
    { 
      id: 1, 
      type: 'scholarship', 
      title: '🎓 New Scholarship: Fulbright 2025', 
      message: 'Apply now for fully funded USA scholarship', 
      created_at: new Date().toISOString(), 
      read: false, 
      scholarship_id: 1 
    },
    { 
      id: 2, 
      type: 'deadline', 
      title: '⏰ Deadline Approaching', 
      message: 'Chevening Scholarship deadline in 7 days', 
      created_at: new Date().toISOString(), 
      read: false, 
      scholarship_id: 2 
    },
    { 
      id: 3, 
      type: 'news', 
      title: '📢 Application Tips', 
      message: 'How to write a winning Statement of Purpose', 
      created_at: new Date().toISOString(), 
      read: false 
    },
    { 
      id: 4, 
      type: 'scholarship', 
      title: '🎓 DAAD Scholarship 2025', 
      message: 'Study in Germany with full funding', 
      created_at: new Date().toISOString(), 
      read: false, 
      scholarship_id: 3 
    },
    { 
      id: 5, 
      type: 'news', 
      title: '📢 Visa Update', 
      message: 'New visa policies for international students', 
      created_at: new Date().toISOString(), 
      read: false 
    }
  ])
})

// Mark notification as read
app.patch('/api/notifications/:id/read', (req, res) => {
  const notificationId = parseInt(req.params.id)
  res.json({ 
    success: true, 
    message: `Notification ${notificationId} marked as read` 
  })
})

// Mark all notifications as read
app.patch('/api/notifications/read-all', (req, res) => {
  res.json({ 
    success: true, 
    message: 'All notifications marked as read' 
  })
})

// ============================================
// CONTACT & SUBSCRIPTION ENDPOINTS
// ============================================

// Contact form submission
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body
  
  // Validate
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Please provide name, email, and message'
    })
  }
  
  res.json({ 
    success: true, 
    message: 'Message sent successfully!' 
  })
})

// Newsletter subscription
app.post('/api/subscribe', (req, res) => {
  const { email } = req.body
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    })
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    })
  }
  
  res.json({ 
    success: true, 
    message: 'Subscribed successfully!' 
  })
})

// Scholarship inquiry
app.post('/api/scholarship/inquiry', (req, res) => {
  const { name, email, scholarship_id, question } = req.body
  
  if (!name || !email || !question) {
    return res.status(400).json({
      success: false,
      message: 'Please provide name, email, and question'
    })
  }
  
  res.json({ 
    success: true, 
    message: 'Inquiry submitted successfully!' 
  })
})

// ============================================
// 404 HANDLER - Must be at the end!
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  })
})

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  })
})

module.exports = app