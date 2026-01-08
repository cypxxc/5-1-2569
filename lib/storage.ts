/**
 * Image Upload Utilities
 * - Cloudinary CDN upload
 * - File validation
 */

/**
 * Upload image to Cloudinary via API
 * @param file - Image file to upload
 * @param preset - Upload preset ('item' | 'avatar')
 * @returns Cloudinary secure URL
 */
export const uploadToCloudinary = async (
  file: File, 
  preset: 'item' | 'avatar' = 'item'
): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('preset', preset)

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'อัปโหลดรูปภาพไม่สำเร็จ')
  }

  const data = await response.json()
  return data.url
}

/**
 * Validate image file before upload
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB max input
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, WebP, GIF)' }
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)' }
  }
  
  return { valid: true }
}
