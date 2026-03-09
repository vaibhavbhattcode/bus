import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateBookingStatusDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  paymentStatus?: string;
}
