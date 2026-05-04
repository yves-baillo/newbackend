const express = require('express')
const mysql = require('mysql2')
const cors = require('cors')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const app = express()

// ==================== CORS CONFIGURATION ====================
const allowedOrigins = [
  'https://goabroadadmissions.vercel.app',           // Your production frontend
  'https://goabroadadmissions-git-main.vercel.app',  // Main branch preview
  /\.vercel\.app$/,                                   // All preview deployments
  'http://localhost:5173',                           // Local Vite dev
  'http://localhost:3000',                           // Local backend dev
  'http://localhost:5000'                            // Alternative local port
]

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true)
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin)
      }
      return allowed === origin
    })
    
    if (isAllowed) {
      callback(null, true)
    } else {
      console.log(`Blocked CORS request from: ${origin}`)
      callback(new Error('CORS policy does not allow access from this origin'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

app.use(express.json())

// ==================== DATABASE CONNECTION (VERCEL READY) ====================
// Use environment variables for cloud database
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'goabroad_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
}

// Create connection pool
const pool = mysql.createPool(dbConfig)
const db = pool.promise()

// Test database connection
async function testDatabaseConnection() {
  try {
    const connection = await db.getConnection()
    console.log('✅ Connected to MySQL database!')
    connection.release()
    return true
  } catch (err) {
    console.error('❌ Database connection error:', err.message)
    console.error('Make sure you have configured DB_* environment variables in Vercel')
    return false
  }
}

// Make db available to all routes
app.use((req, res, next) => {
  req.db = db
  next()
})

// ==================== INITIALIZE TABLES ====================
async function initializeTables() {
  try {
    // Create admins table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Admins table ready')

    // Check if default admin exists
    const [admins] = await db.execute('SELECT * FROM admins WHERE username = ?', ['admin'])
    
    if (admins.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      await db.execute(
        'INSERT INTO admins (username, password, email) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 'admin@goabroad.com']
      )
      console.log('✅ Default admin created (username: admin, password: admin123)')
    } else {
      // Check if existing admin has plain text password and update it
      const admin = admins[0]
      if (admin.password && admin.password.length < 60 && !admin.password.startsWith('$2')) {
        const hashedPassword = await bcrypt.hash(admin.password, 10)
        await db.execute('UPDATE admins SET password = ? WHERE id = ?', [hashedPassword, admin.id])
        console.log('✅ Admin password hashed successfully')
      }
    }

    // Create subscribers table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Subscribers table ready')

    // Create contacts table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Contacts table ready')

    // Create scholarship inquiries table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS scholarship_inquiries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        scholarship_title VARCHAR(500) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('pending', 'contacted', 'completed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Scholarship Inquiries table ready')

    // Create scholarships table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS scholarships (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        country VARCHAR(255) NOT NULL,
        degree VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        eligibility TEXT,
        benefits TEXT,
        deadline DATE,
        link VARCHAR(500),
        image_url VARCHAR(500),
        status ENUM('active', 'inactive') DEFAULT 'active',
        featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Scholarships table ready')

    // Insert sample scholarships if table is empty
    const [count] = await db.execute('SELECT COUNT(*) as count FROM scholarships')
    
    if (count[0].count === 0) {
      const sampleScholarships = [
        {
          title: 'Fulbright Scholarship 2025',
          country: 'USA',
          degree: "Master's & PhD",
          description: 'The Fulbright Scholarship provides funding for international students to study in the United States. It covers tuition, living expenses, and travel costs.',
          eligibility: 'Open to all nationalities. Bachelor\'s degree required. Minimum GPA 3.0.',
          benefits: 'Full tuition coverage, monthly stipend of $2,000, health insurance, round-trip airfare.',
          deadline: '2025-10-15',
          link: 'https://foreign.fulbrightonline.org',
          image_url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=500&auto=format&fit=crop',
          status: 'active',
          featured: true
        },
        {
          title: 'Chevening Scholarship',
          country: 'UK',
          degree: "Master's",
          description: 'Chevening is the UK government\'s international awards program aimed at developing global leaders.',
          eligibility: 'Citizens of Chevening-eligible countries. 2+ years of work experience. Undergraduate degree.',
          benefits: 'Full tuition fees, living allowance, return flights to UK, additional grants.',
          deadline: '2025-11-07',
          link: 'https://www.chevening.org',
          image_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&auto=format&fit=crop',
          status: 'active',
          featured: true
        },
        {
          title: 'DAAD Scholarship Germany',
          country: 'Germany',
          degree: "Master's & PhD",
          description: 'DAAD offers scholarships for international students to study in Germany.',
          eligibility: 'Bachelor\'s degree in relevant field. Good academic record.',
          benefits: 'Monthly stipend of €934, health insurance, travel allowance, study allowance.',
          deadline: '2025-09-30',
          link: 'https://www.daad.de',
          image_url: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=500&auto=format&fit=crop',
          status: 'active',
          featured: false
        }
      ]
      
      for (const scholarship of sampleScholarships) {
        await db.execute(
          `INSERT INTO scholarships 
          (title, country, degree, description, eligibility, benefits, deadline, link, image_url, status, featured) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [scholarship.title, scholarship.country, scholarship.degree, scholarship.description, 
           scholarship.eligibility, scholarship.benefits, scholarship.deadline, scholarship.link, 
           scholarship.image_url, scholarship.status, scholarship.featured]
        )
      }
      console.log('✅ Sample scholarships inserted')
    }

  } catch (error) {
    console.error('Error initializing tables:', error)
  }
}

// Initialize database after connection test
testDatabaseConnection().then(connected => {
  if (connected) {
    initializeTables()
  }
})

// ==================== MIDDLEWARE ====================
const checkToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }
  next()
}

// ==================== ADMIN AUTHENTICATION ====================

// POST /api/admin/login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username and password are required' 
    })
  }
  
  try {
    const [results] = await db.execute('SELECT id, username, email, password FROM admins WHERE username = ?', [username])
    
    if (results.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      })
    }
    
    const admin = results[0]
    const passwordMatch = await bcrypt.compare(password, admin.password)
    
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      })
    }
    
    // Simple token generation (you can also use JWT if preferred)
    const token = Buffer.from(`${username}:${Date.now()}`).toString('base64')
    
    res.json({ 
      success: true, 
      message: 'Login successful',
      token: token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    })
  }
})

// GET /api/admin/verify
app.get('/api/admin/verify', checkToken, (req, res) => {
  res.json({ 
    success: true, 
    message: 'Token is valid'
  })
})

// ==================== NEWSLETTER ROUTES ====================

// POST /api/subscribe
app.post('/api/subscribe', async (req, res) => {
  const { email } = req.body
  
  if (!email || !email.includes('@') || !email.includes('.')) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please enter a valid email address' 
    })
  }
  
  try {
    const [existing] = await db.execute('SELECT * FROM subscribers WHERE email = ?', [email])
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already subscribed!' 
      })
    }
    
    await db.execute('INSERT INTO subscribers (email) VALUES (?)', [email])
    
    res.json({ 
      success: true, 
      message: 'Successfully subscribed to newsletter!' 
    })
  } catch (error) {
    console.error('Subscribe error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to subscribe' 
    })
  }
})

// GET /api/subscribers (Protected)
app.get('/api/subscribers', checkToken, async (req, res) => {
  try {
    const [results] = await db.execute('SELECT * FROM subscribers ORDER BY subscribed_at DESC')
    res.json(results)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/subscriber/:id (Protected)
app.delete('/api/subscriber/:id', checkToken, async (req, res) => {
  const { id } = req.params
  
  try {
    await db.execute('DELETE FROM subscribers WHERE id = ?', [id])
    res.json({ 
      success: true, 
      message: 'Subscriber deleted successfully' 
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete' 
    })
  }
})

// ==================== CONTACT ROUTES ====================

// POST /api/contact
app.post('/api/contact', async (req, res) => {
  const { fullName, email, phone, subject, message } = req.body
  
  if (!fullName || !email || !subject || !message) {
    return res.status(400).json({ 
      success: false, 
      message: 'Full name, email, subject, and message are required' 
    })
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please enter a valid email address' 
    })
  }
  
  try {
    await db.execute(
      `INSERT INTO contacts (full_name, email, phone, subject, message) 
       VALUES (?, ?, ?, ?, ?)`,
      [fullName, email, phone || null, subject, message]
    )
    
    res.json({ 
      success: true, 
      message: 'Message sent successfully! We will contact you soon.' 
    })
  } catch (error) {
    console.error('Contact error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send message. Please try again.' 
    })
  }
})

// GET /api/contacts (Protected)
app.get('/api/contacts', checkToken, async (req, res) => {
  try {
    const [results] = await db.execute('SELECT * FROM contacts ORDER BY created_at DESC')
    res.json(results)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/contact/:id (Protected)
app.delete('/api/contact/:id', checkToken, async (req, res) => {
  const { id } = req.params
  
  try {
    await db.execute('DELETE FROM contacts WHERE id = ?', [id])
    res.json({ 
      success: true, 
      message: 'Contact message deleted successfully' 
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete' 
    })
  }
})

// ==================== SCHOLARSHIP INQUIRIES ROUTES ====================

// POST /api/scholarship/inquiry
app.post('/api/scholarship/inquiry', async (req, res) => {
  const { fullName, email, phone, scholarshipTitle, message } = req.body
  
  if (!fullName || !email || !scholarshipTitle || !message) {
    return res.status(400).json({ 
      success: false, 
      message: 'Full name, email, scholarship title, and message are required' 
    })
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please enter a valid email address' 
    })
  }
  
  try {
    const [result] = await db.execute(
      `INSERT INTO scholarship_inquiries (full_name, email, phone, scholarship_title, message) 
       VALUES (?, ?, ?, ?, ?)`,
      [fullName, email, phone || null, scholarshipTitle, message]
    )
    
    res.json({ 
      success: true, 
      message: 'Inquiry submitted successfully! We will contact you within 24 hours.',
      inquiryId: result.insertId
    })
  } catch (error) {
    console.error('Inquiry error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit inquiry. Please try again.' 
    })
  }
})

// GET /api/scholarship/inquiries (Protected)
app.get('/api/scholarship/inquiries', checkToken, async (req, res) => {
  try {
    const [results] = await db.execute('SELECT * FROM scholarship_inquiries ORDER BY created_at DESC')
    res.json(results)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/scholarship/inquiry/:id/status (Protected)
app.put('/api/scholarship/inquiry/:id/status', checkToken, async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  
  if (!['pending', 'contacted', 'completed'].includes(status)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid status. Must be pending, contacted, or completed' 
    })
  }
  
  try {
    const [result] = await db.execute(
      'UPDATE scholarship_inquiries SET status = ? WHERE id = ?',
      [status, id]
    )
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Inquiry not found' 
      })
    }
    
    res.json({ 
      success: true, 
      message: 'Status updated successfully' 
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update status' 
    })
  }
})

// DELETE /api/scholarship/inquiry/:id (Protected)
app.delete('/api/scholarship/inquiry/:id', checkToken, async (req, res) => {
  const { id } = req.params
  
  try {
    await db.execute('DELETE FROM scholarship_inquiries WHERE id = ?', [id])
    res.json({ 
      success: true, 
      message: 'Inquiry deleted successfully' 
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete inquiry' 
    })
  }
})

// ==================== SCHOLARSHIPS MANAGEMENT ROUTES ====================

// GET /api/scholarships (Public)
app.get('/api/scholarships', async (req, res) => {
  const { featured, status } = req.query
  
  let query = 'SELECT * FROM scholarships'
  const conditions = []
  const params = []
  
  if (featured === 'true') {
    conditions.push('featured = ?')
    params.push(true)
  }
  
  if (status) {
    conditions.push('status = ?')
    params.push(status)
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }
  
  query += ' ORDER BY featured DESC, created_at DESC'
  
  try {
    const [results] = await db.execute(query, params)
    res.json(results)
  } catch (error) {
    console.error('Error fetching scholarships:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/scholarships/:id (Public)
app.get('/api/scholarships/:id', async (req, res) => {
  const { id } = req.params
  
  try {
    const [results] = await db.execute('SELECT * FROM scholarships WHERE id = ?', [id])
    
    if (results.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Scholarship not found' 
      })
    }
    res.json(results[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/admin/scholarships (Protected)
app.post('/api/admin/scholarships', checkToken, async (req, res) => {
  const { title, country, degree, description, eligibility, benefits, deadline, link, image_url, status, featured } = req.body
  
  if (!title || !country || !degree || !description) {
    return res.status(400).json({ 
      success: false, 
      message: 'Title, country, degree, and description are required' 
    })
  }
  
  try {
    const [result] = await db.execute(
      `INSERT INTO scholarships 
       (title, country, degree, description, eligibility, benefits, deadline, link, image_url, status, featured) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, country, degree, description, eligibility || null, benefits || null, deadline || null, 
       link || null, image_url || null, status || 'active', featured || false]
    )
    
    res.json({ 
      success: true, 
      message: 'Scholarship created successfully',
      id: result.insertId
    })
  } catch (error) {
    console.error('Create error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create scholarship' 
    })
  }
})

// PUT /api/admin/scholarships/:id (Protected)
app.put('/api/admin/scholarships/:id', checkToken, async (req, res) => {
  const { id } = req.params
  const { title, country, degree, description, eligibility, benefits, deadline, link, image_url, status, featured } = req.body
  
  try {
    const [result] = await db.execute(
      `UPDATE scholarships 
       SET title = ?, country = ?, degree = ?, description = ?, 
           eligibility = ?, benefits = ?, deadline = ?, link = ?, 
           image_url = ?, status = ?, featured = ?
       WHERE id = ?`,
      [title, country, degree, description, eligibility || null, benefits || null, 
       deadline || null, link || null, image_url || null, status || 'active', featured || false, id]
    )
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Scholarship not found' 
      })
    }
    
    res.json({ 
      success: true, 
      message: 'Scholarship updated successfully' 
    })
  } catch (error) {
    console.error('Update error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update scholarship' 
    })
  }
})

