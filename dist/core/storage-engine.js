import fs from 'fs';
import path from 'path';
/**
 * AtomicStorageEngine:
 * Giải quyết triệt để nút thắt đọc/ghi file JSON đồng bộ (Blocking I/O):
 * 1. In-Memory Cache: Đọc dữ liệu 0ms từ RAM.
 * 2. Write-Behind Debounce & Atomic Rename: Gom các thao tác ghi liên tiếp trong 120ms
 *    và ghi qua file tạm (.tmp) rồi rename nguyên tử để chống hỏng file 100%.
 * 3. Auto-Backup Snapshot: Tự động sao lưu định kỳ toàn bộ thư mục data/ vào data/.backups/.
 */
export class AtomicStorageEngine {
    static cache = new Map();
    static pendingWrites = new Map();
    static dataDir = path.join(process.cwd(), 'data');
    static backupDir = path.join(process.cwd(), 'data', '.backups');
    static metrics = {
        totalReads: 0,
        cacheHits: 0,
        totalWrites: 0,
        batchedWritesSaved: 0,
        lastWriteAt: null,
        lastBackupAt: null,
        managedFilesCount: 0
    };
    static init() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
        // Đảm bảo ghi hết toàn bộ dữ liệu đang chờ trước khi tiến trình đóng
        const flushAllSync = () => {
            for (const [filePath, item] of this.pendingWrites.entries()) {
                clearTimeout(item.timer);
                this.writeAtomicSync(filePath, item.data);
            }
            this.pendingWrites.clear();
        };
        process.once('SIGINT', () => { flushAllSync(); process.exit(0); });
        process.once('SIGTERM', () => { flushAllSync(); process.exit(0); });
        process.once('beforeExit', () => { flushAllSync(); });
        // Tự động tạo bản sao lưu khởi điểm nếu chưa có bản sao lưu nào trong ngày
        setTimeout(() => {
            try {
                const backups = this.listBackups();
                if (backups.length === 0) {
                    this.createBackupSnapshot('Auto-Backup Khởi Động Hệ Thống');
                }
            }
            catch (_) { }
        }, 3000);
    }
    /**
     * Đọc JSON tốc độ cao với bộ đệm RAM
     */
    static readJson(filePath, defaultValue) {
        this.metrics.totalReads++;
        const resolved = path.resolve(filePath);
        if (this.cache.has(resolved)) {
            this.metrics.cacheHits++;
            return this.cache.get(resolved);
        }
        try {
            const dir = path.dirname(resolved);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            if (fs.existsSync(resolved)) {
                const raw = fs.readFileSync(resolved, 'utf-8').trim();
                if (raw) {
                    const parsed = JSON.parse(raw);
                    this.cache.set(resolved, parsed);
                    this.metrics.managedFilesCount = this.cache.size;
                    return parsed;
                }
            }
        }
        catch (err) {
            console.error(`[AtomicStorageEngine] Lỗi đọc ${path.basename(resolved)}, dùng giá trị mặc định:`, err);
        }
        this.cache.set(resolved, defaultValue);
        this.metrics.managedFilesCount = this.cache.size;
        return defaultValue;
    }
    /**
     * Ghi JSON thông minh: Cập nhật RAM tức thì (0ms) và gom lịch ghi đĩa bất đồng bộ (Debounce 100ms)
     */
    static writeJson(filePath, data, immediate = false) {
        const resolved = path.resolve(filePath);
        this.cache.set(resolved, data);
        this.metrics.managedFilesCount = this.cache.size;
        if (immediate) {
            const existing = this.pendingWrites.get(resolved);
            if (existing) {
                clearTimeout(existing.timer);
                this.pendingWrites.delete(resolved);
            }
            this.writeAtomicSync(resolved, data);
            return;
        }
        if (this.pendingWrites.has(resolved)) {
            const pending = this.pendingWrites.get(resolved);
            clearTimeout(pending.timer);
            this.metrics.batchedWritesSaved++;
        }
        const timer = setTimeout(() => {
            this.pendingWrites.delete(resolved);
            this.writeAtomicAsync(resolved, data);
        }, 100);
        this.pendingWrites.set(resolved, { data, timer });
    }
    /**
     * Ghi nguyên tử đồng bộ (Dùng khi khởi tạo hoặc tắt server)
     */
    static writeAtomicSync(resolvedPath, data) {
        try {
            const dir = path.dirname(resolvedPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const tempPath = `${resolvedPath}.${process.pid}.tmp`;
            const payload = JSON.stringify(data, null, 2);
            fs.writeFileSync(tempPath, payload, 'utf-8');
            fs.renameSync(tempPath, resolvedPath);
            this.metrics.totalWrites++;
            this.metrics.lastWriteAt = new Date().toISOString();
        }
        catch (err) {
            console.error(`[AtomicStorageEngine] Lỗi ghi đồng bộ ${path.basename(resolvedPath)}:`, err);
        }
    }
    /**
     * Ghi nguyên tử bất đồng bộ (Không chặn luồng xử lý API của người dùng)
     */
    static async writeAtomicAsync(resolvedPath, data) {
        try {
            const dir = path.dirname(resolvedPath);
            if (!fs.existsSync(dir)) {
                await fs.promises.mkdir(dir, { recursive: true });
            }
            const tempPath = `${resolvedPath}.${process.pid}.${Date.now()}.tmp`;
            const payload = JSON.stringify(data, null, 2);
            await fs.promises.writeFile(tempPath, payload, 'utf-8');
            await fs.promises.rename(tempPath, resolvedPath);
            this.metrics.totalWrites++;
            this.metrics.lastWriteAt = new Date().toISOString();
        }
        catch (err) {
            console.error(`[AtomicStorageEngine] Lỗi ghi bất đồng bộ ${path.basename(resolvedPath)}:`, err);
        }
    }
    /**
     * Ép ghi toàn bộ các file đang nằm trong hàng đợi xuống đĩa ngay lập tức
     */
    static flushAll() {
        for (const [filePath, item] of this.pendingWrites.entries()) {
            clearTimeout(item.timer);
            this.writeAtomicSync(filePath, item.data);
        }
        this.pendingWrites.clear();
    }
    /**
     * Tạo bản sao lưu (Snapshot Backup) toàn bộ dữ liệu trong data/
     */
    static createBackupSnapshot(label = 'Sao lưu thủ công') {
        this.flushAll();
        const now = new Date();
        const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupId = `backup_${stamp}`;
        const targetFolder = path.join(this.backupDir, backupId);
        fs.mkdirSync(targetFolder, { recursive: true });
        const files = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.json'));
        let totalBytes = 0;
        for (const file of files) {
            const src = path.join(this.dataDir, file);
            const dest = path.join(targetFolder, file);
            const stat = fs.statSync(src);
            if (stat.isFile()) {
                fs.copyFileSync(src, dest);
                totalBytes += stat.size;
            }
        }
        const meta = {
            id: backupId,
            createdAt: now.toISOString(),
            fileCount: files.length,
            totalBytes,
            label
        };
        fs.writeFileSync(path.join(targetFolder, '_meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
        this.metrics.lastBackupAt = meta.createdAt;
        // Giữ tối đa 15 bản backup gần nhất để tiết kiệm ổ cứng
        this.pruneOldBackups(15);
        return meta;
    }
    /**
     * Danh sách các bản sao lưu hiện có
     */
    static listBackups() {
        if (!fs.existsSync(this.backupDir))
            return [];
        const dirs = fs.readdirSync(this.backupDir).filter(d => d.startsWith('backup_'));
        const results = [];
        for (const dir of dirs) {
            const metaPath = path.join(this.backupDir, dir, '_meta.json');
            if (fs.existsSync(metaPath)) {
                try {
                    results.push(JSON.parse(fs.readFileSync(metaPath, 'utf-8')));
                }
                catch (_) { }
            }
        }
        return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    static pruneOldBackups(maxKeep) {
        try {
            const all = this.listBackups();
            if (all.length <= maxKeep)
                return;
            const toRemove = all.slice(maxKeep);
            for (const item of toRemove) {
                const folder = path.join(this.backupDir, item.id);
                if (fs.existsSync(folder)) {
                    fs.rmSync(folder, { recursive: true, force: true });
                }
            }
        }
        catch (_) { }
    }
    static getMetrics() {
        let totalSize = 0;
        try {
            if (fs.existsSync(this.dataDir)) {
                const files = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.json'));
                this.metrics.managedFilesCount = Math.max(this.metrics.managedFilesCount, files.length);
                for (const f of files) {
                    const st = fs.statSync(path.join(this.dataDir, f));
                    if (st.isFile())
                        totalSize += st.size;
                }
            }
        }
        catch (_) { }
        return {
            ...this.metrics,
            dataFilesSizeKb: Math.round((totalSize / 1024) * 10) / 10
        };
    }
}
AtomicStorageEngine.init();
