export const IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/deglio1ni";
export const IMAGEKIT_PUBLIC_KEY = "public_7cIQfpYvqi4X6yx3g4c+6BnOZOA=";

export interface ImageKitUploadResponse {
  success: boolean;
  url: string;
  fileId: string;
  name: string;
  fileType: string;
  thumbnailUrl: string;
  size?: number;
}

/**
 * Uploads a file (Image, PDF, Document, CV, Proof) to ImageKit via server proxy endpoint
 * @param file The browser File object selected by user
 * @param folder Destination directory in ImageKit (e.g. '/proofs', '/resumes', '/chat_attachments')
 */
export async function uploadToImageKit(
  file: File, 
  folder: string = "/uploads"
): Promise<ImageKitUploadResponse> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided for upload"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file contents"));
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            file: base64Data,
            fileName: file.name,
            folder: folder
          })
        });

        const data = await response.json();
        if (!response.ok || !data.url) {
          throw new Error(data.error || "Failed to upload file to ImageKit");
        }

        resolve({
          success: true,
          url: data.url,
          fileId: data.fileId || "",
          name: data.name || file.name,
          fileType: data.fileType || (file.type.startsWith("image/") ? "image" : "non-image"),
          thumbnailUrl: data.thumbnailUrl || data.url,
          size: data.size || file.size
        });
      } catch (err: any) {
        reject(err);
      }
    };
    reader.readAsDataURL(file);
  });
}
