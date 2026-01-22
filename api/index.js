export default async function handler(req, res) {
  const baseUrl = `https://${req.headers.host}`;
  return res.status(200).json({
    name: 'septumspi',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      screenshot: `${baseUrl}/api/screenshot`,
      health: `${baseUrl}/api/health`
    },
    documentation: 'https://github.com/alqsdeuss/septum',
    example: `${baseUrl}/api/screenshot?url=https://example.com&delay=3`,
    parameters: {
      url: 'required target url',
      delay: 'optional wait time in seconds default 3',
      width: 'optional viewport width default 1920',
      height: 'optional viewport height default 1080',
      fullPage: 'optional capture full page default true',
      type: 'optional image format png jpeg webp default png',
      quality: 'optional jpeg webp quality default 90'
    }
  });
}
