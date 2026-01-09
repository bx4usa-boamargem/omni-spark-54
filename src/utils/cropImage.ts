interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_IMAGE_DIMENSION = 2048;
const MAX_FILE_SIZE_MB = 10;

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });
}

export async function compressImage(
  file: File,
  maxDimension: number = MAX_IMAGE_DIMENSION
): Promise<string> {
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new Error(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE_MB}MB`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const img = await createImage(e.target!.result as string);

        if (img.width <= maxDimension && img.height <= maxDimension) {
          resolve(e.target!.result as string);
          return;
        }

        const ratio = Math.min(maxDimension / img.width, maxDimension / img.height);
        const newWidth = Math.round(img.width * ratio);
        const newHeight = Math.round(img.height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function getRotatedImage(
  imageSrc: string,
  rotation: number
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const orientationChanged = rotation === 90 || rotation === 270;
  canvas.width = orientationChanged ? image.height : image.width;
  canvas.height = orientationChanged ? image.width : image.height;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);

  return canvas.toDataURL('image/jpeg');
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  rotation: number = 0,
  outputSize: number = 256
): Promise<Blob> {
  let processedSrc = imageSrc;
  if (rotation !== 0) {
    processedSrc = await getRotatedImage(imageSrc, rotation);
  }

  const image = await createImage(processedSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.width = outputSize;
  canvas.height = outputSize;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas is empty'));
      },
      'image/jpeg',
      0.9
    );
  });
}
