import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';

export class ApplyPromoCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @Min(0)
  bookingAmount: number;

  @IsString()
  @IsOptional()
  routeId?: string;
}
