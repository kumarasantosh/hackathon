import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// Also try loading from .env if .env.local doesn't exist
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  config({ path: resolve(process.cwd(), '.env') })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables!')
  console.error('Please make sure you have:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  console.error('in your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function seed() {
  console.log('Starting seed...')

  // Get or create subjects
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')

  if (!subjects || subjects.length === 0) {
    console.log('Creating subjects...')
    const { error: subjectError } = await supabase
      .from('subjects')
      .insert([
        { name: 'Data Structures and Algorithms', code: 'CS301', description: 'Core computer science course' },
        { name: 'Database Management Systems', code: 'CS302', description: 'Introduction to database systems' },
        { name: 'Operating Systems', code: 'CS303', description: 'Fundamentals of operating systems' },
        { name: 'Computer Networks', code: 'CS304', description: 'Network protocols and architectures' },
        { name: 'Machine Learning', code: 'CS401', description: 'Introduction to ML algorithms' },
        { name: 'Software Engineering', code: 'CS305', description: 'Software development lifecycle' },
      ])

    if (subjectError) {
      console.error('Error creating subjects:', subjectError)
      return
    }
  }

  // Note: Users are created via Clerk, so we'll use mock Clerk IDs
  // In production, you would sync Clerk users to the database
  const mockClerkIds = [
    'user_2mock1',
    'user_2mock2',
    'user_2mock3',
    'user_2mock4',
    'user_2mock5',
    'user_2mock6',
    'user_2mock7',
    'user_2mock8',
    'user_2mock9',
    'user_2mock10',
    'user_2mock11',
    'user_2mock12',
    'user_2mock13',
    'user_2mock14',
    'user_2mock15',
  ]

  // Create mock users (toppers and students)
  console.log('Creating mock users...')
  const { data: existingUsers } = await supabase
    .from('users')
    .select('clerk_id')

  const existingClerkIds = new Set(existingUsers?.map(u => u.clerk_id) || [])

  const usersToCreate = [
    // Toppers
    {
      clerk_id: mockClerkIds[0],
      email: 'topper1@example.com',
      full_name: 'Rajesh Kumar',
      role: 'topper',
      is_verified: true,
      cgpa: 9.5,
      bio: 'Top performer in Computer Science with expertise in Data Structures and Algorithms. Always happy to help!',
    },
    {
      clerk_id: mockClerkIds[1],
      email: 'topper2@example.com',
      full_name: 'Priya Sharma',
      role: 'topper',
      is_verified: true,
      cgpa: 9.3,
      bio: 'Expert in Database Systems and Software Engineering. 3+ years of tutoring experience.',
    },
    {
      clerk_id: mockClerkIds[2],
      email: 'topper3@example.com',
      full_name: 'Amit Patel',
      role: 'topper',
      is_verified: true,
      cgpa: 9.7,
      bio: 'Machine Learning enthusiast with strong background in Algorithms. Research assistant in AI lab.',
    },
    {
      clerk_id: mockClerkIds[3],
      email: 'topper4@example.com',
      full_name: 'Ananya Desai',
      role: 'topper',
      is_verified: true,
      cgpa: 9.4,
      bio: 'Specialized in Operating Systems and Computer Networks. Currently working at a top tech company.',
    },
    {
      clerk_id: mockClerkIds[4],
      email: 'topper5@example.com',
      full_name: 'Rohit Verma',
      role: 'topper',
      is_verified: true,
      cgpa: 9.6,
      bio: 'Full-stack developer with expertise in Software Engineering. Passionate about teaching.',
    },
    // Students
    {
      clerk_id: mockClerkIds[5],
      email: 'student1@example.com',
      full_name: 'Sneha Reddy',
      role: 'student',
      is_verified: false,
      cgpa: null,
    },
    {
      clerk_id: mockClerkIds[6],
      email: 'student2@example.com',
      full_name: 'Vikram Singh',
      role: 'student',
      is_verified: false,
      cgpa: null,
    },
    {
      clerk_id: mockClerkIds[7],
      email: 'student3@example.com',
      full_name: 'Arjun Mehta',
      role: 'student',
      is_verified: false,
      cgpa: null,
    },
    {
      clerk_id: mockClerkIds[8],
      email: 'student4@example.com',
      full_name: 'Kavya Nair',
      role: 'student',
      is_verified: false,
      cgpa: null,
    },
    {
      clerk_id: mockClerkIds[9],
      email: 'student5@example.com',
      full_name: 'Aditya Rao',
      role: 'student',
      is_verified: false,
      cgpa: null,
    },
    {
      clerk_id: mockClerkIds[10],
      email: 'student6@example.com',
      full_name: 'Divya Iyer',
      role: 'student',
      is_verified: false,
      cgpa: null,
    },
    {
      clerk_id: mockClerkIds[11],
      email: 'student7@example.com',
      full_name: 'Rahul Joshi',
      role: 'student',
      is_verified: false,
      cgpa: null,
    },
    {
      clerk_id: mockClerkIds[12],
      email: 'student8@example.com',
      full_name: 'Meera Krishnan',
      role: 'student',
      is_verified: false,
      cgpa: null,
    },
    {
      clerk_id: mockClerkIds[13],
      email: 'student9@example.com',
      full_name: 'Varun Malhotra',
      role: 'student',
      is_verified: false,
      cgpa: null,
    },
    {
      clerk_id: mockClerkIds[14],
      email: 'admin@example.com',
      full_name: 'Admin User',
      role: 'admin',
      is_verified: true,
      cgpa: null,
    },
  ]

  for (const user of usersToCreate) {
    if (!existingClerkIds.has(user.clerk_id)) {
      const { error: userError } = await supabase
        .from('users')
        .insert(user)

      if (userError) {
        console.error(`Error creating user ${user.clerk_id}:`, userError)
      } else {
        console.log(`Created user: ${user.full_name}`)
      }
    }
  }

  // Refresh users and subjects after creation
  const { data: dbUsers } = await supabase
    .from('users')
    .select('id, clerk_id, role, is_verified, full_name')

  const { data: dbSubjects } = await supabase
    .from('subjects')
    .select('id, name')

  if (!dbUsers || dbUsers.length === 0 || !dbSubjects || dbSubjects.length === 0) {
    console.log('No users or subjects found. Skipping resource creation.')
    return
  }

  const toppers = dbUsers.filter(u => u.role === 'topper' && u.is_verified)
  const students = dbUsers.filter(u => u.role === 'student')

  // Create resources
  console.log('Creating resources...')
  const resources = [
    {
      topper_id: toppers[0]?.id,
      title: 'Complete DSA Notes - Sem 3',
      description: 'Comprehensive notes covering all topics in Data Structures and Algorithms including arrays, linked lists, trees, graphs, and sorting algorithms.',
      subject_id: dbSubjects.find(s => s.name.includes('Data Structures'))?.id,
      semester: 3,
      file_url: 'https://example.com/resources/dsa-notes.pdf',
      file_type: 'application/pdf',
      file_size: 2048000,
      tags: ['notes', 'dsa', 'algorithms', 'semester-3'],
      price: 50,
      download_count: 45,
      rating: 4.5,
      rating_count: 12,
    },
    {
      topper_id: toppers[0]?.id,
      title: 'Solved Question Bank - DSA',
      description: 'Collection of solved questions from previous semester exams with detailed solutions.',
      subject_id: dbSubjects.find(s => s.name.includes('Data Structures'))?.id,
      semester: 3,
      file_url: 'https://example.com/resources/dsa-questions.pdf',
      file_type: 'application/pdf',
      file_size: 1536000,
      tags: ['solved-questions', 'exam-preparation', 'dsa'],
      price: 75,
      download_count: 32,
      rating: 4.8,
      rating_count: 8,
    },
    {
      topper_id: toppers[1]?.id,
      title: 'DBMS Complete Guide',
      description: 'Detailed notes on Database Management Systems covering SQL, normalization, transactions, and concurrency control.',
      subject_id: dbSubjects.find(s => s.name.includes('Database'))?.id,
      semester: 4,
      file_url: 'https://example.com/resources/dbms-guide.pdf',
      file_type: 'application/pdf',
      file_size: 3072000,
      tags: ['notes', 'dbms', 'sql', 'database'],
      price: 60,
      download_count: 28,
      rating: 4.6,
      rating_count: 10,
    },
    {
      topper_id: toppers[1]?.id,
      title: 'Software Engineering Project Templates',
      description: 'Templates and guidelines for software engineering projects including requirements, design, and testing.',
      subject_id: dbSubjects.find(s => s.name.includes('Software'))?.id,
      semester: 5,
      file_url: 'https://example.com/resources/se-templates.pdf',
      file_type: 'application/pdf',
      file_size: 1024000,
      tags: ['templates', 'software-engineering', 'projects'],
      price: 40,
      download_count: 15,
      rating: 4.3,
      rating_count: 5,
    },
    {
      topper_id: toppers[2]?.id,
      title: 'Machine Learning Fundamentals',
      description: 'Introduction to machine learning concepts, algorithms, and implementations.',
      subject_id: dbSubjects.find(s => s.name.includes('Machine Learning'))?.id,
      semester: 6,
      file_url: 'https://example.com/resources/ml-fundamentals.pdf',
      file_type: 'application/pdf',
      file_size: 4096000,
      tags: ['machine-learning', 'ai', 'algorithms'],
      price: 80,
      download_count: 22,
      rating: 4.9,
      rating_count: 7,
    },
    {
      topper_id: toppers[3]?.id,
      title: 'Operating Systems Quick Reference',
      description: 'Quick reference guide for operating systems concepts including process management, memory management, and file systems.',
      subject_id: dbSubjects.find(s => s.name.includes('Operating'))?.id,
      semester: 4,
      file_url: 'https://example.com/resources/os-reference.pdf',
      file_type: 'application/pdf',
      file_size: 1280000,
      tags: ['reference', 'operating-systems', 'quick-guide'],
      price: 0,
      download_count: 67,
      rating: 4.4,
      rating_count: 15,
    },
    {
      topper_id: toppers[0]?.id,
      title: 'Network Protocols Summary',
      description: 'Summary of important network protocols including TCP/IP, HTTP, and DNS.',
      subject_id: dbSubjects.find(s => s.name.includes('Network'))?.id,
      semester: 5,
      file_url: 'https://example.com/resources/network-protocols.pdf',
      file_type: 'application/pdf',
      file_size: 896000,
      tags: ['networks', 'protocols', 'summary'],
      price: 35,
      download_count: 19,
      rating: 4.2,
      rating_count: 6,
    },
    {
      topper_id: toppers[1]?.id,
      title: 'SQL Query Practice Set',
      description: 'Collection of SQL queries with solutions for practice and exam preparation.',
      subject_id: dbSubjects.find(s => s.name.includes('Database'))?.id,
      semester: 4,
      file_url: 'https://example.com/resources/sql-practice.pdf',
      file_type: 'application/pdf',
      file_size: 768000,
      tags: ['sql', 'practice', 'database'],
      price: 45,
      download_count: 31,
      rating: 4.7,
      rating_count: 9,
    },
    {
      topper_id: toppers[2]?.id,
      title: 'Algorithm Complexity Analysis',
      description: 'Guide to analyzing time and space complexity of algorithms with examples.',
      subject_id: dbSubjects.find(s => s.name.includes('Data Structures'))?.id,
      semester: 3,
      file_url: 'https://example.com/resources/complexity-analysis.pdf',
      file_type: 'application/pdf',
      file_size: 1152000,
      tags: ['algorithms', 'complexity', 'analysis'],
      price: 55,
      download_count: 26,
      rating: 4.6,
      rating_count: 11,
    },
    {
      topper_id: toppers[0]?.id,
      title: 'DSA Interview Preparation',
      description: 'Comprehensive guide for data structures and algorithms interview preparation.',
      subject_id: dbSubjects.find(s => s.name.includes('Data Structures'))?.id,
      semester: null,
      file_url: 'https://example.com/resources/dsa-interview.pdf',
      file_type: 'application/pdf',
      file_size: 2560000,
      tags: ['interview', 'dsa', 'preparation'],
      price: 100,
      download_count: 38,
      rating: 4.9,
      rating_count: 14,
    },
    {
      topper_id: toppers[3]?.id,
      title: 'OS Process Scheduling Algorithms',
      description: 'Detailed explanation of various process scheduling algorithms in operating systems.',
      subject_id: dbSubjects.find(s => s.name.includes('Operating'))?.id,
      semester: 4,
      file_url: 'https://example.com/resources/os-scheduling.pdf',
      file_type: 'application/pdf',
      file_size: 1536000,
      tags: ['operating-systems', 'scheduling', 'algorithms'],
      price: 65,
      download_count: 24,
      rating: 4.5,
      rating_count: 8,
    },
    {
      topper_id: toppers[4]?.id,
      title: 'Software Design Patterns',
      description: 'Common software design patterns with examples and use cases.',
      subject_id: dbSubjects.find(s => s.name.includes('Software'))?.id,
      semester: 5,
      file_url: 'https://example.com/resources/design-patterns.pdf',
      file_type: 'application/pdf',
      file_size: 2048000,
      tags: ['design-patterns', 'software-engineering', 'oop'],
      price: 70,
      download_count: 30,
      rating: 4.8,
      rating_count: 12,
    },
    {
      topper_id: toppers[2]?.id,
      title: 'Neural Networks Deep Dive',
      description: 'Advanced concepts in neural networks and deep learning.',
      subject_id: dbSubjects.find(s => s.name.includes('Machine Learning'))?.id,
      semester: 6,
      file_url: 'https://example.com/resources/neural-networks.pdf',
      file_type: 'application/pdf',
      file_size: 5120000,
      tags: ['machine-learning', 'neural-networks', 'deep-learning'],
      price: 90,
      download_count: 18,
      rating: 4.7,
      rating_count: 6,
    },
    {
      topper_id: toppers[4]?.id,
      title: 'Git and Version Control Guide',
      description: 'Complete guide to Git and version control systems for software development.',
      subject_id: dbSubjects.find(s => s.name.includes('Software'))?.id,
      semester: 3,
      file_url: 'https://example.com/resources/git-guide.pdf',
      file_type: 'application/pdf',
      file_size: 1024000,
      tags: ['git', 'version-control', 'tools'],
      price: 0,
      download_count: 52,
      rating: 4.6,
      rating_count: 18,
    },
    {
      topper_id: toppers[0]?.id,
      title: 'Graph Algorithms Explained',
      description: 'Detailed explanation of graph algorithms including BFS, DFS, Dijkstra, and more.',
      subject_id: dbSubjects.find(s => s.name.includes('Data Structures'))?.id,
      semester: 4,
      file_url: 'https://example.com/resources/graph-algorithms.pdf',
      file_type: 'application/pdf',
      file_size: 2304000,
      tags: ['graphs', 'algorithms', 'dsa'],
      price: 85,
      download_count: 29,
      rating: 4.9,
      rating_count: 10,
    },
  ]

  const createdResources: any[] = []
  for (const resource of resources) {
    if (!resource.topper_id) continue
    const { data: createdResource, error: resourceError } = await supabase
      .from('resources')
      .insert(resource)
      .select()
      .single()

    if (resourceError) {
      console.error('Error creating resource:', resourceError)
    } else {
      console.log(`Created resource: ${resource.title}`)
      if (createdResource) createdResources.push(createdResource)
    }
  }

  // Create bookings
  console.log('Creating bookings...')
  if (students.length > 0 && toppers.length > 0 && createdResources.length > 0) {
    const now = new Date()
    const bookings = [
      {
        student_id: students[0]?.id,
        topper_id: toppers[0]?.id,
        resource_id: createdResources[0]?.id,
        session_type: 'tutoring',
        duration_minutes: 60,
        scheduled_at: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        status: 'confirmed',
        price: 100,
        payment_status: 'paid',
        payment_id: 'mock_payment_1',
        meeting_link: 'https://meet.example.com/session1',
      },
      {
        student_id: students[1]?.id,
        topper_id: toppers[1]?.id,
        resource_id: createdResources[2]?.id,
        session_type: 'tutoring',
        duration_minutes: 45,
        scheduled_at: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        status: 'confirmed',
        price: 75,
        payment_status: 'paid',
        payment_id: 'mock_payment_2',
        meeting_link: 'https://meet.example.com/session2',
      },
      {
        student_id: students[2]?.id,
        topper_id: toppers[0]?.id,
        session_type: 'consultation',
        duration_minutes: 30,
        scheduled_at: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        status: 'pending',
        price: 50,
        payment_status: 'pending',
      },
      {
        student_id: students[0]?.id,
        topper_id: toppers[2]?.id,
        resource_id: createdResources[4]?.id,
        session_type: 'tutoring',
        duration_minutes: 60,
        scheduled_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        status: 'completed',
        price: 100,
        payment_status: 'paid',
        payment_id: 'mock_payment_3',
        meeting_link: 'https://meet.example.com/session3',
      },
      {
        student_id: students[3]?.id,
        topper_id: toppers[1]?.id,
        resource_id: createdResources[3]?.id,
        session_type: 'tutoring',
        duration_minutes: 45,
        scheduled_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        status: 'completed',
        price: 75,
        payment_status: 'paid',
        payment_id: 'mock_payment_4',
      },
      {
        student_id: students[4]?.id,
        topper_id: toppers[3]?.id,
        session_type: 'tutoring',
        duration_minutes: 60,
        scheduled_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        status: 'pending',
        price: 100,
        payment_status: 'pending',
      },
    ]

    for (const booking of bookings) {
      if (!booking.student_id || !booking.topper_id) continue
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert(booking)

      if (bookingError) {
        console.error('Error creating booking:', bookingError)
      } else {
        console.log(`Created booking for student ${booking.student_id}`)
      }
    }
  }

  // Create resource transactions (downloads)
  console.log('Creating resource transactions...')
  if (students.length > 0 && createdResources.length > 0) {
    const transactions = [
      {
        student_id: students[0]?.id,
        resource_id: createdResources[0]?.id,
        amount: createdResources[0]?.price || 0,
        payment_status: 'paid' as const,
        payment_id: 'mock_txn_1',
      },
      {
        student_id: students[0]?.id,
        resource_id: createdResources[5]?.id, // Free resource
        amount: 0,
        payment_status: 'paid' as const,
        payment_id: 'mock_txn_2',
      },
      {
        student_id: students[1]?.id,
        resource_id: createdResources[2]?.id,
        amount: createdResources[2]?.price || 0,
        payment_status: 'paid' as const,
        payment_id: 'mock_txn_3',
      },
      {
        student_id: students[2]?.id,
        resource_id: createdResources[1]?.id,
        amount: createdResources[1]?.price || 0,
        payment_status: 'paid' as const,
        payment_id: 'mock_txn_4',
      },
      {
        student_id: students[3]?.id,
        resource_id: createdResources[5]?.id, // Free resource
        amount: 0,
        payment_status: 'paid' as const,
        payment_id: 'mock_txn_5',
      },
      {
        student_id: students[4]?.id,
        resource_id: createdResources[13]?.id, // Free resource
        amount: 0,
        payment_status: 'paid' as const,
        payment_id: 'mock_txn_6',
      },
    ]

    for (const transaction of transactions) {
      if (!transaction.student_id || !transaction.resource_id) continue
      const { error: transactionError } = await supabase
        .from('resource_transactions')
        .insert(transaction)

      if (transactionError) {
        console.error('Error creating transaction:', transactionError)
      } else {
        console.log(`Created transaction for resource ${transaction.resource_id}`)
      }
    }
  }

  // Create reviews
  console.log('Creating reviews...')
  if (students.length > 0 && createdResources.length > 0 && toppers.length > 0) {
    const reviews = [
      {
        resource_id: createdResources[0]?.id,
        reviewer_id: students[0]?.id,
        reviewee_id: toppers[0]?.id,
        rating: 5,
        comment: 'Excellent notes! Very comprehensive and well-organized.',
      },
      {
        resource_id: createdResources[0]?.id,
        reviewer_id: students[1]?.id,
        reviewee_id: toppers[0]?.id,
        rating: 4,
        comment: 'Great resource, helped me a lot in my exams.',
      },
      {
        resource_id: createdResources[2]?.id,
        reviewer_id: students[1]?.id,
        reviewee_id: toppers[1]?.id,
        rating: 5,
        comment: 'Best DBMS guide I have found. Highly recommended!',
      },
      {
        resource_id: createdResources[4]?.id,
        reviewer_id: students[0]?.id,
        reviewee_id: toppers[2]?.id,
        rating: 5,
        comment: 'Perfect for understanding ML fundamentals.',
      },
      {
        resource_id: createdResources[5]?.id,
        reviewer_id: students[2]?.id,
        reviewee_id: toppers[3]?.id,
        rating: 4,
        comment: 'Good reference guide, very helpful.',
      },
    ]

    for (const review of reviews) {
      if (!review.reviewer_id || !review.reviewee_id || !review.resource_id) continue
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert(review)

      if (reviewError) {
        console.error('Error creating review:', reviewError)
      } else {
        console.log(`Created review for resource ${review.resource_id}`)
      }
    }
  }

  // Create study groups
  console.log('Creating study groups...')
  if (students.length > 0 && dbSubjects.length > 0) {
    const studyGroups = [
      {
        name: 'DSA Study Group - Sem 3',
        description: 'Study group for Data Structures and Algorithms. We meet twice a week to solve problems together.',
        subject_id: dbSubjects.find(s => s.name.includes('Data Structures'))?.id,
        topic: 'Trees and Graphs',
        max_members: 8,
        meeting_type: 'virtual' as const,
        meeting_location: null,
        preferred_time_slots: ['Evening', 'Weekend'],
        created_by: students[0]?.id,
        is_active: true,
      },
      {
        name: 'DBMS Study Circle',
        description: 'Database Management Systems study group focusing on SQL and normalization.',
        subject_id: dbSubjects.find(s => s.name.includes('Database'))?.id,
        topic: 'SQL Queries',
        max_members: 6,
        meeting_type: 'both' as const,
        meeting_location: 'Library Room 205',
        preferred_time_slots: ['Morning', 'Afternoon'],
        created_by: students[1]?.id,
        is_active: true,
      },
      {
        name: 'ML Enthusiasts',
        description: 'Machine Learning study group for beginners and advanced learners.',
        subject_id: dbSubjects.find(s => s.name.includes('Machine Learning'))?.id,
        topic: 'Neural Networks',
        max_members: 10,
        meeting_type: 'virtual' as const,
        meeting_location: null,
        preferred_time_slots: ['Evening', 'Weekend'],
        created_by: students[2]?.id,
        is_active: true,
      },
    ]

    const createdGroups: any[] = []
    for (const group of studyGroups) {
      if (!group.created_by) continue
      const { data: createdGroup, error: groupError } = await supabase
        .from('study_groups')
        .insert(group)
        .select()
        .single()

      if (groupError) {
        console.error('Error creating study group:', groupError)
      } else {
        console.log(`Created study group: ${group.name}`)
        if (createdGroup) createdGroups.push(createdGroup)
      }
    }

    // Add members to study groups
    console.log('Adding members to study groups...')
    if (createdGroups.length > 0 && students.length > 0) {
      const memberships = [
        { group_id: createdGroups[0]?.id, user_id: students[0]?.id, role: 'leader' as const },
        { group_id: createdGroups[0]?.id, user_id: students[1]?.id, role: 'member' as const },
        { group_id: createdGroups[0]?.id, user_id: students[2]?.id, role: 'member' as const },
        { group_id: createdGroups[1]?.id, user_id: students[1]?.id, role: 'leader' as const },
        { group_id: createdGroups[1]?.id, user_id: students[3]?.id, role: 'member' as const },
        { group_id: createdGroups[1]?.id, user_id: students[4]?.id, role: 'member' as const },
        { group_id: createdGroups[2]?.id, user_id: students[2]?.id, role: 'leader' as const },
        { group_id: createdGroups[2]?.id, user_id: students[0]?.id, role: 'member' as const },
        { group_id: createdGroups[2]?.id, user_id: students[5]?.id, role: 'member' as const },
      ]

      for (const membership of memberships) {
        if (!membership.group_id || !membership.user_id) continue
        const { error: membershipError } = await supabase
          .from('study_group_members')
          .insert(membership)

        if (membershipError) {
          console.error('Error adding member:', membershipError)
        } else {
          console.log(`Added member to group ${membership.group_id}`)
        }
      }
    }
  }

  // Create question bank entries
  console.log('Creating question bank entries...')
  if (createdResources.length > 0 && dbSubjects.length > 0) {
    // Note: In production, you would generate actual hashes
    const questions = [
      {
        resource_id: createdResources[0]?.id,
        question_text: 'Explain the time complexity of binary search algorithm.',
        question_hash: 'hash1_binary_search_complexity',
        answer_text: 'Binary search has O(log n) time complexity as it divides the search space in half at each step.',
        subject_id: dbSubjects.find(s => s.name.includes('Data Structures'))?.id,
        semester: 3,
        topic: 'Searching Algorithms',
        exam_type: 'Mid-term',
        year: 2023,
        difficulty: 'medium' as const,
      },
      {
        resource_id: createdResources[0]?.id,
        question_text: 'What is the difference between BFS and DFS?',
        question_hash: 'hash2_bfs_dfs_difference',
        answer_text: 'BFS uses queue and explores level by level, while DFS uses stack and explores as deep as possible.',
        subject_id: dbSubjects.find(s => s.name.includes('Data Structures'))?.id,
        semester: 3,
        topic: 'Graph Algorithms',
        exam_type: 'Final',
        year: 2023,
        difficulty: 'medium' as const,
      },
      {
        resource_id: createdResources[2]?.id,
        question_text: 'Explain the concept of database normalization.',
        question_hash: 'hash3_normalization',
        answer_text: 'Normalization is the process of organizing data to minimize redundancy and dependency.',
        subject_id: dbSubjects.find(s => s.name.includes('Database'))?.id,
        semester: 4,
        topic: 'Database Design',
        exam_type: 'Mid-term',
        year: 2023,
        difficulty: 'easy' as const,
      },
    ]

    for (const question of questions) {
      if (!question.resource_id || !question.subject_id) continue
      const { error: questionError } = await supabase
        .from('question_bank')
        .insert(question)

      if (questionError) {
        console.error('Error creating question:', questionError)
      } else {
        console.log(`Created question: ${question.question_text.substring(0, 50)}...`)
      }
    }
  }

  console.log('Seed completed!')
  console.log(`Created ${toppers.length} toppers, ${students.length} students`)
  console.log(`Created ${createdResources.length} resources`)
  console.log('Created bookings, transactions, reviews, study groups, and questions')
}

seed().catch(console.error)

