import {
    IsNotEmpty,
    IsString,
    IsIn,
    IsNumber,
    MinLength,
    MaxLength,
    ArrayNotEmpty,
    IsArray,
    IsObject,
    IsOptional,
    IsAlphanumeric,
    IsInt, ArrayMaxSize, ValidateNested,
    ArrayMinSize, ValidateIf, Length
} from 'class-validator';

export class CreateChannelDto {
    @IsAlphanumeric()
    @Length(3, 12)
    name: string;

    @IsIn(['PUBLIC', 'PRIVATE', 'PROTECTED'])
    type: string;

    @ValidateIf(c => c.type === 'PROTECTED')
    @Length(4, 12)
    password: string;

    @IsArray()
    @IsInt({ each: true })
    @ValidateIf(c => c.type === 'PRIVATE')
    @ArrayNotEmpty()
    @ValidateIf(c => c.type === 'PUBLIC' || c.type === 'PROTECTED')
    @ArrayMinSize(0)
    invited: number[];
}

export class JoinChannelDto {
    @IsNumber()
    id: number;

    @IsIn(['PUBLIC', 'PRIVATE', 'PROTECTED'])
    type: string;

    @ValidateIf(c => c.type === 'PROTECTED')
    @Length(4, 12)
    password: string;
}

export class ChangeNameDto {
    @IsAlphanumeric()
    @Length(3, 12)
    name: string;
}

export class ChangePasswordDto {
    @Length(4, 12)
    password: string;
}

export class MuteDto {
    @IsNumber()
    userId: number;

    @IsNumber()
    minutes: number;
}

export class IdDto {
    @IsNumber()
    userId: number;
}