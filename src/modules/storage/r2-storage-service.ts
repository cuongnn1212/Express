import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain?: string; // e.g. https://pub-xxx.r2.dev or https://media.pandalex.vn
}

export interface UploadResult {
  success: boolean;
  url: string;
  key: string;
  storageProvider: 'CLOUDFLARE_R2' | 'LOCAL_FALLBACK';
  fileSizeBytes: number;
  mimeType: string;
  error?: string;
}

export class R2StorageService {
  private static configFilePath = path.join(process.cwd(), 'data', 'r2_storage_config.json');
  private static localFallbackDir = path.join(process.cwd(), 'uploads', 'inbound_photos');
  private static s3Client: S3Client | null = null;
  private static cachedConfig: R2Config | null = null;

  static {
    if (!fs.existsSync(this.localFallbackDir)) {
      fs.mkdirSync(this.localFallbackDir, { recursive: true });
    }
  }

  /**
   * Lấy cấu hình Cloudflare R2 từ file data hoặc .env
   */
  public static getConfig(): R2Config {
    if (this.cachedConfig) return this.cachedConfig;

    let fileConfig: Partial<R2Config> = {};
    if (fs.existsSync(this.configFilePath)) {
      try {
        fileConfig = JSON.parse(fs.readFileSync(this.configFilePath, 'utf-8'));
      } catch (err) {
        console.warn('[R2Storage] Lỗi đọc file config:', err);
      }
    }

    const config: R2Config = {
      accountId: (process.env.R2_ACCOUNT_ID || fileConfig.accountId || '').trim(),
      accessKeyId: (process.env.R2_ACCESS_KEY_ID || fileConfig.accessKeyId || '').trim(),
      secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || fileConfig.secretAccessKey || '').trim(),
      bucketName: (process.env.R2_BUCKET_NAME || fileConfig.bucketName || 'pandalex-media').trim(),
      publicDomain: (process.env.R2_PUBLIC_DOMAIN || fileConfig.publicDomain || '').trim()
    };

