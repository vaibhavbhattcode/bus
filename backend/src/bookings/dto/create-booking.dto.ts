import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEmail, IsArray, IsBoolean, Min, Matches, MaxLength } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  routeId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  seats: number;

  @IsArray()
  @IsOptional()
  seatNumbers?: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  passengerName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Please provide a valid phone number in international format' })
  passengerPhone: string;

  @IsEmail()
  @IsOptional()
  passengerEmail?: string;

  @IsString()
  @IsOptional()
  pickupLocation?: string;

  @IsString()
  @IsOptional()
  dropLocation?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsOptional()
  passengerAge?: string | number;

  @IsString()
  @IsOptional()
  passengerGender?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @IsString()
  @IsOptional()
  promoCodeId?: string;

  @IsBoolean()
  @IsOptional()
  hasInsurance?: boolean;
}
