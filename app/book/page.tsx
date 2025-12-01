import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { BookingForm } from '@/components/BookingForm'

export default async function BookSessionPage({
    searchParams,
}: {
    searchParams: { topper?: string }
}) {
    console.log('Rendering BookSessionPage', searchParams)
    const user = await currentUser()

    if (!user) {
        redirect('/sign-in')
    }

    const topperId = searchParams.topper

    if (!topperId) {
        redirect('/dashboard')
    }

    const supabase = await createClient()

    // Fetch topper details
    const { data: topper, error } = await supabase
        .from('users')
        .select('id, full_name, cgpa, bio, is_verified, role')
        .eq('id', topperId)
        .single()

    if (error || !topper || topper.role !== 'topper') {
        console.error('Error fetching topper:', error)
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Topper</h1>
                <p className="text-gray-600">The requested topper could not be found.</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <BookingForm topper={topper} />
        </div>
    )
}

