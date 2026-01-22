import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const isValidUrl = string => {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'method not allowed',
      message: 'only get requests are supported'
    });
  }
  const {
    url,
    delay = '2',
    width = '1920',
    height = '1080',
    fullPage = 'false',
    type = 'png',
    quality = '80'
  } = req.query;
  if (!url) {
    return res.status(400).json({ 
      error: 'missing url',
      message: 'url parameter is required'
    });
  }
  if (!isValidUrl(url)) {
    return res.status(400).json({ 
      error: 'invalid url',
      message: 'url must start with http or https'
    });
  }
  const delayMs = Math.max(500, Math.min(8000, parseInt(delay) * 1000 || 2000));
  const viewportWidth = Math.max(320, Math.min(3840, parseInt(width) || 1920));
  const viewportHeight = Math.max(240, Math.min(2160, parseInt(height) || 1080));
  const isFullPage = fullPage === 'true' || fullPage === '1';
  const imageType = ['png', 'jpeg', 'webp'].includes(type) ? type : 'png';
  const imageQuality = imageType === 'png' ? undefined : Math.max(0, Math.min(100, parseInt(quality) || 80));
  let browser = null;
  const maxExecutionTime = 27000;
  const startTime = Date.now();
  try {
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
      protocolTimeout: 10000
    });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => {
      const resourceType = request.resourceType();
      if (['font', 'media', 'stylesheet', 'image'].includes(resourceType) && 
          !request.url().includes(new URL(url).hostname)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    await page.setViewport({
      width: viewportWidth,
      height: viewportHeight
    });
    const navigationTimeout = Math.min(15000, maxExecutionTime - (Date.now() - startTime) - 5000);
    if (navigationTimeout < 5000) {
      throw new Error('insufficient time remaining');
    }
    await Promise.race([
      page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: navigationTimeout
      }),
      sleep(navigationTimeout).then(() => {
        throw new Error('navigation timeout');
      })
    ]);
    const timeRemaining = maxExecutionTime - (Date.now() - startTime);
    const safeDelay = Math.min(delayMs, timeRemaining - 3000);
    if (safeDelay > 0) {
      await sleep(safeDelay);
    }
    if ((Date.now() - startTime) > maxExecutionTime - 2000) {
      throw new Error('approaching timeout limit');
    }
    const screenshotOptions = {
      type: imageType,
      fullPage: isFullPage,
      captureBeyondViewport: false,
      optimizeForSpeed: true
    };
    if (imageQuality !== undefined) {
      screenshotOptions.quality = imageQuality;
    }
    const buffer = await Promise.race([
      page.screenshot(screenshotOptions),
      sleep(3000).then(() => {
        throw new Error('screenshot timeout');
      })
    ]);
    if (!buffer || buffer.length === 0) {
      throw new Error('empty screenshot');
    }
    await browser.close();
    browser = null;
    const contentType = imageType === 'jpeg' ? 'image/jpeg' : 
                       imageType === 'webp' ? 'image/webp' : 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('X-Execution-Time', Date.now() - startTime);
    return res.status(200).end(buffer);
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    let statusCode = 500;
    let errorType = 'unknown';
    let errorMessage = 'screenshot failed';
    const errMsg = error.message.toLowerCase();
    if (errMsg.includes('timeout') || errMsg.includes('time')) {
      statusCode = 504;
      errorType = 'timeout';
      errorMessage = 'site too slow try simpler page or lower delay';
    } else if (errMsg.includes('err_name_not_resolved')) {
      statusCode = 400;
      errorType = 'dns error';
      errorMessage = 'domain not found';
    } else if (errMsg.includes('err_connection_refused')) {
      statusCode = 400;
      errorType = 'connection refused';
      errorMessage = 'site refused connection';
    } else if (errMsg.includes('navigation') || errMsg.includes('net::')) {
      statusCode = 400;
      errorType = 'navigation failed';
      errorMessage = 'cannot load page';
    }
    return res.status(statusCode).json({
      error: errorType,
      message: errorMessage,
      executionTime: Date.now() - startTime
    });
  }
}
