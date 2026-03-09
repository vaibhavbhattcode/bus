import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { AlertType } from 'prisma-client-custom';

export class CreateAlertDto {
  @IsString()
  @IsNotEmpty()
  fromCity: string;

  @IsString()
  @IsNotEmpty()
  toCity: string;

  @IsNumber()
  @IsOptional()
  targetPrice?: number;

  @IsNumber()
  @IsOptional()
  maxPrice?: number;

  @IsEnum(AlertType)
  @IsOptional()
  alertType?: AlertType;
}
