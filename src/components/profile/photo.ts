/** Lado de la foto guardada (px) y calidad JPEG: unos 15–30 KB, nítida hasta 128 px en pantallas 2x. */
const PHOTO_SIZE = 256;
const PHOTO_QUALITY = 0.82;

/** Sólo aceptamos fotos guardadas por PULSO (data URL de imagen), nunca direcciones externas. */
export function profilePhoto(value: string | undefined) {
  return value && value.startsWith("data:image/") ? value : undefined;
}

async function decodeImage(src: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  await image.decode();
  return image;
}

/**
 * Prepara una foto de perfil: recorta al centro en cuadrado, la reduce a 256 px en un canvas
 * y la devuelve como JPEG (data URL) para guardarla en los ajustes del dispositivo.
 */
export async function squarePhoto(file: File): Promise<string> {
  if (file.type && !file.type.startsWith("image/")) throw new Error("Elige un archivo de imagen.");
  const url = URL.createObjectURL(file);
  try {
    let image: HTMLImageElement;
    try {
      image = await decodeImage(url);
    } catch {
      throw new Error("No pudimos abrir esa imagen. Prueba con una foto JPG o PNG.");
    }
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!side) throw new Error("No pudimos abrir esa imagen. Prueba con una foto JPG o PNG.");
    const size = Math.min(PHOTO_SIZE, side);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Tu navegador no permite preparar la foto.");
    // JPEG no admite transparencia: las zonas transparentes quedan en blanco.
    context.fillStyle = "white";
    context.fillRect(0, 0, size, size);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
  } finally {
    URL.revokeObjectURL(url);
  }
}
