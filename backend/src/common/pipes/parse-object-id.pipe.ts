import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string> {
  transform(value: string): string {
    if (!OBJECT_ID_REGEX.test(value)) {
      throw new BadRequestException(`Invalid ID format: "${value}"`);
    }
    return value;
  }
}
