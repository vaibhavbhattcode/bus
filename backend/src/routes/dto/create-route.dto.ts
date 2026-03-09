import { IsString, IsNotEmpty, IsDateString, IsNumber, IsArray, IsOptional, Min, Max, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRouteDto {
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @IsString()
  @IsNotEmpty()
  fromCity: string;

  @IsString()
  @IsNotEmpty()
  toCity: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, { message: 'Departure time must be in HH:mm format' })
  departureTime: string;

  @IsDateString()
  @IsOptional()
  arrivalDate?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, { message: 'Arrival time must be in HH:mm format' })
  arrivalTime: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100000)
  price: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  intermediateStops?: string[];

  @IsNumber()
  @IsOptional()
  @Min(1)
  distanceKm?: number;
}
