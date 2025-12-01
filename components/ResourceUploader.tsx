'use client'

import { useState } from 'react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

interface ResourceUploaderProps {
  subjects?: Array<{ id: string; name: string }>
}

export function ResourceUploader({ subjects = [] }: ResourceUploaderProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subjectId: '',
    semester: '',
    price: '0',
    tags: '',
    file: null as File | null,
  })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('subjectId', formData.subjectId)
      formDataToSend.append('semester', formData.semester)
      formDataToSend.append('price', formData.price)
      formDataToSend.append('tags', formData.tags)
      if (formData.file) {
        formDataToSend.append('file', formData.file)
      }

      const response = await fetch('/api/resources/upload', {
        method: 'POST',
        body: formDataToSend,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload resource')
      }

      setSuccess(true)
      setFormData({
        title: '',
        description: '',
        subjectId: '',
        semester: '',
        price: '0',
        tags: '',
        file: null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-6">Upload Resource</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
          Resource uploaded successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            rows={4}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <select
              value={formData.subjectId}
              onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">Select Subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Semester</label>
            <input
              type="number"
              value={formData.semester}
              onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              min="1"
              max="8"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Price (₹)</label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="e.g., notes, solved questions, summary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">File *</label>
          <input
            type="file"
            onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
            className="w-full px-4 py-2 border rounded-lg"
            required
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          />
        </div>

        <Button type="submit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload Resource'}
        </Button>
      </form>
    </Card>
  )
}

