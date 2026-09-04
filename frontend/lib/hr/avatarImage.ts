const MAX_AVATAR_INPUT_BYTES = 2 * 1024 * 1024;
const OUTPUT_SIZE = 512;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function decodedDataUrlBytes(dataUrl: string) {
  const encoded = dataUrl.split(",", 2)[1] || "";
  return Math.floor((encoded.length * 3) / 4);
}

export async function prepareEmployeeAvatar(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Fotoğraf JPG, PNG veya WebP formatında olmalı.");
  }
  if (file.size > MAX_AVATAR_INPUT_BYTES) {
    throw new Error("Fotoğraf en fazla 2 MB olabilir.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Fotoğraf okunamadı."));
      element.src = objectUrl;
    });

    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error("Fotoğraf boyutları okunamadı.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Fotoğraf işlenemedi.");

    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
    const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE,
    );

    let quality = 0.88;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (decodedDataUrlBytes(dataUrl) > MAX_AVATAR_INPUT_BYTES && quality > 0.55) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }
    if (decodedDataUrlBytes(dataUrl) > MAX_AVATAR_INPUT_BYTES) {
      throw new Error("Fotoğraf 2 MB sınırının altına indirilemedi.");
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
