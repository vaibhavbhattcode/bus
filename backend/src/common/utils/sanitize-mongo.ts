import { BadRequestException } from '@nestjs/common';

/**
 * MongoDB Injection Prevention Utility
 * 
 * Sanitizes user input to prevent MongoDB operator injection attacks
 * Rejects keys starting with $ or containing . (dot notation)
 */

/**
 * Check if a value is a plain object (not array, not null, not Date, etc.)
 */
function isPlainObject(value: any): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof RegExp)
  );
}

/**
 * Check if a key is potentially dangerous for MongoDB
 * @param key Object key to check
 * @returns true if key is dangerous
 */
function isDangerousKey(key: string): boolean {
  // Reject keys starting with $ (MongoDB operators)
  if (key.startsWith('$')) {
    return true;
  }
  
  // Reject keys containing . (dot notation for nested fields)
  if (key.includes('.')) {
    return true;
  }
  
  return false;
}

/**
 * Sanitize MongoDB input recursively
 * Throws BadRequestException if dangerous keys are found
 * 
 * @param obj Input object to sanitize
 * @param path Current path (for error messages)
 * @returns Sanitized object
 * 
 * @example
 * // Safe input
 * sanitizeMongoInput({ name: 'John', age: 30 }) // ✓ Returns same object
 * 
 * // Dangerous input
 * sanitizeMongoInput({ $where: 'malicious code' }) // ✗ Throws BadRequestException
 * sanitizeMongoInput({ 'user.password': 'hack' }) // ✗ Throws BadRequestException
 */
export function sanitizeMongoInput<T = any>(obj: T, path: string = 'input'): T {
  if (!isPlainObject(obj)) {
    return obj; // Primitive values are safe
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj as any)) {
    // Check for dangerous keys
    if (isDangerousKey(key)) {
      throw new BadRequestException(
        `Invalid input: Key "${key}" at ${path} is not allowed (MongoDB injection prevention)`
      );
    }

    // Recursively sanitize nested objects
    if (isPlainObject(value)) {
      sanitized[key] = sanitizeMongoInput(value, `${path}.${key}`);
    } else if (Array.isArray(value)) {
      // Sanitize array elements
      sanitized[key] = value.map((item, index) =>
        isPlainObject(item)
          ? sanitizeMongoInput(item, `${path}.${key}[${index}]`)
          : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Sanitize MongoDB query parameters from request
 * Use this in controllers before passing to services
 * 
 * @param query Query object from request
 * @returns Sanitized query object
 * 
 * @example
 * @Get('search')
 * async search(@Query() query: any) {
 *   const safeQuery = sanitizeMongoQuery(query);
 *   return this.service.search(safeQuery);
 * }
 */
export function sanitizeMongoQuery<T = any>(query: T): T {
  return sanitizeMongoInput(query, 'query');
}

/**
 * Sanitize MongoDB body parameters from request
 * Use this in controllers before passing to services
 * 
 * @param body Body object from request
 * @returns Sanitized body object
 * 
 * @example
 * @Post('create')
 * async create(@Body() body: any) {
 *   const safeBody = sanitizeMongoBody(body);
 *   return this.service.create(safeBody);
 * }
 */
export function sanitizeMongoBody<T = any>(body: T): T {
  return sanitizeMongoInput(body, 'body');
}

/**
 * Create a sanitization pipe for use with NestJS
 * Can be applied globally or per-route
 * 
 * @example
 * // Global application
 * app.useGlobalPipes(new MongoSanitizationPipe());
 * 
 * // Per-route
 * @Post('create')
 * @UsePipes(new MongoSanitizationPipe())
 * async create(@Body() body: CreateDto) { ... }
 */
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class MongoSanitizationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // Only sanitize body and query parameters
    if (metadata.type === 'body' || metadata.type === 'query') {
      return sanitizeMongoInput(value, metadata.type);
    }
    return value;
  }
}
