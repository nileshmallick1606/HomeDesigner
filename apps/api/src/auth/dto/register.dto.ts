import { IsEmail, IsString, MinLength, MaxLength, IsEnum, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum ProfileType {
  HOMEOWNER = 'HOMEOWNER',
  ARCHITECT_INDIVIDUAL = 'ARCHITECT_INDIVIDUAL',
  ARCHITECT_ORG = 'ARCHITECT_ORG',
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass1' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and a number',
  })
  password!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: ProfileType, default: ProfileType.HOMEOWNER })
  @IsEnum(ProfileType)
  profileType: ProfileType = ProfileType.HOMEOWNER;
}
