import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsDateString, Min, IsArray } from 'class-validator';
import { PromoCodeType, PromoCodeStatus } from 'prisma-client-custom';

export class CreatePromoCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PromoCodeType)
  type: PromoCodeType;

  @IsNumber()
  @Min(0)
  value: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minAmount?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxUses?: number;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validUntil: string;

  @IsEnum(PromoCodeStatus)
  @IsOptional()
  status?: PromoCodeStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  applicableRoutes?: string[];
}
