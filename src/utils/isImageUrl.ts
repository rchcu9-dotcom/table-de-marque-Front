const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif)(\?.*)?$/i;

export function isImageUrl(url: string | null | undefined): boolean {
  return !!url && IMAGE_EXTENSIONS.test(url);
}
