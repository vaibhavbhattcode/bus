import { IsString, IsOptional, IsDateString, IsNumber, Min, IsArray, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum SortBy {
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  DURATION_ASC = 'duration_asc',
  DEPARTURE_ASC = 'departure_asc',
  DEPARTURE_DESC = 'departure_desc',
}

export class SearchRoutesDto {
  @IsString()
  @IsOptional()
  fromCity?: string;

  @IsString()
  @IsOptional()
  toCity?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  seats?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsString()
  busType?: string; // Comma separated 'AC', 'Sleeper', etc.

  @IsOptional()
  @IsString()
  amenities?: string; // Comma separated

  @IsOptional()
  @IsString()
  operatorId?: string;

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;
}
