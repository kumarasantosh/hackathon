-- Seed Subjects
INSERT INTO public.subjects (id, name, code, description) VALUES
    (uuid_generate_v4(), 'Data Structures and Algorithms', 'CS301', 'Core computer science course covering data structures and algorithms'),
    (uuid_generate_v4(), 'Database Management Systems', 'CS302', 'Introduction to database systems and SQL'),
    (uuid_generate_v4(), 'Operating Systems', 'CS303', 'Fundamentals of operating systems'),
    (uuid_generate_v4(), 'Computer Networks', 'CS304', 'Network protocols and architectures'),
    (uuid_generate_v4(), 'Machine Learning', 'CS401', 'Introduction to ML algorithms and applications'),
    (uuid_generate_v4(), 'Software Engineering', 'CS305', 'Software development lifecycle and methodologies')
ON CONFLICT (name) DO NOTHING;

-- Note: Run the TypeScript seed script (scripts/seed.ts) to populate users, resources, bookings, study groups, and other data
-- This SQL file only contains subject seed data
-- The TypeScript seed script handles:
-- - 15 users (5 toppers, 9 students, 1 admin)
-- - 15+ resources across different subjects
-- - Bookings with various statuses (pending, confirmed, completed)
-- - Resource transactions (downloads)
-- - Reviews and ratings
-- - Study groups with members
-- - Question bank entries

