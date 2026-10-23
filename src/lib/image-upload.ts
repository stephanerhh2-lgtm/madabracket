export async function processUploadedImage(
  file: File,
  kind: "banner" | "logo"
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Veuillez sélectionner un fichier image valide (PNG, JPG, WebP ou SVG).");
  }

  // Keep clean SVGs directly if small
  if (file.type === "image/svg+xml" && file.size <= 350 * 1024) {
    return await readFileAsDataUrl(file);
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(rawDataUrl);

  const maxWidth = kind === "banner" ? 1600 : 400;
  const maxHeight = kind === "banner" ? 720 : 400;

  let width = img.width;
  let height = img.height;

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return rawDataUrl;
  }

  if (kind === "logo") {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // Preserve alpha channel for logos
    return canvas.toDataURL("image/png");
  } else {
    ctx.fillStyle = "#0A0D14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Impossible de lire le fichier image."));
      }
    };
    reader.onerror = () =>
      reject(new Error("Erreur lors de la lecture du fichier."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Ce format d'image n'a pas pu être chargé."));
    img.src = src;
  });
}
