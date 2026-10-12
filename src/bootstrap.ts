/**
 * Bootstrap: đặt thư mục làm việc (cwd) về thư mục gốc dự án.
 * Phải được import ĐẦU TIÊN trong server.ts, để mọi service dùng process.cwd()
 * (data/, uploads/, public/) đều trỏ đúng thư mục dù host khởi chạy từ đâu.
 */
import path from 'path';
import { fileURLToPath } from 'url';

// File này sau khi build nằm ở dist/bootstrap.js → thư mục gốc là cấp cha
export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  process.chdir(ROOT_DIR);
} catch (err) {
  console.error('⚠️ Không thể chuyển thư mục làm việc về', ROOT_DIR, err);
}
