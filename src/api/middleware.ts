import { Request, Response, NextFunction } from 'express';
import config from '../config/config.js';

/**
 * API 认证中间件
 * 如果设置了 API_KEY，则需要在请求头中携带
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 如果没有配置 API_KEY，跳过认证
  if (!config.apiKey) {
    next();
    return;
  }

  // 健康检查端点不需要认证
  if (req.path === '/api/health') {
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (apiKey !== config.apiKey) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized. Provide a valid API key via X-API-Key header or apiKey query parameter.',
    });
    return;
  }

  next();
}

/**
 * 请求日志中间件
 */
export function logMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
}
