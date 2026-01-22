import chromium from '@sparticuz/chromium';
export default async function handler(req, res) {
  try {
    const executablePath = await chromium.executablePath();
    return res.status(200).json({
      status: 'healthy',
      chromium: executablePath ? 'available' : 'unavailable',
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      uptime: Math.round(process.uptime())
    });
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
}
