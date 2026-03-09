import { IsString, IsNotEmpty, IsEnum, IsNumber, IsBoolean, IsOptional, IsArray, Min, MaxLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleType } from 'prisma-client-custom';

export class CreateVehicleDto {
  @IsEnum(VehicleType)
  @IsNotEmpty()
  type: VehicleType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9 -]{5,20}$/i, { message: 'Registration number must be valid' })
  registrationNumber: string;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  @Min(1)
  totalSeats: number;

  @IsString()
  @IsOptional()
  seatLayout?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
