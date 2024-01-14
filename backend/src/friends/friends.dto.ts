import { IsAlphanumeric, IsNumber, Length } from 'class-validator';

export class FriendDto {
    @IsNumber()
    id: number;
}

export class ChangeUsernameDto {
    @IsAlphanumeric()
    @Length(3, 12)
    username: string;
}