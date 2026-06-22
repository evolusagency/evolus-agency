/**
 * image.ts
 * Generates a blog cover image via Cloudflare Workers AI (Flux),
 * uploads it to R2, and returns the public URL.
 */

const IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell';

/**
 * Builds a clean, on-brand image prompt from the article context.
 * Keeps it generic/illustrative (no text-in-image — diffusion models
 * render text poorly) and steers toward a consistent visual style.
 */
function buildImagePrompt(title: string, clusterTag: string): string {
  return `Professional editorial illustration for a B2B business blog article about "${title}" (topic: ${clusterTag}). ` +
    `Modern, clean, corporate style. Abstract geometric shapes, soft gradients, blue and dark navy color palette. ` +
    `No text, no letters, no words in the image. Minimalist, high quality, 16:9 composition.`;
}

/**
 * Generates an image via Workers AI, uploads it to R2 under
 * a path namespaced by cluster, and returns the public URL.
 * Returns null on any failure — image generation is an enhancement,
 * not a hard dependency, so the pipeline should never break because of it.
 */
export async function generateAndUploadImage(
  ai:            Ai,
  bucket:        R2Bucket,
  publicBaseUrl: string,
  slug:          string,
  cluster:       string,
  title:         string,
  clusterTag:    string,
): Promise<string | null> {
  try {
    const prompt = buildImagePrompt(title, clusterTag);

    const response = await ai.run(IMAGE_MODEL, {
      prompt,
      steps: 4, // flux-1-schnell is optimized for low step counts
    }) as { image?: string } | ReadableStream;

    // flux-1-schnell returns a base64-encoded image string under `.image`
    let imageBytes: Uint8Array;
    if (response instanceof ReadableStream) {
      const chunks: Uint8Array[] = [];
      const reader = response.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      imageBytes = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        imageBytes.set(chunk, offset);
        offset += chunk.length;
      }
    } else if (response?.image) {
      const binary = atob(response.image);
      imageBytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    } else {
      console.warn('[Image] Unexpected AI response shape, skipping image.');
      return null;
    }

    const key = `${cluster}/${slug}.png`;

    await bucket.put(key, imageBytes, {
      httpMetadata: { contentType: 'image/png' },
    });

    const publicUrl = `${publicBaseUrl.replace(/\/$/, '')}/${key}`;
    console.log(`[Image] Uploaded: ${key}`);
    return publicUrl;

  } catch (err) {
    console.warn(`[Image] Generation/upload failed for "${slug}":`, err);
    return null;
  }
}
