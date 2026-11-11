import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a base64 or File image directly to the Supabase 'cricket-media' storage bucket.
 * Returns the permanent public CDN URL.
 */
export async function uploadCricketMedia(
  fileOrBase64: string | File,
  folder: "players" | "tournaments" = "players",
): Promise<string> {
  try {
    let fileToUpload: Blob;
    let fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;

    if (typeof fileOrBase64 === "string") {
      // Convert base64 dataURL to Blob
      const res = await fetch(fileOrBase64);
      fileToUpload = await res.blob();
    } else {
      fileToUpload = fileOrBase64;
      const ext = fileOrBase64.name.split(".").pop() || "png";
      fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    }

    const { data, error } = await supabase.storage
      .from("cricket-media")
      .upload(fileName, fileToUpload, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Storage upload error:", error);
      throw error;
    }

    const { data: publicData } = supabase.storage
      .from("cricket-media")
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  } catch (err) {
    console.error("Failed to upload image to Supabase:", err);
    throw err;
  }
}

//Log in (user: admin, pass: vihana11@2026
