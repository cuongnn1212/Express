// loader.cjs - Wrapper CommonJS tương thích 100% với Phusion Passenger trên cPanel / CloudLinux
(async () => {
  try {
    await import('./dist/server.js');
  } catch (err) {
    console.error('Lỗi khởi động Node.js qua loader.cjs:', err);
  }
})();
