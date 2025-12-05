/**
 * Utilitário para compressão de imagens antes do upload
 * Reduz significativamente o tempo de processamento OCR
 */

export interface CompressedImage {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export class ImageCompressor {
  private static readonly MAX_WIDTH = 1920;
  private static readonly MAX_HEIGHT = 1920;
  private static readonly QUALITY = 0.8;
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  /**
   * Comprime uma imagem para otimizar upload e processamento OCR
   */
  static async compressImage(file: File): Promise<CompressedImage> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Arquivo não é uma imagem');
    }

    // Se já estiver dentro dos limites, retorna original
    if (file.size <= this.MAX_FILE_SIZE && await this.isWithinSizeLimits(file)) {
      return {
        file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 1
      };
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const compressedFile = await this.resizeAndCompress(img, file.name, file.type);
            const compressionRatio = file.size / compressedFile.size;
            
            resolve({
              file: compressedFile,
              originalSize: file.size,
              compressedSize: compressedFile.size,
              compressionRatio
            });
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Falha ao carregar imagem'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Verifica se a imagem está dentro dos limites de tamanho
   */
  private static async isWithinSizeLimits(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(img.width <= this.MAX_WIDTH && img.height <= this.MAX_HEIGHT);
      };
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Redimensiona e comprime a imagem
   */
  private static async resizeAndCompress(img: HTMLImageElement, fileName: string, mimeType: string): Promise<File> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Falha ao obter contexto do canvas');
    }

    // Calcular novas dimensões mantendo aspect ratio
    const { width, height } = this.calculateNewDimensions(img.width, img.height);
    
    canvas.width = width;
    canvas.height = height;

    // Desenhar imagem redimensionada
    ctx.drawImage(img, 0, 0, width, height);

    // Converter para blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], fileName, {
              type: mimeType,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Falha na compressão'));
          }
        },
        mimeType,
        this.QUALITY
      );
    });
  }

  /**
   * Calcula novas dimensões mantendo aspect ratio
   */
  private static calculateNewDimensions(originalWidth: number, originalHeight: number): { width: number; height: number } {
    let { width, height } = { width: originalWidth, height: originalHeight };

    // Reduzir se exceder limites
    if (width > this.MAX_WIDTH || height > this.MAX_HEIGHT) {
      const aspectRatio = width / height;
      
      if (width > height) {
        width = this.MAX_WIDTH;
        height = Math.round(width / aspectRatio);
      } else {
        height = this.MAX_HEIGHT;
        width = Math.round(height * aspectRatio);
      }
    }

    return { width, height };
  }

  /**
   * Formata tamanho do arquivo para exibição
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Valida se a imagem é adequada para OCR
   */
  static validateImageForOCR(file: File): { valid: boolean; message?: string } {
    // Verificar tipo
    if (!file.type.startsWith('image/')) {
      return { valid: false, message: 'Arquivo não é uma imagem' };
    }

    // Verificar tamanho (máximo 20MB antes da compressão)
    if (file.size > 20 * 1024 * 1024) {
      return { valid: false, message: 'Imagem muito grande. Máximo 20MB.' };
    }

    // Verificar tipos suportados
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!supportedTypes.includes(file.type)) {
      return { valid: false, message: 'Formato não suportado. Use JPEG, PNG ou WebP.' };
    }

    return { valid: true };
  }
}