    this.cachedConfig = config;
    return config;
  }

  /**
   * Lưu cấu hình Cloudflare R2
   */
  public static saveConfig(newConfig: Partial<R2Config>): { success: boolean; message: string } {
    try {
      const current = this.getConfig();
      const updated: R2Config = {
        accountId: (newConfig.accountId && !newConfig.accountId.includes('•') ? newConfig.accountId : current.accountId).trim(),
        accessKeyId: (newConfig.accessKeyId && !newConfig.accessKeyId.includes('•') ? newConfig.accessKeyId : current.accessKeyId).trim(),
        secretAccessKey: (newConfig.secretAccessKey && !newConfig.secretAccessKey.includes('•') ? newConfig.secretAccessKey : current.secretAccessKey).trim(),
        bucketName: (newConfig.bucketName && newConfig.bucketName.trim() !== '' ? newConfig.bucketName : current.bucketName).trim(),
        publicDomain: (newConfig.publicDomain !== undefined ? newConfig.publicDomain : current.publicDomain || '').trim()
      };

      fs.writeFileSync(this.configFilePath, JSON.stringify(updated, null, 2), 'utf-8');
      this.cachedConfig = updated;
      this.s3Client = null; // Reset client để khởi tạo lại với key mới

      return { success: true, message: 'Đã lưu cấu hình Cloudflare R2 thành công!' };
    } catch (err: any) {
      return { success: false, message: 'Lỗi lưu cấu hình: ' + err.message };
    }
  }

  /**
   * Khởi tạo S3 Client kết nối tới Cloudflare R2
   */
  private static getClient(): S3Client | null {
    if (this.s3Client) return this.s3Client;

    const cfg = this.getConfig();
    if (!cfg.accountId || !cfg.accessKeyId || !cfg.secretAccessKey) {
      return null;
    }

    try {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: cfg.accessKeyId,
          secretAccessKey: cfg.secretAccessKey
        }
      });
      return this.s3Client;
    } catch (err) {
      console.error('[R2Storage] Khởi tạo S3Client thất bại:', err);
      return null;
    }
  }

  /**
   * Kiểm tra xem Cloudflare R2 đã sẵn sàng hoạt động hay chưa
   */
  public static isConfigured(): boolean {
    const cfg = this.getConfig();
    return Boolean(cfg.accountId && cfg.accessKeyId && cfg.secretAccessKey && cfg.bucketName);
  }

  /**
   * Test kết nối tới Cloudflare R2
   */
  public static async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    const cfg = this.getConfig();
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Chưa điền đủ thông tin Cloudflare R2 (Cần Account ID, Access Key ID, Secret Access Key, Bucket Name).'
      };
    }

    const client = this.getClient();
    if (!client) {
      return { success: false, message: 'Không thể khởi tạo kết nối Cloudflare R2.' };
    }

    try {
      // Ghi thử 1 file test nhỏ để verify quyền ghi (PutObject)
      const testKey = `test_connection_${Date.now()}.txt`;
      const testContent = Buffer.from(`PandaLex Express R2 Connection Verified at ${new Date().toISOString()}`);

      await client.send(new PutObjectCommand({
        Bucket: cfg.bucketName,
        Key: testKey,
        Body: testContent,
        ContentType: 'text/plain'
      }));

      return {
        success: true,
        message: `🎉 Kết nối Cloudflare R2 thành công tới Bucket "${cfg.bucketName}"!`,
        details: {
          bucket: cfg.bucketName,
          accountId: cfg.accountId.slice(0, 6) + '...' + cfg.accountId.slice(-4),
          publicDomain: cfg.publicDomain || 'Sử dụng Gateway PandaLex'
        }
      };
    } catch (err: any) {
      console.error('[R2Storage] Test connection error:', err);
      let hint = '';
      if (err.name === 'AccessDenied' || err.message?.includes('Access Denied')) {
        hint = ` (Vui lòng kiểm tra: 1) Bạn đã tạo Bucket tên là "${cfg.bucketName}" trên Cloudflare R2 chưa? 2) Khi tạo API Token, quyền truy cập có bao gồm Bucket "${cfg.bucketName}" không?)`;
      }
      return {
        success: false,
        message: `Lỗi kết nối R2: ${err.message || 'Không thể xác thực với Cloudflare R2'}${hint}`
      };
    }
  }

  /**
   * Tải Buffer (ảnh chụp từ điện thoại) lên Cloudflare R2 (hoặc local fallback nếu chưa config)
   */
  public static async uploadBuffer(
    buffer: Buffer,
    key: string,
    mimeType: string = 'image/webp'
  ): Promise<UploadResult> {
    const client = this.getClient();
    const cfg = this.getConfig();

    // 1. NẾU CLOUDFLARE R2 ĐÃ ĐƯỢC CẤU HÌNH -> ĐẨY THẲNG LÊN R2 (WEB 0 MB)
    if (client && this.isConfigured()) {
      try {
        const cleanKey = key.replace(/^\/+/, '');
        await client.send(new PutObjectCommand({
          Bucket: cfg.bucketName,
          Key: cleanKey,
          Body: buffer,
          ContentType: mimeType,
          Metadata: {
            'uploader': 'pandalex-mobile-inbound',
            'uploaded-at': new Date().toISOString()
          }
        }));

        let publicUrl = '';
        if (cfg.publicDomain) {
          const base = cfg.publicDomain.replace(/\/$/, '');
          publicUrl = `${base}/${cleanKey}`;
        } else {
          // Dùng endpoint proxy nội bộ của server PandaLex để đọc trực tiếp từ R2
          publicUrl = `/api/storage/file/${encodeURIComponent(cleanKey)}`;
        }

        return {
          success: true,
          url: publicUrl,
          key: cleanKey,
          storageProvider: 'CLOUDFLARE_R2',
          fileSizeBytes: buffer.length,
          mimeType
        };
      } catch (r2Err: any) {
        console.error('[R2Storage] Upload lên R2 thất bại, chuyển sang local fallback:', r2Err);
      }
    }

    // 2. FALLBACK LƯU TẠM LOCAL ĐỂ KHÔNG BAO GIỜ BỊ GIÁN ĐOẠN KHÂU NHẬP HÀNG
    try {
      const cleanKey = key.replace(/[^a-zA-Z0-9._-]/g, '_');
      const localFilePath = path.join(this.localFallbackDir, cleanKey);
      fs.writeFileSync(localFilePath, buffer);

      return {
        success: true,
        url: `/uploads/inbound_photos/${cleanKey}`,
        key: cleanKey,
        storageProvider: 'LOCAL_FALLBACK',
        fileSizeBytes: buffer.length,
        mimeType
      };
    } catch (localErr: any) {
      console.error('[R2Storage] Lưu local fallback cũng lỗi:', localErr);
      return {
        success: false,
        url: '',
        key,
        storageProvider: 'LOCAL_FALLBACK',
        fileSizeBytes: buffer.length,
        mimeType,
        error: localErr.message
      };
    }
  }

  /**
   * Chuyển đổi chuỗi Base64 DataURL thành Buffer
   */
  public static parseDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string; ext: string } {
    const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const ext = mimeType.split('/')[1] || 'webp';
      return { buffer, mimeType, ext };
    }

    // Nếu chỉ là base64 thuần
    const buffer = Buffer.from(dataUrl, 'base64');
    return { buffer, mimeType: 'image/webp', ext: 'webp' };
  }

  /**
   * Đọc file từ R2 (dùng cho API proxy xem ảnh khi bucket để Private)
   */
  public static async getObjectStream(key: string) {
    const client = this.getClient();
    const cfg = this.getConfig();
    if (!client || !this.isConfigured()) return null;

    try {
      const res = await client.send(new GetObjectCommand({
        Bucket: cfg.bucketName,
        Key: key
      }));
      return res;
    } catch (e) {
      return null;
    }
  }
}