// DELETE /api/admin/scholarships/:id (Protected)
app.delete('/api/admin/scholarships/:id', checkToken, async (req, res) => {
  const { id } = req.params
  
  try {
    const [result] = await db.execute('DELETE FROM scholarships WHERE id = ?', [id])
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Scholarship not found' 
      })
    }
    
    res.json({ 
      success: true, 
      message: 'Scholarship deleted successfully' 
    })
  } catch (error) {
    console.error('Delete error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete scholarship' 
    })
  }
})

// PATCH /api/admin/scholarships/:id/feature (Protected)
app.patch('/api/admin/scholarships/:id/feature', checkToken, async (req, res) => {
  const { id } = req.params
  const { featured } = req.body
  
  try {
    const [result] = await db.execute('UPDATE scholarships SET featured = ? WHERE id = ?', [featured, id])
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Scholarship not found' 
      })
    }
    
    res.json({ 
      success: true, 
      message: `Scholarship ${featured ? 'featured' : 'unfeatured'} successfully` 
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update featured status' 
    })
  }
})

// GET /api/scholarship/admin/stats (Protected)
app.get('/api/scholarship/admin/stats', checkToken, async (req, res) => {
  try {
    const [subscribers] = await db.execute('SELECT COUNT(*) as count FROM subscribers')
    const [contacts] = await db.execute('SELECT COUNT(*) as count FROM contacts')
    const [inquiries] = await db.execute('SELECT COUNT(*) as count FROM scholarship_inquiries')
    const [scholarships] = await db.execute('SELECT COUNT(*) as count FROM scholarships')
    const [featured] = await db.execute('SELECT COUNT(*) as count FROM scholarships WHERE featured = true')
    const [active] = await db.execute('SELECT COUNT(*) as count FROM scholarships WHERE status = "active"')
    
    res.json({
      total_subscribers: subscribers[0].count,
      total_contacts: contacts[0].count,
      total_inquiries: inquiries[0].count,
      total_scholarships: scholarships[0].count,
      featured_scholarships: featured[0].count,
      active_scholarships: active[0].count
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ==================== HOME ROUTE ====================
app.get('/', (req, res) => {
  res.json({
    message: 'GoAbroad Admissions API',
    version: '5.0.0',
    status: 'running',
    frontend: 'https://goabroadadmissions.vercel.app',
    endpoints: {
      public: {
        subscribe: 'POST /api/subscribe',
        contact: 'POST /api/contact',
        scholarshipInquiry: 'POST /api/scholarship/inquiry',
        scholarships: 'GET /api/scholarships',
        scholarshipById: 'GET /api/scholarships/:id'
      },
      protected: {
        login: 'POST /api/admin/login',
        verify: 'GET /api/admin/verify',
        subscribers: 'GET /api/subscribers',
        contacts: 'GET /api/contacts',
        inquiries: 'GET /api/scholarship/inquiries',
        createScholarship: 'POST /api/admin/scholarships',
        updateScholarship: 'PUT /api/admin/scholarships/:id',
        deleteScholarship: 'DELETE /api/admin/scholarships/:id',
        adminStats: 'GET /api/scholarship/admin/stats'
      }
    },
    admin_credentials: {
      username: 'admin',
      password: 'admin123'
    }
  })
})

// ==================== 404 HANDLER ====================
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  })
})

// ==================== EXPORT FOR VERCEL ====================
module.exports = app