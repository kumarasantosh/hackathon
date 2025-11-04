"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Upload, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ images, onChange, maxImages = 5 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed the limit
    const totalFiles = images.length + files.length;
    if (totalFiles > maxImages) {
      alert(`You can only upload up to ${maxImages} images. Please remove some images first.`);
      return;
    }

    // Upload each file
    const fileArray = Array.from(files);
    setUploading(true);

    try {
      const uploadPromises = fileArray.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        setUploadProgress((prev) => ({ ...prev, [file.name]: true }));

        try {
          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Upload failed");
          }

          const data = await response.json();
          setUploadProgress((prev) => ({ ...prev, [file.name]: false }));
          return data.url;
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          setUploadProgress((prev) => ({ ...prev, [file.name]: false }));
          throw error;
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onChange([...images, ...uploadedUrls]);
    } catch (error) {
      alert("Failed to upload one or more images. Please try again.");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
      setUploadProgress({});
      // Reset input
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium mb-2">
        Images {images.length > 0 && `(${images.length}/${maxImages})`}
      </label>
      
      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                <Image
                  src={url}
                  alt={`Upload ${index + 1}`}
                  fill
                  className="object-cover"
                />
                {/* Loading overlay for individual image uploads */}
                {uploadProgress[Object.keys(uploadProgress)[index]] && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeImage(index)}
                disabled={uploading}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Uploading indicator */}
      {uploading && images.length === 0 && (
        <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg bg-blue-50">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
          <span className="text-blue-600 font-medium">Uploading images...</span>
        </div>
      )}

      {/* Upload Button */}
      {images.length < maxImages && (
        <div>
          <input
            type="file"
            id="image-upload"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <label
            htmlFor="image-upload"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full border-2 border-dashed hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {images.length === 0
                  ? "Upload Images"
                  : `Upload More (${maxImages - images.length} remaining)`}
              </>
            )}
          </label>
          <p className="text-xs text-gray-500 mt-2">
            Supported formats: JPEG, PNG, WebP, GIF. Max size: 5MB per image.
          </p>
        </div>
      )}

      {images.length >= maxImages && (
        <p className="text-sm text-amber-600">
          Maximum {maxImages} images reached. Remove an image to upload more.
        </p>
      )}
    </div>
  );
}

