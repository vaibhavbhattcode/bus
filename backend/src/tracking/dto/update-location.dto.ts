import { IsString, IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

export class UpdateLocationDto {
  @IsUUID()
  @IsNotEmpty()
  routeId: string;

  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @IsNumber()
  @IsNotEmpty()
  speed?: number;

  @IsNumber()
  @IsNotEmpty()
  heading?: number;
}
